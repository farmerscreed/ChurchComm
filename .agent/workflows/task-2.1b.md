---
description: Implement first_timer trigger logic in auto-call-trigger
epic: Epic 2 - Automated Calling & Workflows
task_id: 2.1b
---

## Context
This task adds the first automated trigger: calling first-time visitors within a configured time window after they're added to the system.

## Prerequisites
- Task 2.1a complete (auto-call-trigger scaffold exists)

## Implementation Steps

### 1. Add first_timer trigger handler to auto-call-trigger

In `supabase/functions/auto-call-trigger/index.ts`, add after the triggers query:

```typescript
// Process each trigger type
for (const trigger of triggers || []) {
  if (trigger.trigger_type === "first_timer") {
    await processFirstTimerTrigger(supabase, org, trigger);
  }
  // Birthday and anniversary handlers will be added in 2.1c
}
```

### 2. Implement processFirstTimerTrigger function

Add this function to the file:

```typescript
async function processFirstTimerTrigger(
  supabase: any,
  org: any,
  trigger: any
): Promise<void> {
  const delayHours = trigger.delay_hours || 24;
  
  // Calculate the time window: people added within delay_hours ago
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - delayHours);
  
  const windowEnd = new Date();
  windowEnd.setHours(windowEnd.getHours() - (delayHours - 1)); // 1-hour window

  console.log(`Processing first_timer trigger for org ${org.id}`);
  console.log(`Looking for people added between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

  // Query first-time visitors in the time window
  const { data: people, error: peopleError } = await supabase
    .from("people")
    .select("id, first_name, last_name, phone")
    .eq("organization_id", org.id)
    .eq("status", "first_time_visitor")
    .eq("do_not_call", false)
    .gte("created_at", windowStart.toISOString())
    .lt("created_at", windowEnd.toISOString());

  if (peopleError) {
    console.error("Error fetching first-time visitors:", peopleError);
    return;
  }

  console.log(`Found ${people?.length || 0} first-time visitors to call`);

  for (const person of people || []) {
    // Check if we already have a call attempt for this person + trigger type
    const { data: existingAttempt } = await supabase
      .from("call_attempts")
      .select("id")
      .eq("person_id", person.id)
      .eq("trigger_type", "first_timer")
      .single();

    if (existingAttempt) {
      console.log(`Skipping ${person.first_name} - already has first_timer call attempt`);
      continue;
    }

    // Check minute usage before scheduling
    const hasMinutes = await checkMinuteUsage(supabase, org.id);
    if (!hasMinutes) {
      console.log(`Org ${org.id} has exceeded minute limit, stopping`);
      break;
    }

    // Create call_attempt record
    const { error: insertError } = await supabase
      .from("call_attempts")
      .insert({
        organization_id: org.id,
        person_id: person.id,
        campaign_id: null, // Auto-triggered, not part of a campaign
        script_id: trigger.script_id,
        status: "scheduled",
        trigger_type: "first_timer",
        scheduled_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error(`Error creating call attempt for ${person.first_name}:`, insertError);
    } else {
      console.log(`Scheduled first_timer call for ${person.first_name} ${person.last_name}`);
    }
  }
}

async function checkMinuteUsage(supabase: any, orgId: string): Promise<boolean> {
  const { data: usage } = await supabase
    .from("minute_usage")
    .select("minutes_used, minutes_included, overage_approved")
    .eq("organization_id", orgId)
    .order("billing_period_start", { ascending: false })
    .limit(1)
    .single();

  if (!usage) return true; // No usage record, allow calls

  if (usage.overage_approved) return true; // Overage approved

  return usage.minutes_used < usage.minutes_included;
}
```

### 3. Add trigger_type column to call_attempts if not exists

Create migration if needed:
```sql
-- Check if column exists, add if not
ALTER TABLE call_attempts 
ADD COLUMN IF NOT EXISTS trigger_type VARCHAR;
```

## Verification
Test the function by:
1. Adding a person with status `first_time_visitor` 
2. Setting their `created_at` to within the delay window
3. Running the auto-call-trigger function
4. Checking that a `call_attempts` record was created

## On Completion
Update `activity.md` with:
```markdown
### Session: [DATE] - Task 2.1b
- Implemented `processFirstTimerTrigger()` function
- Added minute usage check before scheduling calls
- Added duplicate call attempt prevention
- Added trigger_type column to call_attempts
```

Update `implementation-order.md`: Mark task 2.1b as `[x]`
