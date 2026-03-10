import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPlanFeatures } from "../_shared/planFeatures.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * process-event-trigger: Handles event-based automations (group_join, group_leave, first_visit).
 *
 * Called by DB triggers via pg_net when:
 *   - A person is added to a group (group_join)
 *   - A person is removed from a group (group_leave)
 *   - A person's first_visit_date is set (first_visit)
 *
 * Body: { event_type, person_id, organization_id, group_id? }
 */

function formatPhone(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/\D/g, "");
  if (!cleaned.startsWith("1") && cleaned.length === 10) {
    cleaned = "1" + cleaned;
  }
  return "+" + cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { event_type, person_id, organization_id, group_id } = body;

    if (!event_type || !person_id || !organization_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event_type, person_id, organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing event: ${event_type} for person ${person_id} in org ${organization_id}`);

    // Plan gate: event triggers require Growth+ plan
    const { data: orgPlanRow } = await supabase
      .from("organizations")
      .select("subscription_plan")
      .eq("id", organization_id)
      .single();
    const eventFeatures = getPlanFeatures(orgPlanRow?.subscription_plan);
    if (!eventFeatures.hasEventTriggers) {
      console.log(`Skipping event trigger for org ${organization_id}: plan '${orgPlanRow?.subscription_plan}' does not include event triggers`);
      return new Response(
        JSON.stringify({ skipped: true, reason: "plan_limit", plan: orgPlanRow?.subscription_plan }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find active automations matching this event type and organization
    const { data: automations, error: autoError } = await supabase
      .from("automations")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("trigger_type", event_type)
      .eq("status", "active");

    if (autoError) {
      throw new Error(`Failed to fetch automations: ${autoError.message}`);
    }

    if (!automations || automations.length === 0) {
      console.log(`No active automations found for ${event_type}`);
      return new Response(
        JSON.stringify({ success: true, message: "No matching automations", executed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the person details
    const { data: person, error: personError } = await supabase
      .from("people")
      .select("id, first_name, last_name, phone_number, email")
      .eq("id", person_id)
      .single();

    if (personError || !person) {
      throw new Error(`Person not found: ${person_id}`);
    }

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    const orgName = org?.name || "your church";
    let executed = 0;

    for (const automation of automations) {
      try {
        // If automation targets specific groups, check if this group matches
        if (automation.target_groups && automation.target_groups.length > 0 && group_id) {
          if (!automation.target_groups.includes(group_id)) {
            console.log(`Automation ${automation.id} doesn't target group ${group_id}, skipping`);
            continue;
          }
        }

        // Check for duplicate execution today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: existingExec } = await supabase
          .from("automation_executions")
          .select("id")
          .eq("automation_id", automation.id)
          .eq("person_id", person_id)
          .gte("executed_at", todayStart.toISOString())
          .maybeSingle();

        if (existingExec) {
          console.log(`Already executed automation ${automation.id} for person ${person_id} today`);
          continue;
        }

        const actionType = automation.action_type;

        if ((actionType === "send_sms" || actionType === "sms") && person.phone_number) {
          // Direct Twilio SMS
          const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
          const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
          const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

          if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
            throw new Error("Twilio credentials not configured");
          }

          const messageTemplate = automation.action_config?.message_template ||
            `Hi {FirstName}, welcome! We're glad you're part of ${orgName}.`;

          const message = messageTemplate
            .replace(/{Name}/gi, person.first_name || "")
            .replace(/{FirstName}/gi, person.first_name || "")
            .replace(/{LastName}/gi, person.last_name || "")
            .replace(/{Church}/gi, orgName)
            .replace(/{ChurchName}/gi, orgName)
            .replace(/{OrganizationName}/gi, orgName);

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

          const response = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            },
            body: new URLSearchParams({
              To: formatPhone(person.phone_number),
              From: twilioPhoneNumber,
              Body: message,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Twilio error: ${response.status}`);
          }

          // Log execution
          await supabase.from("automation_executions").insert({
            automation_id: automation.id,
            organization_id: organization_id,
            person_id: person_id,
            status: "sent",
            message_sent: message,
            executed_at: new Date().toISOString(),
          });

          console.log(`Sent ${event_type} SMS to ${person.first_name} via automation ${automation.id}`);
          executed++;
        } else if ((actionType === "send_call" || actionType === "call") && person.phone_number) {
          // Schedule a call by inserting into call_attempts (picked up by auto-call-trigger)
          const scriptId = automation.action_config?.script_id;

          if (!scriptId) {
            console.log(`Automation ${automation.id} has no script_id for call action, skipping`);
            continue;
          }

          const delayHours = automation.trigger_config?.delay_hours || 0;
          const scheduledAt = new Date();
          scheduledAt.setHours(scheduledAt.getHours() + delayHours);

          await supabase.from("call_attempts").insert({
            organization_id: organization_id,
            person_id: person_id,
            phone_number: person.phone_number,
            script_id: scriptId,
            provider: "vapi",
            status: "scheduled",
            trigger_type: event_type,
            scheduled_at: scheduledAt.toISOString(),
          });

          // Log execution
          await supabase.from("automation_executions").insert({
            automation_id: automation.id,
            organization_id: organization_id,
            person_id: person_id,
            status: "sent",
            message_sent: `Call scheduled with script ${scriptId}`,
            executed_at: new Date().toISOString(),
          });

          console.log(`Scheduled ${event_type} call for ${person.first_name} via automation ${automation.id}`);
          executed++;
        }

        // Update automation stats
        await supabase
          .from("automations")
          .update({
            total_executions: (automation.total_executions || 0) + 1,
            last_executed_at: new Date().toISOString(),
          })
          .eq("id", automation.id);
      } catch (err) {
        console.error(`Error executing automation ${automation.id}:`, err);

        // Log failed execution
        await supabase.from("automation_executions").insert({
          automation_id: automation.id,
          organization_id: organization_id,
          person_id: person_id,
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          executed_at: new Date().toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, event_type, executed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process event trigger error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
