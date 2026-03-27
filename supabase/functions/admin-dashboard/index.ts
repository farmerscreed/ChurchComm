import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user using the anon client with their JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role via organization_members
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: membership, error: memberError } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError || !membership || membership.role !== "admin") {
      console.error("Admin check failed:", {
        memberError: memberError?.message,
        membership,
        userId: user.id,
        role: membership?.role,
      });
      return new Response(
        JSON.stringify({
          error: "Forbidden: admin role required",
          debug: {
            hasError: !!memberError,
            errorMsg: memberError?.message || null,
            hasMembership: !!membership,
            role: membership?.role || null,
          },
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { action } = body;

    // ── SUMMARY ─────────────────────────────────────────────────────────
    if (action === "summary") {
      // Total leads
      const { count: totalLeads } = await adminClient
        .from("kf_leads")
        .select("id", { count: "exact", head: true });

      // Leads this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: leadsThisWeek } = await adminClient
        .from("kf_leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      // Demo calls
      const { count: demoCalls } = await adminClient
        .from("demo_call_logs")
        .select("id", { count: "exact", head: true });

      // Active customers (orgs with non-empty plan_modules)
      const { data: orgs } = await adminClient
        .from("organizations")
        .select("id, plan_modules");
      const activeCustomers = (orgs || []).filter(
        (o: any) => o.plan_modules && Array.isArray(o.plan_modules) && o.plan_modules.length > 0
      ).length;

      // Conversion rate
      const { count: convertedCount } = await adminClient
        .from("kf_leads")
        .select("id", { count: "exact", head: true })
        .eq("converted_to_signup", true);

      const total = totalLeads || 0;
      const converted = convertedCount || 0;
      const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

      return new Response(
        JSON.stringify({
          summary: {
            totalLeads: total,
            leadsThisWeek: leadsThisWeek || 0,
            demoCalls: demoCalls || 0,
            activeCustomers,
            conversionRate,
            convertedCount: converted,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── LEADS ───────────────────────────────────────────────────────────
    if (action === "leads") {
      const limit = body.limit || 100;
      const offset = body.offset || 0;

      const { data: leads, error: leadsError } = await adminClient
        .from("kf_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (leadsError) throw leadsError;

      return new Response(
        JSON.stringify({ leads: leads || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CUSTOMERS ───────────────────────────────────────────────────────
    if (action === "customers") {
      const { data: customers, error: custError } = await adminClient
        .from("organizations")
        .select(
          "id, name, subscription_plan, subscription_status, trial_ends_at, member_count, minutes_used, minutes_included, plan_modules, created_at"
        )
        .order("created_at", { ascending: false });

      if (custError) throw custError;

      return new Response(
        JSON.stringify({ customers: customers || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CALLS ───────────────────────────────────────────────────────────
    if (action === "calls") {
      const limit = body.limit || 100;

      const { data: calls, error: callsError } = await adminClient
        .from("demo_call_logs")
        .select("*, kf_leads(first_name, church_name)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (callsError) throw callsError;

      // Flatten the joined data
      const formatted = (calls || []).map((c: any) => ({
        id: c.id,
        lead_id: c.lead_id,
        lead_name: c.kf_leads?.first_name || c.first_name || null,
        phone_number: c.phone_number,
        church_name: c.kf_leads?.church_name || c.church_name || null,
        call_status: c.status,
        call_duration: c.duration_seconds,
        vapi_call_id: c.vapi_call_id,
        created_at: c.created_at,
      }));

      return new Response(
        JSON.stringify({ calls: formatted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── UPDATE LEAD STATUS ──────────────────────────────────────────────
    if (action === "update_lead_status") {
      const { lead_id, status } = body;
      if (!lead_id || !status) {
        return new Response(
          JSON.stringify({ error: "lead_id and status are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validStatuses = ["new", "contacted", "nurturing", "converted"];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: any = { status };
      if (status === "converted") {
        updateData.converted_to_signup = true;
      }

      const { error: updateError } = await adminClient
        .from("kf_leads")
        .update(updateData)
        .eq("id", lead_id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── UNKNOWN ACTION ──────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("admin-dashboard error:", err?.message, err?.details, err?.hint, err);
    return new Response(
      JSON.stringify({
        error: err.message || "Internal server error",
        details: err?.details || null,
        hint: err?.hint || null,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
