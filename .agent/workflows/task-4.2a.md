---
description: Create Stripe checkout and portal edge functions
epic: Epic 4 - Multi-Tenancy, Onboarding & Billing
task_id: 4.2a
---

## Context
Set up Stripe integration for subscription management with checkout and customer portal.

## Prerequisites
- Stripe account with products/prices created
- Stripe API keys available

## Implementation Steps

### 1. Create stripe-checkout edge function

Create `supabase/functions/stripe-checkout/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

// Map tier + billing cycle to Stripe price IDs
const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: "price_starter_monthly", // Replace with actual price IDs
    annual: "price_starter_annual",
  },
  growth: {
    monthly: "price_growth_monthly",
    annual: "price_growth_annual",
  },
  enterprise: {
    monthly: "price_enterprise_monthly",
    annual: "price_enterprise_annual",
  },
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

    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tier, billing_cycle, organization_id } = await req.json();

    // Get or create Stripe customer
    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id, name")
      .eq("id", organization_id)
      .single();

    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org?.name,
        metadata: { organization_id },
      });
      customerId = customer.id;

      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", organization_id);
    }

    // Create checkout session
    const priceId = PRICE_IDS[tier]?.[billing_cycle];
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Invalid tier or billing cycle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { organization_id, tier, billing_cycle },
      },
      success_url: `${Deno.env.get("APP_URL")}/settings?billing=success`,
      cancel_url: `${Deno.env.get("APP_URL")}/pricing`,
      metadata: { organization_id, tier, billing_cycle },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 2. Create stripe-portal edge function

Create `supabase/functions/stripe-portal/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id } = await req.json();

    const { data: org } = await supabase
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", organization_id)
      .single();

    if (!org?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "No billing account found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${Deno.env.get("APP_URL")}/settings`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe portal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 3. Add stripe_customer_id to organizations

```sql
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR;
```

## Environment Variables
- `STRIPE_SECRET_KEY`
- `APP_URL`

## Verification
1. Call stripe-checkout with valid tier/cycle
2. Verify Stripe checkout session created
3. Complete checkout in Stripe test mode
4. Call stripe-portal
5. Verify portal session opens

## On Completion
Update `activity.md` and mark task 4.2a as `[x]`
