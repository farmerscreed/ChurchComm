import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Automation {
  id: string;
  organization_id: string;
  name: string;
  trigger_type: string;
  status: string;
  message_type: string;
  message_template: string;
  trigger_config: {
    days_before?: number;
    send_time?: string;
    delay_hours?: number;
  };
  target_filter: Record<string, unknown>;
}

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  birthday: string | null;
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const results = {
      birthdaysProcessed: 0,
      messagesSent: 0,
      errors: [] as string[],
    };

    // Get all active automations
    const { data: automations, error: autoError } = await supabaseClient
      .from("automations")
      .select("*")
      .eq("status", "active");

    if (autoError) {
      throw new Error(`Failed to fetch automations: ${autoError.message}`);
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Process each automation
    for (const automation of automations || []) {
      try {
        // Check if it's time to run this automation based on send_time
        const sendTime = automation.trigger_config?.send_time || "09:00";
        const [sendHour, sendMinute] = sendTime.split(":").map(Number);

        // Only process if within 15 minute window of send time
        const timeDiff = Math.abs(currentHour * 60 + currentMinute - (sendHour * 60 + sendMinute));
        if (timeDiff > 15) {
          continue;
        }

        // Get organization info
        const { data: org } = await supabaseClient
          .from("organizations")
          .select("id, name")
          .eq("id", automation.organization_id)
          .single();

        if (!org) continue;

        switch (automation.trigger_type) {
          case "birthday":
            await processBirthdayAutomation(
              supabaseClient,
              automation,
              org,
              today,
              results
            );
            break;

          case "membership_anniversary":
            await processMembershipAnniversary(
              supabaseClient,
              automation,
              org,
              today,
              results
            );
            break;

          // Other trigger types can be added here
          default:
            // Event-based triggers are processed differently (via webhooks/triggers)
            break;
        }

        // Update last_run_at
        await supabaseClient
          .from("automations")
          .update({ last_run_at: now.toISOString() })
          .eq("id", automation.id);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`Automation ${automation.id}: ${errorMsg}`);
        console.error(`Error processing automation ${automation.id}:`, err);
      }
    }

    // Process scheduled messages
    await processScheduledMessages(supabaseClient, now, results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in process-automations:", error);
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

async function processBirthdayAutomation(
  supabase: ReturnType<typeof createClient>,
  automation: Automation,
  org: Organization,
  today: Date,
  results: { birthdaysProcessed: number; messagesSent: number; errors: string[] }
) {
  const daysBefore = automation.trigger_config?.days_before || 0;
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + daysBefore);

  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();

  // Find people with birthdays on the target date
  const { data: people, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, phone_number, email, birthday")
    .eq("organization_id", automation.organization_id)
    .not("birthday", "is", null);

  if (error) {
    throw new Error(`Failed to fetch people: ${error.message}`);
  }

  // Filter people with matching birthday (month and day)
  const birthdayPeople = (people || []).filter((person) => {
    if (!person.birthday) return false;
    const bday = new Date(person.birthday);
    return bday.getMonth() + 1 === targetMonth && bday.getDate() === targetDay;
  });

  results.birthdaysProcessed += birthdayPeople.length;

  for (const person of birthdayPeople) {
    try {
      // Check if already sent today
      const { data: existingExec } = await supabase
        .from("automation_executions")
        .select("id")
        .eq("automation_id", automation.id)
        .eq("person_id", person.id)
        .gte("created_at", today.toISOString())
        .single();

      if (existingExec) {
        continue; // Already sent today
      }

      // Personalize message
      const message = personalizeMessage(
        automation.message_template,
        person,
        org
      );

      // Send message based on type
      if (automation.message_type === "sms" && person.phone_number) {
        await sendSMS(supabase, person.phone_number, message, automation.organization_id);
        results.messagesSent++;

        // Log execution
        await supabase.from("automation_executions").insert({
          automation_id: automation.id,
          organization_id: automation.organization_id,
          person_id: person.id,
          status: "sent",
          message_sent: message,
          executed_at: new Date().toISOString(),
        });

        // Update automation stats
        await supabase
          .from("automations")
          .update({ total_sent: automation.total_sent ? automation.total_sent + 1 : 1 })
          .eq("id", automation.id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.errors.push(`Birthday message to ${person.first_name}: ${errorMsg}`);

      // Log failed execution
      await supabase.from("automation_executions").insert({
        automation_id: automation.id,
        organization_id: automation.organization_id,
        person_id: person.id,
        status: "failed",
        error_message: errorMsg,
        executed_at: new Date().toISOString(),
      });
    }
  }
}

async function processMembershipAnniversary(
  supabase: ReturnType<typeof createClient>,
  automation: Automation,
  org: Organization,
  today: Date,
  results: { birthdaysProcessed: number; messagesSent: number; errors: string[] }
) {
  // Similar logic to birthday but for membership created_at dates
  const targetMonth = today.getMonth() + 1;
  const targetDay = today.getDate();

  const { data: people, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, phone_number, email, created_at")
    .eq("organization_id", automation.organization_id);

  if (error) {
    throw new Error(`Failed to fetch people: ${error.message}`);
  }

  const anniversaryPeople = (people || []).filter((person) => {
    if (!person.created_at) return false;
    const created = new Date(person.created_at);
    // Check if at least 1 year has passed
    const yearsDiff = today.getFullYear() - created.getFullYear();
    if (yearsDiff < 1) return false;
    return created.getMonth() + 1 === targetMonth && created.getDate() === targetDay;
  });

  for (const person of anniversaryPeople) {
    try {
      const { data: existingExec } = await supabase
        .from("automation_executions")
        .select("id")
        .eq("automation_id", automation.id)
        .eq("person_id", person.id)
        .gte("created_at", today.toISOString())
        .single();

      if (existingExec) continue;

      const message = personalizeMessage(
        automation.message_template,
        person as unknown as Person,
        org
      );

      if (automation.message_type === "sms" && person.phone_number) {
        await sendSMS(supabase, person.phone_number, message, automation.organization_id);
        results.messagesSent++;

        await supabase.from("automation_executions").insert({
          automation_id: automation.id,
          organization_id: automation.organization_id,
          person_id: person.id,
          status: "sent",
          message_sent: message,
          executed_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.errors.push(`Anniversary message to ${person.first_name}: ${errorMsg}`);
    }
  }
}

async function processScheduledMessages(
  supabase: ReturnType<typeof createClient>,
  now: Date,
  results: { birthdaysProcessed: number; messagesSent: number; errors: string[] }
) {
  // Get scheduled messages that are due
  const { data: messages, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now.toISOString());

  if (error) {
    throw new Error(`Failed to fetch scheduled messages: ${error.message}`);
  }

  for (const message of messages || []) {
    try {
      // Mark as processing
      await supabase
        .from("scheduled_messages")
        .update({ status: "processing", started_at: now.toISOString() })
        .eq("id", message.id);

      // Get recipients based on type
      let recipients: Person[] = [];

      if (message.recipient_type === "all") {
        const { data } = await supabase
          .from("people")
          .select("id, first_name, last_name, phone_number, email, birthday")
          .eq("organization_id", message.organization_id)
          .not("phone_number", "is", null);
        recipients = data || [];
      } else if (message.recipient_type === "group" && message.recipient_ids?.length) {
        const { data } = await supabase
          .from("group_members")
          .select("people(id, first_name, last_name, phone_number, email, birthday)")
          .eq("group_id", message.recipient_ids[0]);
        recipients = (data || []).map((d) => d.people).filter(Boolean) as Person[];
      }

      let sentCount = 0;
      let failedCount = 0;

      // Get org for personalization
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", message.organization_id)
        .single();

      for (const person of recipients) {
        if (!person.phone_number) {
          failedCount++;
          continue;
        }

        try {
          const personalizedMessage = personalizeMessage(
            message.message_content,
            person,
            org || { id: message.organization_id, name: "" }
          );

          await sendSMS(
            supabase,
            person.phone_number,
            personalizedMessage,
            message.organization_id
          );

          sentCount++;
          results.messagesSent++;
        } catch (err) {
          failedCount++;
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          results.errors.push(`Scheduled message to ${person.first_name}: ${errorMsg}`);
        }
      }

      // Update message status
      await supabase
        .from("scheduled_messages")
        .update({
          status: failedCount === recipients.length ? "failed" : "completed",
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", message.id);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.errors.push(`Scheduled message ${message.id}: ${errorMsg}`);

      await supabase
        .from("scheduled_messages")
        .update({
          status: "failed",
          error_message: errorMsg,
        })
        .eq("id", message.id);
    }
  }
}

function personalizeMessage(
  template: string,
  person: Person,
  org: Organization
): string {
  return template
    .replace(/{Name}/gi, person.first_name || "")
    .replace(/{FirstName}/gi, person.first_name || "")
    .replace(/{LastName}/gi, person.last_name || "")
    .replace(/{ChurchName}/gi, org.name || "")
    .replace(/{OrganizationName}/gi, org.name || "");
}

async function sendSMS(
  supabase: ReturnType<typeof createClient>,
  phoneNumber: string,
  message: string,
  organizationId: string
) {
  // Format phone number
  let formattedPhone = phoneNumber.replace(/\D/g, "");
  if (!formattedPhone.startsWith("1") && formattedPhone.length === 10) {
    formattedPhone = "1" + formattedPhone;
  }
  formattedPhone = "+" + formattedPhone;

  // Get Twilio credentials
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new Error("Twilio credentials not configured");
  }

  // Send via Twilio
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  const response = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
    },
    body: new URLSearchParams({
      To: formattedPhone,
      From: twilioPhoneNumber,
      Body: message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Twilio error: ${response.status}`);
  }

  return await response.json();
}
