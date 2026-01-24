---
description: Create PricingPage and Billing settings UI
epic: Epic 4 - Multi-Tenancy, Onboarding & Billing
task_id: 4.2d
---

## Context
Create the pricing page and billing section in settings.

## Prerequisites
- Tasks 4.2a, 4.2b, 4.2c complete

## Implementation Steps

### 1. Create PricingPage.tsx

Create `src/pages/PricingPage.tsx`:

```tsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

const PLANS = [
  {
    tier: "starter",
    name: "Starter",
    monthlyPrice: 197,
    annualPrice: 167,
    minutes: 500,
    phone: "Shared",
    features: [
      "500 AI calling minutes/month",
      "Unlimited SMS",
      "Basic call scripts",
      "Email support",
    ],
  },
  {
    tier: "growth",
    name: "Growth",
    monthlyPrice: 397,
    annualPrice: 337,
    minutes: 1500,
    phone: "Shared",
    popular: true,
    features: [
      "1,500 AI calling minutes/month",
      "Unlimited SMS",
      "AI Script Builder",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    monthlyPrice: 797,
    annualPrice: 677,
    minutes: 5000,
    phone: "Dedicated",
    features: [
      "5,000 AI calling minutes/month",
      "Dedicated phone number",
      "Custom voice cloning",
      "API access",
      "Dedicated success manager",
    ],
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { currentOrganization } = useAuthStore();

  const handleSelectPlan = async (tier: string) => {
    setLoading(tier);
    
    const { data, error } = await supabase.functions.invoke("stripe-checkout", {
      body: {
        tier,
        billing_cycle: annual ? "annual" : "monthly",
        organization_id: currentOrganization?.id,
      },
    });

    if (error) {
      console.error("Checkout error:", error);
    } else if (data?.url) {
      window.location.href = data.url;
    }
    
    setLoading(null);
  };

  return (
    <div className="container py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Start with a 14-day free trial. No credit card required.
        </p>
        <div className="flex items-center justify-center gap-4">
          <span className={annual ? "text-muted-foreground" : ""}>Monthly</span>
          <Switch checked={annual} onCheckedChange={setAnnual} />
          <span className={!annual ? "text-muted-foreground" : ""}>
            Annual <Badge variant="secondary" className="ml-1">Save 15%</Badge>
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {PLANS.map((plan) => (
          <Card 
            key={plan.tier} 
            className={plan.popular ? "border-primary shadow-lg relative" : ""}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">
                  ${annual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                /month
                {annual && (
                  <span className="text-sm ml-2">
                    (${plan.annualPrice * 12}/year)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSelectPlan(plan.tier)}
                disabled={loading === plan.tier}
              >
                {loading === plan.tier ? "Loading..." : "Start Free Trial"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 2. Add Billing tab to Settings

In Settings.tsx, add a Billing tab:

```tsx
import { Progress } from "@/components/ui/progress";

// In the Billing tab content:
function BillingTab() {
  const { currentOrganization } = useAuthStore();
  const [minuteUsage, setMinuteUsage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMinuteUsage();
  }, [currentOrganization]);

  const fetchMinuteUsage = async () => {
    const { data } = await supabase
      .from("minute_usage")
      .select("*")
      .eq("organization_id", currentOrganization?.id)
      .order("billing_period_start", { ascending: false })
      .limit(1)
      .single();
    setMinuteUsage(data);
  };

  const handleManageBilling = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("stripe-portal", {
      body: { organization_id: currentOrganization?.id },
    });
    if (data?.url) {
      window.location.href = data.url;
    }
    setLoading(false);
  };

  const tier = currentOrganization?.subscription_tier || "trial";
  const isTrial = tier === "trial";
  const usagePercent = minuteUsage 
    ? (minuteUsage.minutes_used / minuteUsage.minutes_included) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold capitalize">{tier}</p>
              {isTrial && currentOrganization?.trial_ends_at && (
                <p className="text-sm text-muted-foreground">
                  Trial ends: {new Date(currentOrganization.trial_ends_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button onClick={() => window.location.href = "/pricing"}>
              {isTrial ? "Upgrade Plan" : "Change Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minutes Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{minuteUsage?.minutes_used?.toFixed(0) || 0} used</span>
              <span>{minuteUsage?.minutes_included || 0} included</span>
            </div>
            <Progress 
              value={usagePercent} 
              className={usagePercent > 80 ? "bg-red-100" : ""}
            />
            {usagePercent > 80 && (
              <p className="text-sm text-red-500">
                You're approaching your minute limit
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {!isTrial && (
        <Button variant="outline" onClick={handleManageBilling} disabled={loading}>
          {loading ? "Loading..." : "Manage Billing"}
        </Button>
      )}
    </div>
  );
}
```

### 3. Add route for PricingPage

```tsx
<Route path="/pricing" element={<PricingPage />} />
```

## Verification
1. Navigate to /pricing
2. Verify all 3 tiers display correctly
3. Toggle annual/monthly and verify prices change
4. Click plan button and verify Stripe checkout opens
5. Navigate to Settings → Billing
6. Verify usage bar shows correctly
7. Test "Manage Billing" opens Stripe portal

## On Completion
Update `activity.md` and mark task 4.2d as `[x]`
