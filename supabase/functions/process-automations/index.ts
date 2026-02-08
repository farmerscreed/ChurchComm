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
  action_type: string;
  action_config: {
    message_template?: string;
    script_id?: string;
  };
  trigger_config: {
    days_before?: number;
    send_time?: string;
    delay_hours?: number;
  };
  target_groups: string[] | null;
  total_executions: number | null;
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
  timezone: string;
}

// Get current time in organization's timezone
function getCurrentTimeInTimezone(timezone: string): { hour: number; minute: number; date: Date } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  // Get today's date in org timezone
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateParts = dateFormatter.formatToParts(now);
  const year = parseInt(dateParts.find(p => p.type === 'year')?.value || '2024', 10);
  const month = parseInt(dateParts.find(p => p.type === 'month')?.value || '1', 10);
  const day = parseInt(dateParts.find(p => p.type === 'day')?.value || '1', 10);

  return {
    hour,
    minute,
    date: new Date(year, month - 1, day)
  };
}

serve(async (req) => {
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

    // Get all active automations with their organization timezone
    const { data: automations, error: autoError } = await supabaseClient
      .from("automations")
      .select(`
        *,
        organizations!inner(id, name, timezone)
      `)
      .eq("status", "active");

    if (autoError) {
      throw new Error(`Failed to fetch automations: ${autoError.message}`);
    }

    console.log(`Found ${automations?.length || 0} active automations`);

    // Process each automation
    for (const automationData of automations || []) {
      try {
        const automation = automationData as Automation & { organizations: Organization };
        const org = automation.organizations;
        const timezone = org.timezone || 'America/New_York';

        // Get current time in organization's timezone
        const { hour: currentHour, minute: currentMinute, date: today } = getCurrentTimeInTimezone(timezone);

        // Check if it's time to run this automation based on send_time
        const sendTime = automation.trigger_config?.send_time || "09:00";
        const [sendHour, sendMinute] = sendTime.split(":").map(Number);

        // Only process if within 15 minute window of send time
        const timeDiff = Math.abs(currentHour * 60 + currentMinute - (sendHour * 60 + sendMinute));

        console.log(`Automation ${automation.id}: Org timezone=${timezone}, Current=${currentHour}:${String(currentMinute).padStart(2, '0')}, Send=${sendTime}, Diff=${timeDiff}min`);

        if (timeDiff > 15) {
          continue;
        }

        switch (automation.trigger_type) {
          case "birthday":
            await processBirthdayAutomation(
              supabaseClient,
              automation,
              org,
              today,
              timezone,
              results
            );
            break;

          case "membership_anniversary":
            await processMembershipAnniversary(
              supabaseClient,
              automation,
              org,
              today,
              timezone,
              results
            );
            break;

          default:
            // Event-based triggers are processed differently
            break;
        }

        // Update last_executed_at
        await supabaseClient
          .from("automations")
          .update({ last_executed_at: new Date().toISOString() })
          .eq("id", automation.id);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(`Automation ${automationData.id}: ${errorMsg}`);
        console.error(`Error processing automation ${automationData.id}:`, err);
      }
    }

    // Note: scheduled_messages are now handled by execute-scheduled-outreach function
    // which is triggered separately by the cron job

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
  timezone: string,
  results: { birthdaysProcessed: number; messagesSent: number; errors: string[] }
) {
  const daysBefore = automation.trigger_config?.days_before || 0;
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + daysBefore);

  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();

  console.log(`Birthday automation ${automation.id}: Looking for birthdays on ${targetMonth}/${targetDay}`);

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
    const bday = new Date(person.birthday + 'T00:00:00');
    return (bday.getMonth() + 1) === targetMonth && bday.getDate() === targetDay;
  });

  console.log(`Found ${birthdayPeople.length} people with birthdays on ${targetMonth}/${targetDay}`);
  results.birthdaysProcessed += birthdayPeople.length;

  for (const person of birthdayPeople) {
    try {
      // Check if already sent today (using today's date in org timezone)
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingExec } = await supabase
        .from("automation_executions")
        .select("id")
        .eq("automation_id", automation.id)
        .eq("person_id", person.id)
        .gte("executed_at", todayStart.toISOString())
        .maybeSingle();

      if (existingExec) {
        console.log(`Already sent birthday message to ${person.first_name} today`);
        continue;
      }

      // Get message template from action_config
      const messageTemplate = automation.action_config?.message_template ||
        "Happy Birthday, {FirstName}! 🎂 We hope you have a wonderful day!";

      // Personalize message
      const message = personalizeMessage(messageTemplate, person, org);

      // Send message based on action_type
      if (automation.action_type === "sms" && person.phone_number) {
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
          .update({
            total_executions: (automation.total_executions || 0) + 1
          })
          .eq("id", automation.id);

        console.log(`Sent birthday SMS to ${person.first_name} ${person.last_name}`);
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
  timezone: string,
  results: { birthdaysProcessed: number; messagesSent: number; errors: string[] }
) {
  const targetMonth = today.getMonth() + 1;
  const targetDay = today.getDate();

  console.log(`Anniversary automation ${automation.id}: Looking for anniversaries on ${targetMonth}/${targetDay}`);

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
    return (created.getMonth() + 1) === targetMonth && created.getDate() === targetDay;
  });

  console.log(`Found ${anniversaryPeople.length} people with anniversaries`);

  for (const person of anniversaryPeople) {
    try {
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingExec } = await supabase
        .from("automation_executions")
        .select("id")
        .eq("automation_id", automation.id)
        .eq("person_id", person.id)
        .gte("executed_at", todayStart.toISOString())
        .maybeSingle();

      if (existingExec) continue;

      const messageTemplate = automation.action_config?.message_template ||
        "Happy Anniversary, {FirstName}! Thank you for being part of {ChurchName}!";

      const message = personalizeMessage(
        messageTemplate,
        person as unknown as Person,
        org
      );

      if (automation.action_type === "sms" && person.phone_number) {
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

        await supabase
          .from("automations")
          .update({
            total_executions: (automation.total_executions || 0) + 1
          })
          .eq("id", automation.id);

        console.log(`Sent anniversary SMS to ${person.first_name} ${person.last_name}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      results.errors.push(`Anniversary message to ${person.first_name}: ${errorMsg}`);
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
