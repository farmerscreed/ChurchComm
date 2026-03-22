---
description: Implement VAPI call execution in auto-call-trigger
epic: Epic 2 - Automated Calling & Workflows
task_id: 2.1d
---

## Context
After creating scheduled call_attempts, we need to actually execute them via VAPI. This task adds the VAPI integration to the auto-call-trigger.

## Prerequisites
- Tasks 2.1a, 2.1b, 2.1c complete
- VAPI API key available in environment

## Implementation Steps

### 1. Add VAPI execution after trigger processing

At the end of the org processing loop:

```typescript
// After all triggers processed, execute scheduled calls
await executeScheduledCalls(supabase, org);
```

### 2. Implement executeScheduledCalls function

```typescript
async function executeScheduledCalls(supabase: any, org: any): Promise<void> {
  // Get scheduled calls for this org
  const { data: scheduledCalls, error } = await supabase
    .from("call_attempts")
    .select(`
      id,
      person_id,
      script_id,
      trigger_type,
      people!inner(id, first_name, last_name, phone),
      call_scripts!inner(id, name, prompt, voice_id)
    `)
    .eq("organization_id", org.id)
    .eq("status", "scheduled")
    .limit(10); // Process max 10 at a time

  if (error || !scheduledCalls?.length) {
    console.log(`No scheduled calls for org ${org.id}`);
    return;
  }

  console.log(`Executing ${scheduledCalls.length} scheduled calls for org ${org.id}`);

  // Determine phone number to use
  const phoneNumberId = org.phone_number_type === "dedicated" && org.dedicated_phone_number
    ? org.dedicated_phone_number
    : Deno.env.get("VAPI_PHONE_NUMBER_ID");

  for (const call of scheduledCalls) {
    try {
      // Apply variable substitution to script
      const prompt = substituteVariables(call.call_scripts.prompt, {
        first_name: call.people.first_name,
        last_name: call.people.last_name,
        church_name: org.name,
        day_of_week: new Date().toLocaleDateString("en-US", { weekday: "long" }),
      });

      // Call VAPI API
      const vapiResponse = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("VAPI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumberId: phoneNumberId,
          customer: {
            number: call.people.phone,
          },
          assistant: {
            firstMessage: `Hi ${call.people.first_name}, this is a call from ${org.name}.`,
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: prompt }],
            },
            voice: {
              provider: "11labs",
              voiceId: call.call_scripts.voice_id || "paula",
            },
          },
        }),
      });

      if (vapiResponse.ok) {
        const vapiData = await vapiResponse.json();
        
        // Update call_attempt to in_progress
        await supabase
          .from("call_attempts")
          .update({
            status: "in_progress",
            vapi_call_id: vapiData.id,
            started_at: new Date().toISOString(),
          })
          .eq("id", call.id);

        console.log(`Started call for ${call.people.first_name}: VAPI ID ${vapiData.id}`);
      } else {
        const errorText = await vapiResponse.text();
        throw new Error(`VAPI error: ${errorText}`);
      }
    } catch (error) {
      console.error(`Failed to initiate call for ${call.people.first_name}:`, error);
      
      // Update status to failed
      await supabase
        .from("call_attempts")
        .update({
          status: "failed",
          error_message: error.message,
          retry_count: (call.retry_count || 0) + 1,
        })
        .eq("id", call.id);
    }
  }
}
```

### 3. Implement variable substitution utility

```typescript
function substituteVariables(
  template: string,
  context: Record<string, string>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(context)) {
    const pattern = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(pattern, value || "");
  }
  
  return result;
}
```

### 4. Update organization query to include phone fields

Update the initial org query:
```typescript
const { data: orgs, error: orgsError } = await supabase
  .from("organizations")
  .select(`
    id,
    name,
    calling_window_start,
    calling_window_end,
    timezone,
    phone_number_type,
    dedicated_phone_number
  `);
```

### 5. Add migration for vapi_call_id and other fields if needed

```sql
ALTER TABLE call_attempts 
ADD COLUMN IF NOT EXISTS vapi_call_id VARCHAR,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
```

## Verification
1. Create a test call_attempt with status "scheduled"
2. Run auto-call-trigger
3. Verify VAPI was called and call_attempt updated to "in_progress"

## Environment Variables Required
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`

## On Completion
Update `activity.md` and mark task 2.1d as `[x]` in `implementation-order.md`
