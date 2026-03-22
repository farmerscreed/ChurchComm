---
description: Create send-escalation-notification edge function
epic: Epic 2 - Automated Calling & Workflows
task_id: 2.2a
---

## Context
When an escalation alert is created (e.g., someone mentioned crisis issues during a call), we need to notify admins and pastors immediately via SMS and/or email.

## Prerequisites
- Epic 1 complete (notification_preferences table exists)
- Twilio and Resend credentials available

## Implementation Steps

### 1. Create the edge function

Create `supabase/functions/send-escalation-notification/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { record } = await req.json();
    
    if (!record) {
      return new Response(JSON.stringify({ error: "No escalation record provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id, organization_id, person_id, alert_type, priority, summary } = record;

    console.log(`Processing escalation notification: ${id}, type: ${alert_type}, priority: ${priority}`);

    // Get person details
    const { data: person } = await supabase
      .from("people")
      .select("first_name, last_name, phone")
      .eq("id", person_id)
      .single();

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    // Get admin and pastor members with their notification preferences
    const { data: recipients } = await supabase
      .from("organization_members")
      .select(`
        user_id,
        role,
        users!inner(email, phone),
        notification_preferences!inner(escalation_sms, escalation_email)
      `)
      .eq("organization_id", organization_id)
      .in("role", ["admin", "pastor"]);

    const personName = `${person?.first_name} ${person?.last_name}`;
    const appUrl = Deno.env.get("APP_URL") || "https://churchcomm.app";

    // Send notifications to each recipient based on their preferences
    for (const recipient of recipients || []) {
      const prefs = recipient.notification_preferences;
      
      if (prefs?.escalation_sms && recipient.users?.phone) {
        await sendSmsNotification(
          recipient.users.phone,
          personName,
          alert_type,
          priority,
          summary,
          appUrl
        );
      }

      if (prefs?.escalation_email && recipient.users?.email) {
        await sendEmailNotification(
          recipient.users.email,
          personName,
          alert_type,
          priority,
          summary,
          org?.name || "Your Church",
          appUrl
        );
      }
    }

    // Update escalation_alerts with notification timestamp
    await supabase
      .from("escalation_alerts")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", id);

    return new Response(JSON.stringify({ 
      success: true, 
      recipients_notified: recipients?.length || 0 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Escalation notification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendSmsNotification(
  phone: string,
  personName: string,
  alertType: string,
  priority: string,
  summary: string,
  appUrl: string
): Promise<void> {
  const urgentPrefix = priority === "urgent" ? "[URGENT] " : "";
  const message = `${urgentPrefix}ChurchComm Alert: ${personName} - ${alertType}. ${summary?.slice(0, 100)}... Login to review: ${appUrl}`;

  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: twilioPhone!,
        Body: message,
      }),
    }
  );

  if (!response.ok) {
    console.error("Twilio SMS failed:", await response.text());
  } else {
    console.log(`SMS sent to ${phone}`);
  }
}

async function sendEmailNotification(
  email: string,
  personName: string,
  alertType: string,
  priority: string,
  summary: string,
  churchName: string,
  appUrl: string
): Promise<void> {
  const priorityColor = priority === "urgent" ? "#dc2626" : priority === "high" ? "#f59e0b" : "#3b82f6";
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${priorityColor};">${priority.toUpperCase()} Escalation Alert</h2>
      <p><strong>Church:</strong> ${churchName}</p>
      <p><strong>Person:</strong> ${personName}</p>
      <p><strong>Alert Type:</strong> ${alertType}</p>
      <h3>Summary</h3>
      <p style="background: #f3f4f6; padding: 16px; border-radius: 8px;">${summary}</p>
      <a href="${appUrl}/follow-ups" style="display: inline-block; background: ${priorityColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
        Review in ChurchComm
      </a>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ChurchComm <alerts@churchcomm.app>",
      to: email,
      subject: `[${priority.toUpperCase()}] Escalation Alert: ${personName} - ${alertType}`,
      html: html,
    }),
  });

  if (!response.ok) {
    console.error("Resend email failed:", await response.text());
  } else {
    console.log(`Email sent to ${email}`);
  }
}
```

## Environment Variables Required
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `RESEND_API_KEY`
- `APP_URL`

## Verification
Test by manually calling the function with a sample escalation record.

## On Completion
Update `activity.md` and mark task 2.2a as `[x]` in `implementation-order.md`
