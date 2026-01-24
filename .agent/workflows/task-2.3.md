---
description: Implement minute usage tracking and overage prevention
epic: Epic 2 - Automated Calling & Workflows
task_id: 2.3
---

## Context
Track how many minutes each organization uses and prevent calls when they've exceeded their plan limits (unless they've approved overage).

## Prerequisites
- Epic 1 complete (minute_usage table exists with increment trigger)
- vapi-webhook edge function exists

## Implementation Steps

### 1. Update vapi-webhook to calculate and record call duration

In `supabase/functions/vapi-webhook/index.ts`, add duration tracking:

```typescript
// In the call.ended handler:
if (message.type === "end-of-call-report" || status === "ended") {
  const duration = message.call?.duration || message.duration; // in seconds
  const durationMinutes = Math.ceil(duration / 60); // Round up to nearest minute

  // Get org from call_attempt
  const { data: attempt } = await supabase
    .from("call_attempts")
    .select("organization_id")
    .eq("vapi_call_id", callId)
    .single();

  if (attempt?.organization_id) {
    await recordMinuteUsage(supabase, attempt.organization_id, durationMinutes);
    await checkUsageWarning(supabase, attempt.organization_id);
  }

  // Update call_attempt with duration
  await supabase
    .from("call_attempts")
    .update({
      status: "completed",
      duration_seconds: duration,
      ended_at: new Date().toISOString(),
    })
    .eq("vapi_call_id", callId);
}
```

### 2. Implement recordMinuteUsage function

```typescript
async function recordMinuteUsage(
  supabase: any,
  orgId: string,
  minutes: number
): Promise<void> {
  // Get current billing period usage record
  const today = new Date();
  const billingPeriodStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const { data: existing } = await supabase
    .from("minute_usage")
    .select("id, minutes_used")
    .eq("organization_id", orgId)
    .gte("billing_period_start", billingPeriodStart.toISOString())
    .single();

  if (existing) {
    // Update existing record
    await supabase
      .from("minute_usage")
      .update({ minutes_used: existing.minutes_used + minutes })
      .eq("id", existing.id);
  } else {
    // This shouldn't happen if minute_usage is created properly, but handle it
    console.warn(`No minute_usage record found for org ${orgId}`);
  }
}
```

### 3. Implement 80% usage warning check

```typescript
async function checkUsageWarning(
  supabase: any,
  orgId: string
): Promise<void> {
  const { data: usage } = await supabase
    .from("minute_usage")
    .select("id, minutes_used, minutes_included, warning_sent_at")
    .eq("organization_id", orgId)
    .order("billing_period_start", { ascending: false })
    .limit(1)
    .single();

  if (!usage) return;

  const usagePercent = (usage.minutes_used / usage.minutes_included) * 100;

  // If over 80% and no warning sent yet
  if (usagePercent >= 80 && !usage.warning_sent_at) {
    // Update warning timestamp
    await supabase
      .from("minute_usage")
      .update({ warning_sent_at: new Date().toISOString() })
      .eq("id", usage.id);

    // Send notification to admins
    await sendUsageWarningNotification(supabase, orgId, usagePercent);
  }
}

async function sendUsageWarningNotification(
  supabase: any,
  orgId: string,
  usagePercent: number
): Promise<void> {
  // Get admin emails
  const { data: admins } = await supabase
    .from("organization_members")
    .select("users!inner(email)")
    .eq("organization_id", orgId)
    .eq("role", "admin");

  // Send email notification (simplified - could use Resend)
  console.log(`Usage warning: Org ${orgId} at ${usagePercent.toFixed(0)}%`);
  // Email sending code here...
}
```

### 4. Update send-group-call to check minutes before calling

In `supabase/functions/send-group-call/index.ts`:

```typescript
// At the start of the function, before initiating any calls:
async function checkCanMakeCalls(supabase: any, orgId: string): Promise<{ allowed: boolean; message?: string }> {
  const { data: usage } = await supabase
    .from("minute_usage")
    .select("minutes_used, minutes_included, overage_approved")
    .eq("organization_id", orgId)
    .order("billing_period_start", { ascending: false })
    .limit(1)
    .single();

  if (!usage) {
    return { allowed: true }; // No usage tracking yet
  }

  if (usage.minutes_used >= usage.minutes_included && !usage.overage_approved) {
    return {
      allowed: false,
      message: "Monthly minute limit reached. Upgrade plan or approve overage in Settings → Billing."
    };
  }

  return { allowed: true };
}

// Use it:
const canCall = await checkCanMakeCalls(supabase, organizationId);
if (!canCall.allowed) {
  return new Response(JSON.stringify({ 
    error: canCall.message,
    code: "MINUTE_LIMIT_REACHED"
  }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

### 5. Update auto-call-trigger with same check

The `checkMinuteUsage` function in task 2.1b already does this - verify it matches this pattern.

## Verification
1. Set a low minutes_included value (e.g., 5 minutes)
2. Make calls until usage exceeds the limit
3. Verify warning is sent at 80%
4. Verify calls are blocked at 100%
5. Approve overage and verify calls resume

## On Completion
Update `activity.md` and mark task 2.3 as `[x]` in `implementation-order.md`
