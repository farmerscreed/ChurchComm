---
description: Add is_demo flag and auto-clear behavior
epic: Epic 7 - Demo Mode & Guided Tour
task_id: 7.1b
---

## Context
Add demo flags to relevant tables and set up auto-clearing when real data is added.

## Prerequisites
- Task 7.1a complete
- Demo cleanup trigger may exist from Epic 1

## Implementation Steps

### 1. Create migration for is_demo columns

Create `supabase/migrations/YYYYMMDDHHMMSS_add_is_demo_flags.sql`:

```sql
-- Add is_demo flag to relevant tables
ALTER TABLE people ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE call_scripts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE calling_campaigns ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE call_attempts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE escalation_alerts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
```

### 2. Create or verify demo cleanup trigger

```sql
-- Function to clear all demo data for an org
CREATE OR REPLACE FUNCTION clear_demo_data(org_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM escalation_alerts WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM call_attempts WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM calling_campaigns WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM group_members WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM groups WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM call_scripts WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM people WHERE organization_id = org_id AND is_demo = true;
  
  RAISE NOTICE 'Cleared demo data for org %', org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: when first real person is added, clear demo data
CREATE OR REPLACE FUNCTION on_first_real_person()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for non-demo people
  IF NEW.is_demo = false OR NEW.is_demo IS NULL THEN
    -- Check if this org still has demo data
    IF EXISTS (SELECT 1 FROM people WHERE organization_id = NEW.organization_id AND is_demo = true LIMIT 1) THEN
      PERFORM clear_demo_data(NEW.organization_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_on_first_real_person ON people;
CREATE TRIGGER trigger_on_first_real_person
  AFTER INSERT ON people
  FOR EACH ROW
  EXECUTE FUNCTION on_first_real_person();
```

### 3. Call seed-demo-data from onboarding

In `OnboardingPage.tsx`, after successful completion:

```tsx
const handleComplete = async () => {
  setLoading(true);
  
  // Update organization...
  const { error } = await supabase
    .from("organizations")
    .update({ /* ... */ })
    .eq("id", currentOrganization?.id);

  if (!error) {
    // Mark onboarding complete
    await supabase
      .from("organization_members")
      .update({ onboarding_completed: true })
      .eq("organization_id", currentOrganization?.id)
      .eq("user_id", user?.id);

    // Seed demo data
    await supabase.functions.invoke("seed-demo-data", {
      body: { organization_id: currentOrganization?.id },
    });

    navigate("/dashboard");
  }
  
  setLoading(false);
};
```

### 4. Add demo badge to UI

Create `src/components/ui/DemoBadge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export function DemoBadge() {
  return (
    <Badge variant="secondary" className="text-xs">
      <Info className="h-3 w-3 mr-1" />
      Demo
    </Badge>
  );
}
```

### 5. Show demo indicator on records

In PeopleDirectory, GroupList, etc.:

```tsx
{person.is_demo && <DemoBadge />}
```

### 6. Add demo notice banner

```tsx
function DemoDataNotice() {
  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
      <p className="text-sm text-blue-800">
        👋 <strong>Sample data loaded.</strong> This demo data will be automatically 
        cleared when you add your first real member.
      </p>
    </div>
  );
}

// Show in Dashboard or People page when demo data exists
{hasDemoData && <DemoDataNotice />}
```

### 7. Check for demo data

```tsx
const [hasDemoData, setHasDemoData] = useState(false);

useEffect(() => {
  const checkDemoData = async () => {
    const { count } = await supabase
      .from("people")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", currentOrganization?.id)
      .eq("is_demo", true);
    
    setHasDemoData((count || 0) > 0);
  };
  checkDemoData();
}, [currentOrganization]);
```

## Verification
1. Complete onboarding
2. Verify demo data appears
3. Verify demo badges show on records
4. Verify demo notice banner appears
5. Add a real person
6. Verify all demo data is deleted
7. Verify banner disappears

## On Completion
Update `activity.md` and mark task 7.1b as `[x]`
