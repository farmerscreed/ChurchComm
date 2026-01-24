---
description: Implement guided tour for new users
epic: Epic 7 - Demo Mode & Guided Tour
task_id: 7.2
---

## Context
Create a guided tour that introduces new users to ChurchComm features.

## Prerequisites
- Tasks 7.1a and 7.1b complete

## Implementation Steps

### 1. Install react-joyride

// turbo
```bash
npm install react-joyride
```

### 2. Create GuidedTour component

Create `src/components/onboarding/GuidedTour.tsx`:

```tsx
import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

const TOUR_STEPS: Step[] = [
  {
    target: '[data-tour="dashboard"]',
    content: "Welcome to ChurchComm! This is your command center where you can see key metrics at a glance.",
    disableBeacon: true,
    placement: "center",
  },
  {
    target: '[data-tour="people-nav"]',
    content: "Manage your congregation here. Add members, visitors, and track their journey.",
    placement: "right",
  },
  {
    target: '[data-tour="communications-nav"]',
    content: "Launch AI voice calls and SMS campaigns to reach your members.",
    placement: "right",
  },
  {
    target: '[data-tour="settings-nav"]',
    content: "Configure calling preferences, manage your team, and set up call scripts.",
    placement: "right",
  },
  {
    target: '[data-tour="minute-usage"]',
    content: "Track your AI calling minutes here. Your plan includes a set number of minutes each month.",
    placement: "bottom",
  },
];

export function GuidedTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { user, currentOrganization } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkTourStatus();
  }, [user, currentOrganization]);

  const checkTourStatus = async () => {
    if (!user || !currentOrganization) return;

    // Check if tour completed
    const { data } = await supabase
      .from("organization_members")
      .select("tour_completed")
      .eq("user_id", user.id)
      .eq("organization_id", currentOrganization.id)
      .single();

    if (data && !data.tour_completed) {
      // Small delay to ensure page is loaded
      setTimeout(() => setRun(true), 500);
    }
  };

  const handleCallback = async (data: CallBackProps) => {
    const { status, index, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      
      // Mark tour as completed
      await supabase
        .from("organization_members")
        .update({ tour_completed: true })
        .eq("user_id", user?.id)
        .eq("organization_id", currentOrganization?.id);
    }

    if (type === "step:after") {
      setStepIndex(index + 1);
    }
  };

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      stepIndex={stepIndex}
      callback={handleCallback}
      continuous
      showProgress
      showSkipButton
      styles={{
        options: {
          primaryColor: "#6366f1", // Indigo-500
          textColor: "#1f2937",
          backgroundColor: "#ffffff",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 16,
        },
        buttonNext: {
          borderRadius: 6,
          padding: "8px 16px",
        },
        buttonBack: {
          marginRight: 8,
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
}
```

### 3. Add data-tour attributes to components

In `Sidebar.tsx` or navigation:
```tsx
<NavItem 
  data-tour="people-nav" 
  to="/people" 
  icon={Users}
>
  People
</NavItem>

<NavItem 
  data-tour="communications-nav" 
  to="/communications" 
  icon={MessageSquare}
>
  Communications
</NavItem>

<NavItem 
  data-tour="settings-nav" 
  to="/settings" 
  icon={Settings}
>
  Settings
</NavItem>
```

In `Dashboard.tsx`:
```tsx
<div data-tour="dashboard">
  <h1>Dashboard</h1>
</div>

<MinuteUsageWidget data-tour="minute-usage" ... />
```

### 4. Add tour_completed column

```sql
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE;
```

### 5. Add GuidedTour to AppLayout

```tsx
import { GuidedTour } from "@/components/onboarding/GuidedTour";

export function AppLayout() {
  return (
    <>
      <GuidedTour />
      {/* Rest of layout */}
    </>
  );
}
```

### 6. Add "Restart Tour" option

In Settings or Help menu:

```tsx
const handleRestartTour = async () => {
  await supabase
    .from("organization_members")
    .update({ tour_completed: false })
    .eq("user_id", user?.id)
    .eq("organization_id", currentOrganization?.id);
  
  // Force page reload to trigger tour
  window.location.reload();
};

<Button variant="ghost" onClick={handleRestartTour}>
  <HelpCircle className="mr-2 h-4 w-4" />
  Restart Tour
</Button>
```

## Verification
1. Complete onboarding as new user
2. Verify tour starts automatically
3. Navigate through all steps
4. Verify "Skip Tour" works
5. Verify tour doesn't restart on next login
6. Test "Restart Tour" option

## On Completion
Update `activity.md` and mark task 7.2 as `[x]`

## Final Verification
At this point, all tasks from Epics 1-7 should be complete!

Run through the entire app flow:
1. Sign up → Onboarding → Demo data seeded
2. Tour starts → Navigate through features
3. Add real person → Demo data cleared
4. Create campaign → Calls scheduled
5. View dashboard → All widgets working
6. Manage subscription → Billing functional
