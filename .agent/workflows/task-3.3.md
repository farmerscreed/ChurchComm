---
description: Create variable substitution engine for scripts
epic: Epic 3 - Enhanced Script Management & AI Builder
task_id: 3.3
---

## Context
Enable dynamic variables in scripts like {first_name}, {church_name}, etc.

## Prerequisites
- Tasks 2.1d complete (VAPI integration uses variables)

## Implementation Steps

### 1. Create shared utility function

Create `supabase/functions/_shared/substitute-variables.ts`:

```typescript
export interface SubstitutionContext {
  first_name?: string;
  last_name?: string;
  church_name?: string;
  pastor_name?: string;
  event_name?: string;
  event_date?: string;
  day_of_week?: string;
  membership_duration?: string;
}

export function substituteVariables(
  template: string,
  context: SubstitutionContext
): string {
  let result = template;
  
  // Replace all supported variables
  const variables: Record<string, string | undefined> = {
    first_name: context.first_name,
    last_name: context.last_name,
    church_name: context.church_name,
    pastor_name: context.pastor_name,
    event_name: context.event_name,
    event_date: context.event_date,
    day_of_week: context.day_of_week || new Date().toLocaleDateString("en-US", { weekday: "long" }),
    membership_duration: context.membership_duration,
  };

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{${key}\\}`, "gi");
    result = result.replace(pattern, value || "");
  }

  return result;
}

export function calculateMembershipDuration(createdAt: Date): string {
  const now = new Date();
  const months = (now.getFullYear() - createdAt.getFullYear()) * 12 
    + (now.getMonth() - createdAt.getMonth());
  
  if (months < 1) return "less than a month";
  if (months === 1) return "1 month";
  if (months < 12) return `${months} months`;
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return years === 1 ? "1 year" : `${years} years`;
  }
  return `${years} year${years > 1 ? "s" : ""} and ${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`;
}
```

### 2. Update send-group-call to use substitution

```typescript
import { substituteVariables, calculateMembershipDuration } from "../_shared/substitute-variables.ts";

// When preparing the VAPI call:
const context = {
  first_name: person.first_name,
  last_name: person.last_name,
  church_name: organization.name,
  pastor_name: organization.pastor_name || "Pastor",
  event_name: campaign?.event_name,
  event_date: campaign?.event_date,
  membership_duration: calculateMembershipDuration(new Date(person.created_at)),
};

const processedPrompt = substituteVariables(script.prompt, context);
```

### 3. Update auto-call-trigger to use substitution

Same pattern as above.

### 4. Create VariableReference component

Create `src/components/communications/VariableReference.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_VARIABLES = [
  { name: "{first_name}", description: "Person's first name" },
  { name: "{last_name}", description: "Person's last name" },
  { name: "{church_name}", description: "Your church/organization name" },
  { name: "{pastor_name}", description: "Lead pastor's name" },
  { name: "{event_name}", description: "Campaign event name (if applicable)" },
  { name: "{event_date}", description: "Campaign event date (if applicable)" },
  { name: "{day_of_week}", description: "Current day (Monday, Tuesday, etc.)" },
  { name: "{membership_duration}", description: "How long they've been a member" },
];

export function VariableReference() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Available Variables</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {AVAILABLE_VARIABLES.map((v) => (
            <div key={v.name} className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {v.name}
              </Badge>
              <span className="text-xs text-muted-foreground">{v.description}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5. Add VariableReference to script editor

In Settings.tsx or wherever scripts are edited:

```tsx
import { VariableReference } from "@/components/communications/VariableReference";

// In the script editing dialog:
<div className="grid grid-cols-3 gap-4">
  <div className="col-span-2">
    <Textarea
      value={scriptPrompt}
      onChange={(e) => setScriptPrompt(e.target.value)}
      className="min-h-[300px]"
    />
  </div>
  <div>
    <VariableReference />
  </div>
</div>
```

## Verification
1. Create a script with variables like "Hi {first_name}, this is {church_name} calling"
2. Make a test call
3. Verify the variables are replaced with actual values

## On Completion
Update `activity.md` and mark task 3.3 as `[x]`
