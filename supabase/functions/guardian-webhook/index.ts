import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GUARDIAN_WEBHOOK_SECRET = Deno.env.get("GUARDIAN_WEBHOOK_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Validate shared secret ──────────────────────────────────────────────

  const secret = req.headers.get("x-webhook-secret");
  if (!GUARDIAN_WEBHOOK_SECRET || secret !== GUARDIAN_WEBHOOK_SECRET) {
    console.error("guardian-webhook: invalid or missing webhook secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Parse payload ───────────────────────────────────────────────────────

  let payload: {
    account_id: string;
    event_type: string;
    severity: "info" | "warning" | "critical";
    detail?: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!payload.account_id || !payload.event_type) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: account_id, event_type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log("guardian-webhook received:", {
    account_id: payload.account_id,
    event_type: payload.event_type,
    severity: payload.severity,
  });

  // ── Store event in Supabase ─────────────────────────────────────────────

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Look up the organization by their Google Ad Grant account ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("google_ad_grant_account_id", payload.account_id)
    .maybeSingle();

  // Insert the compliance event into grant_compliance_events (existing table)
  const { error: insertError } = await supabase
    .from("grant_compliance_events")
    .insert({
      org_id: org?.id ?? null,
      event_type: payload.event_type,
      severity: payload.severity ?? "info",
      message: payload.detail ?? null,
      raw_payload: payload.metadata ?? null,
      is_read: false,
    });

  if (insertError) {
    console.error("guardian-webhook: failed to insert event:", insertError);
    return new Response(
      JSON.stringify({ error: "Failed to store event", detail: insertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Send notification for critical events ───────────────────────────────

  const CRITICAL_EVENTS = ["account_suspended", "account_at_risk", "ctr_below_threshold"];
  const isCritical = payload.severity === "critical" || CRITICAL_EVENTS.includes(payload.event_type);

  if (isCritical && org?.id) {
    try {
      // Find admin users for this organization to notify
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", org.id)
        .in("role", ["admin", "owner"]);

      if (members && members.length > 0) {
        // Insert notification records for each admin
        const notifications = members.map((m) => ({
          user_id: m.user_id,
          organization_id: org.id,
          title: `Ad Grant Alert: ${payload.event_type.replace(/_/g, " ")}`,
          body: payload.detail ?? `A critical compliance event was detected for account ${payload.account_id}.`,
          type: "guardian_alert",
          severity: payload.severity ?? "critical",
          read: false,
        }));

        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notifError) {
          // Log but don't fail the webhook — the event was already stored
          console.error("guardian-webhook: failed to create notifications:", notifError);
        } else {
          console.log(`guardian-webhook: sent ${notifications.length} notification(s) for critical event`);
        }
      }
    } catch (err) {
      console.error("guardian-webhook: notification error:", err);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, critical: isCritical }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
