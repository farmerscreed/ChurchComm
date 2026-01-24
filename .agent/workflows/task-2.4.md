---
description: Create send-call-summary edge function for call outcome notifications
epic: Epic 2 - Automated Calling & Workflows
task_id: 2.4
---

## Context
Admins and pastors may want to receive notifications about call outcomes - either in real-time (per call) or as a daily digest.

## Prerequisites
- notification_preferences table exists with call_summary_frequency column
- Resend configured for emails

## Implementation Steps

### 1. Create the edge function

Create `supabase/functions/send-call-summary/index.ts`:

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

    const { mode, organization_id, call_attempt } = await req.json();

    if (mode === "realtime" && call_attempt) {
      await sendRealtimeNotification(supabase, organization_id, call_attempt);
    } else if (mode === "daily_digest") {
      await sendDailyDigests(supabase);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Call summary error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendRealtimeNotification(
  supabase: any,
  orgId: string,
  callAttempt: any
): Promise<void> {
  // Get users who want real-time notifications
  const { data: recipients } = await supabase
    .from("organization_members")
    .select(`
      user_id,
      users!inner(email, first_name),
      notification_preferences!inner(call_summary_frequency)
    `)
    .eq("organization_id", orgId)
    .in("role", ["admin", "pastor"]);

  const realtimeRecipients = (recipients || []).filter(
    (r: any) => r.notification_preferences?.call_summary_frequency === "realtime"
  );

  if (realtimeRecipients.length === 0) return;

  // Get person details
  const { data: person } = await supabase
    .from("people")
    .select("first_name, last_name")
    .eq("id", callAttempt.person_id)
    .single();

  const personName = `${person?.first_name} ${person?.last_name}`;
  const outcome = callAttempt.status === "completed" ? "✅ Completed" : "❌ Failed";

  for (const recipient of realtimeRecipients) {
    await sendEmail(
      recipient.users.email,
      `Call ${callAttempt.status === "completed" ? "Completed" : "Update"}: ${personName}`,
      `
        <h2>Call Summary</h2>
        <p><strong>Person:</strong> ${personName}</p>
        <p><strong>Outcome:</strong> ${outcome}</p>
        <p><strong>Duration:</strong> ${Math.round((callAttempt.duration_seconds || 0) / 60)} minutes</p>
        ${callAttempt.summary ? `<p><strong>Summary:</strong> ${callAttempt.summary}</p>` : ""}
      `
    );
  }
}

async function sendDailyDigests(supabase: any): Promise<void> {
  // Get all organizations
  const { data: orgs } = await supabase.from("organizations").select("id, name");

  for (const org of orgs || []) {
    // Get yesterday's calls
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: calls } = await supabase
      .from("call_attempts")
      .select("id, status, duration_seconds, person_id, people(first_name, last_name)")
      .eq("organization_id", org.id)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString());

    if (!calls?.length) continue;

    // Calculate stats
    const totalCalls = calls.length;
    const completed = calls.filter((c: any) => c.status === "completed").length;
    const failed = calls.filter((c: any) => c.status === "failed").length;
    const successRate = totalCalls > 0 ? ((completed / totalCalls) * 100).toFixed(0) : 0;

    // Get escalations
    const { data: escalations } = await supabase
      .from("escalation_alerts")
      .select("id, alert_type, person_id, people(first_name, last_name)")
      .eq("organization_id", org.id)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString());

    // Get daily digest recipients
    const { data: recipients } = await supabase
      .from("organization_members")
      .select(`
        user_id,
        users!inner(email, first_name),
        notification_preferences!inner(call_summary_frequency)
      `)
      .eq("organization_id", org.id)
      .in("role", ["admin", "pastor"]);

    const digestRecipients = (recipients || []).filter(
      (r: any) => r.notification_preferences?.call_summary_frequency === "daily"
    );

    for (const recipient of digestRecipients) {
      await sendEmail(
        recipient.users.email,
        `Daily Call Summary - ${org.name}`,
        `
          <h2>📊 Daily Call Summary</h2>
          <p><strong>Date:</strong> ${yesterday.toLocaleDateString()}</p>
          <h3>Call Statistics</h3>
          <ul>
            <li>Total Calls: ${totalCalls}</li>
            <li>Completed: ${completed}</li>
            <li>Failed: ${failed}</li>
            <li>Success Rate: ${successRate}%</li>
          </ul>
          ${escalations?.length ? `
            <h3>⚠️ Escalations (${escalations.length})</h3>
            <ul>
              ${escalations.map((e: any) => `<li>${e.people?.first_name} ${e.people?.last_name}: ${e.alert_type}</li>`).join("")}
            </ul>
          ` : ""}
        `
      );
    }
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ChurchComm <notifications@churchcomm.app>",
      to,
      subject,
      html,
    }),
  });
}
```

### 2. Set up daily cron job

Use Supabase pg_cron or an external scheduler (e.g., GitHub Actions) to call:
```bash
curl -X POST https://<project>.supabase.co/functions/v1/send-call-summary \
  -H "Authorization: Bearer <service_role_key>" \
  -d '{"mode": "daily_digest"}'
```

Schedule: Daily at 8:00 AM

### 3. Trigger real-time notifications from vapi-webhook

In vapi-webhook, after updating call_attempt status to completed:
```typescript
// Check if org has real-time notification users
await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-call-summary`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mode: "realtime",
    organization_id: attempt.organization_id,
    call_attempt: { ...attempt, summary: transcript_summary },
  }),
});
```

## Verification
1. Set notification preference to "realtime" and complete a call
2. Verify email received
3. Set to "daily" and run digest manually
4. Verify digest email received

## On Completion
Update `activity.md` and mark task 2.4 as `[x]` in `implementation-order.md`
