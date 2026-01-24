---
description: Wire onboarding to database and add routing
epic: Epic 4 - Multi-Tenancy, Onboarding & Billing
task_id: 4.1b
---

## Context
Connect the onboarding wizard to the database and set up routing logic.

## Prerequisites
- Task 4.1a complete

## Implementation Steps

### 1. Create migration for new org fields

```sql
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS estimated_size VARCHAR,
ADD COLUMN IF NOT EXISTS preferred_channels TEXT[];

ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
```

### 2. Add route to App.tsx

```tsx
import OnboardingPage from "@/pages/OnboardingPage";

// In routes:
<Route path="/onboarding" element={<OnboardingPage />} />
```

### 3. Create onboarding redirect logic

In `AppLayout.tsx` or a route guard:

```tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/integrations/supabase/client";

export function useOnboardingRedirect() {
  const { user, currentOrganization } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || !currentOrganization) return;
      
      // Skip if already on onboarding page
      if (location.pathname === "/onboarding") return;

      // Check if onboarding is completed
      const { data } = await supabase
        .from("organization_members")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrganization.id)
        .single();

      if (data && !data.onboarding_completed) {
        navigate("/onboarding");
      }
    };

    checkOnboarding();
  }, [user, currentOrganization, location.pathname]);
}
```

### 4. Use the hook in AppLayout

```tsx
export function AppLayout() {
  useOnboardingRedirect();
  
  // ... rest of layout
}
```

### 5. Handle new user signup flow

In the signup handler (or handle_new_user trigger), set initial values:

```sql
-- Update the handle_new_user trigger to set onboarding_completed = false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create organization
  INSERT INTO public.organizations (id, name)
  VALUES (gen_random_uuid(), 'My Church')
  RETURNING id INTO org_id;

  -- Add user as admin with onboarding incomplete
  INSERT INTO public.organization_members (user_id, organization_id, role, onboarding_completed)
  VALUES (NEW.id, org_id, 'admin', false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6. Redirect to dashboard after onboarding

Already handled in OnboardingPage.tsx - after successful update, navigate to /dashboard.

### 7. Seed demo data after onboarding (optional, for later)

This will be done in Epic 7.

## Verification
1. Create new user account
2. Verify redirect to /onboarding
3. Complete onboarding
4. Verify organization updated with correct values
5. Verify onboarding_completed = true
6. Verify user lands on dashboard
7. Verify subsequent logins go directly to dashboard

## On Completion
Update `activity.md` and mark task 4.1b as `[x]`
