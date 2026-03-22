---
description: Create auto-call-trigger edge function scaffold + calling window logic
epic: Epic 2 - Automated Calling & Workflows
task_id: 2.1a
---

## Context
We're building the automated calling engine that powers ChurchComm's core value proposition. This edge function will run periodically (every 15 minutes) to check for trigger conditions and schedule calls.

## Prerequisites
- Epic 1 complete (database tables exist: `auto_triggers`, `organizations` with calling window fields)
- Supabase CLI installed

## Implementation Steps

### 1. Create the edge function file
Create `supabase/functions/auto-call-trigger/index.ts`:

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

    console.log("Auto-call-trigger started at:", new Date().toISOString());

    // Get all organizations with enabled auto-triggers
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        calling_window_start,
        calling_window_end,
        timezone
      `);

    if (orgsError) throw orgsError;

    const results = [];

    for (const org of orgs || []) {
      // Check if current time is within calling window
      if (!isWithinCallingWindow(org)) {
        console.log(`Org ${org.name}: Outside calling window, skipping`);
        results.push({ org_id: org.id, status: "outside_window" });
        continue;
      }

      // Get enabled triggers for this org
      const { data: triggers, error: triggersError } = await supabase
        .from("auto_triggers")
        .select("*")
        .eq("organization_id", org.id)
        .eq("enabled", true);

      if (triggersError) {
        console.error(`Error fetching triggers for org ${org.id}:`, triggersError);
        continue;
      }

      console.log(`Org ${org.name}: Found ${triggers?.length || 0} enabled triggers`);
      results.push({ 
        org_id: org.id, 
        status: "processed", 
        triggers_evaluated: triggers?.length || 0 
      });

      // Trigger processing will be added in subsequent tasks (2.1b, 2.1c)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed_at: new Date().toISOString(),
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auto-call-trigger error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Check if current time is within the org's configured calling window
 */
function isWithinCallingWindow(org: {
  calling_window_start: string;
  calling_window_end: string;
  timezone: string;
}): boolean {
  const timezone = org.timezone || "America/New_York";
  
  // Get current time in org's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const currentHour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
  const currentMinute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
  const currentMinutes = currentHour * 60 + currentMinute;

  // Parse calling window times (format: "HH:MM")
  const [startHour, startMin] = (org.calling_window_start || "09:00").split(":").map(Number);
  const [endHour, endMin] = (org.calling_window_end || "20:00").split(":").map(Number);
  
  const windowStart = startHour * 60 + startMin;
  const windowEnd = endHour * 60 + endMin;

  return currentMinutes >= windowStart && currentMinutes <= windowEnd;
}
```

### 2. Add basic logging
The function already includes console.log statements for trigger evaluations.

## Verification
// turbo
```bash
cd supabase && npx supabase functions serve auto-call-trigger --no-verify-jwt
```

Test with:
```bash
curl -X POST http://localhost:54321/functions/v1/auto-call-trigger
```

Expected result: JSON response with `success: true` and list of processed organizations.

## On Completion
Update `activity.md` with:
```markdown
### Session: [DATE] - Task 2.1a
- Created `auto-call-trigger` edge function scaffold
- Implemented `isWithinCallingWindow()` helper with timezone support
- Added organization iteration and trigger querying logic
```

Update `implementation-order.md`: Mark task 2.1a as `[x]`
