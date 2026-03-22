---
description: Implement birthday and anniversary trigger logic in auto-call-trigger
epic: Epic 2 - Automated Calling & Workflows
task_id: 2.1c
---

## Context
This task adds birthday and membership anniversary triggers to the auto-call-trigger function.

## Prerequisites
- Task 2.1a and 2.1b complete

## Implementation Steps

### 1. Add birthday and anniversary handlers to the trigger loop

In `auto-call-trigger/index.ts`, update the trigger processing loop:

```typescript
for (const trigger of triggers || []) {
  switch (trigger.trigger_type) {
    case "first_timer":
      await processFirstTimerTrigger(supabase, org, trigger);
      break;
    case "birthday":
      await processBirthdayTrigger(supabase, org, trigger);
      break;
    case "anniversary":
      await processAnniversaryTrigger(supabase, org, trigger);
      break;
  }
}
```

### 2. Implement processBirthdayTrigger function

```typescript
async function processBirthdayTrigger(
  supabase: any,
  org: any,
  trigger: any
): Promise<void> {
  const today = new Date();
  const month = today.getMonth() + 1; // 1-indexed
  const day = today.getDate();

  console.log(`Processing birthday trigger for org ${org.id}, looking for ${month}/${day}`);

  // Query people with birthdays today
  // Assumes birthday is stored as DATE or a parseable format
  const { data: people, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, phone, birthday")
    .eq("organization_id", org.id)
    .eq("do_not_call", false)
    .not("birthday", "is", null);

  if (error) {
    console.error("Error fetching people for birthday check:", error);
    return;
  }

  // Filter for today's birthdays
  const birthdayPeople = (people || []).filter((person: any) => {
    if (!person.birthday) return false;
    const bday = new Date(person.birthday);
    return bday.getMonth() + 1 === month && bday.getDate() === day;
  });

  console.log(`Found ${birthdayPeople.length} people with birthdays today`);

  for (const person of birthdayPeople) {
    // Check for existing birthday call today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingAttempt } = await supabase
      .from("call_attempts")
      .select("id")
      .eq("person_id", person.id)
      .eq("trigger_type", "birthday")
      .gte("created_at", todayStart.toISOString())
      .single();

    if (existingAttempt) {
      console.log(`Skipping ${person.first_name} - already has birthday call today`);
      continue;
    }

    // Check minute usage
    if (!(await checkMinuteUsage(supabase, org.id))) {
      console.log(`Org ${org.id} has exceeded minute limit`);
      break;
    }

    // Create call attempt
    const { error: insertError } = await supabase
      .from("call_attempts")
      .insert({
        organization_id: org.id,
        person_id: person.id,
        script_id: trigger.script_id,
        status: "scheduled",
        trigger_type: "birthday",
        scheduled_at: new Date().toISOString(),
      });

    if (!insertError) {
      console.log(`Scheduled birthday call for ${person.first_name} ${person.last_name}`);
    }
  }
}
```

### 3. Implement processAnniversaryTrigger function

```typescript
async function processAnniversaryTrigger(
  supabase: any,
  org: any,
  trigger: any
): Promise<void> {
  const milestones = trigger.anniversary_milestones || [1, 12]; // Default: 1 month, 12 months
  const today = new Date();

  console.log(`Processing anniversary trigger for org ${org.id}, milestones: ${milestones}`);

  // Get all members (not first-time visitors)
  const { data: people, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, phone, created_at")
    .eq("organization_id", org.id)
    .eq("do_not_call", false)
    .in("status", ["member", "leader", "regular_attender"]);

  if (error) {
    console.error("Error fetching people for anniversary check:", error);
    return;
  }

  for (const person of people || []) {
    const memberSince = new Date(person.created_at);
    const monthsSince = monthsDifference(memberSince, today);

    // Check if this month count matches any milestone
    if (!milestones.includes(monthsSince)) continue;

    // Check if today is their anniversary day (same day of month)
    if (memberSince.getDate() !== today.getDate()) continue;

    console.log(`${person.first_name} is at ${monthsSince} month milestone`);

    // Check for existing anniversary call this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const { data: existingAttempt } = await supabase
      .from("call_attempts")
      .select("id")
      .eq("person_id", person.id)
      .eq("trigger_type", "anniversary")
      .gte("created_at", monthStart.toISOString())
      .single();

    if (existingAttempt) {
      console.log(`Skipping ${person.first_name} - already has anniversary call this month`);
      continue;
    }

    if (!(await checkMinuteUsage(supabase, org.id))) {
      break;
    }

    const { error: insertError } = await supabase
      .from("call_attempts")
      .insert({
        organization_id: org.id,
        person_id: person.id,
        script_id: trigger.script_id,
        status: "scheduled",
        trigger_type: "anniversary",
        scheduled_at: new Date().toISOString(),
        metadata: { milestone_months: monthsSince },
      });

    if (!insertError) {
      console.log(`Scheduled anniversary call for ${person.first_name} (${monthsSince} months)`);
    }
  }
}

function monthsDifference(date1: Date, date2: Date): number {
  return (date2.getFullYear() - date1.getFullYear()) * 12 
    + (date2.getMonth() - date1.getMonth());
}
```

### 4. Add retry logic for failed calls

```typescript
async function processRetries(supabase: any, org: any): Promise<void> {
  // Find failed calls with retries < 2
  const { data: failedAttempts } = await supabase
    .from("call_attempts")
    .select("*")
    .eq("organization_id", org.id)
    .eq("status", "failed")
    .lt("retry_count", 2)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  for (const attempt of failedAttempts || []) {
    await supabase
      .from("call_attempts")
      .update({ 
        status: "scheduled",
        retry_count: (attempt.retry_count || 0) + 1,
        scheduled_at: new Date().toISOString()
      })
      .eq("id", attempt.id);

    console.log(`Rescheduled failed call attempt ${attempt.id} (retry ${attempt.retry_count + 1})`);
  }
}
```

Call this at the end of each org's processing.

## Verification
1. Add a person with a birthday matching today
2. Run auto-call-trigger
3. Verify a birthday call_attempt was created

## On Completion
Update `activity.md` and mark task 2.1c as `[x]` in `implementation-order.md`
