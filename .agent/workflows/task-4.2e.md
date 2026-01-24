---
description: Implement read-only mode for lapsed subscriptions
epic: Epic 4 - Multi-Tenancy, Onboarding & Billing
task_id: 4.2e
---

## Context
When a subscription lapses, the org should enter read-only mode.

## Prerequisites
- Tasks 4.2a-4.2d complete

## Implementation Steps

### 1. Create useSubscription hook

Create `src/hooks/useSubscription.ts`:

```typescript
import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";

interface SubscriptionState {
  tier: string;
  isActive: boolean;
  isReadOnly: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  daysRemaining: number | null;
}

export function useSubscription(): SubscriptionState {
  const { currentOrganization } = useAuthStore();

  return useMemo(() => {
    const tier = currentOrganization?.subscription_tier || "trial";
    const status = currentOrganization?.subscription_status || "trialing";
    const trialEndsAt = currentOrganization?.trial_ends_at 
      ? new Date(currentOrganization.trial_ends_at) 
      : null;

    const now = new Date();
    const isTrial = tier === "trial";
    const trialExpired = trialEndsAt && trialEndsAt < now;
    
    // Subscription is active if:
    // - It's a paid tier with active status, OR
    // - It's a trial that hasn't expired
    const isActive = 
      (["starter", "growth", "enterprise"].includes(tier) && status === "active") ||
      (isTrial && !trialExpired);

    const isReadOnly = 
      tier === "cancelled" || 
      status === "cancelled" ||
      (isTrial && trialExpired);

    const daysRemaining = trialEndsAt 
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      tier,
      isActive,
      isReadOnly,
      isTrial,
      trialEndsAt,
      daysRemaining,
    };
  }, [currentOrganization]);
}
```

### 2. Create ReadOnlyBanner component

Create `src/components/layout/ReadOnlyBanner.tsx`:

```tsx
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function ReadOnlyBanner() {
  const navigate = useNavigate();

  return (
    <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>Your subscription has lapsed. Reactivate to resume services.</span>
      </div>
      <Button 
        variant="secondary" 
        size="sm"
        onClick={() => navigate("/pricing")}
      >
        Reactivate
      </Button>
    </div>
  );
}
```

### 3. Create TrialBanner component

```tsx
export function TrialBanner({ daysRemaining }: { daysRemaining: number }) {
  const navigate = useNavigate();

  if (daysRemaining > 7) return null;

  return (
    <div className="bg-yellow-500 text-white px-4 py-2 flex items-center justify-between">
      <span>
        {daysRemaining === 0 
          ? "Your trial ends today!" 
          : `${daysRemaining} day${daysRemaining > 1 ? "s" : ""} left in your trial`}
      </span>
      <Button variant="secondary" size="sm" onClick={() => navigate("/pricing")}>
        Upgrade Now
      </Button>
    </div>
  );
}
```

### 4. Add banners to AppLayout

```tsx
import { useSubscription } from "@/hooks/useSubscription";
import { ReadOnlyBanner } from "@/components/layout/ReadOnlyBanner";
import { TrialBanner } from "@/components/layout/TrialBanner";

export function AppLayout() {
  const { isReadOnly, isTrial, daysRemaining } = useSubscription();

  return (
    <div className="min-h-screen">
      {isReadOnly && <ReadOnlyBanner />}
      {isTrial && daysRemaining !== null && <TrialBanner daysRemaining={daysRemaining} />}
      {/* Rest of layout */}
    </div>
  );
}
```

### 5. Disable actions in read-only mode

Create a wrapper or update components to check isReadOnly:

```tsx
// In Communications.tsx and other action pages:
const { isReadOnly } = useSubscription();

// Disable buttons
<Button disabled={isReadOnly}>Create Campaign</Button>

// Or show message
{isReadOnly && (
  <Card className="bg-muted">
    <CardContent className="text-center py-8">
      <p>Your subscription has lapsed. Please reactivate to create new campaigns.</p>
      <Button className="mt-4" onClick={() => navigate("/pricing")}>
        View Plans
      </Button>
    </CardContent>
  </Card>
)}
```

### 6. Actions to disable in read-only mode

- Creating campaigns (call or SMS)
- Initiating calls
- Sending SMS
- Creating/editing scripts
- Adding people (optional - could allow this)
- Editing settings that affect billing

### 7. Update edge functions to check subscription

```typescript
// At the start of send-group-call, send-sms, etc:
const { data: org } = await supabase
  .from("organizations")
  .select("subscription_tier, subscription_status, trial_ends_at")
  .eq("id", organizationId)
  .single();

const isReadOnly = 
  org.subscription_tier === "cancelled" ||
  org.subscription_status === "cancelled" ||
  (org.subscription_tier === "trial" && new Date(org.trial_ends_at) < new Date());

if (isReadOnly) {
  return new Response(JSON.stringify({ 
    error: "Subscription inactive. Please reactivate to continue." 
  }), {
    status: 403,
    headers: corsHeaders,
  });
}
```

## Verification
1. Create an org with expired trial
2. Verify ReadOnlyBanner appears
3. Verify campaign creation is disabled
4. Verify edge functions reject calls
5. Verify all data is still viewable
6. Upgrade subscription and verify access restored

## On Completion
Update `activity.md` and mark task 4.2e as `[x]`
