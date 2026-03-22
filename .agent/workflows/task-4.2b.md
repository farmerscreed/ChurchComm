---
description: Create Stripe webhook handler edge function
epic: Epic 4 - Multi-Tenancy, Onboarding & Billing
task_id: 4.2b
---

## Context
Handle Stripe webhook events to sync subscription status with the database.

## Prerequisites
- Task 4.2a complete
- Stripe webhook endpoint configured

## Implementation Steps

### 1. Create stripe-webhook edge function

Create `supabase/functions/stripe-webhook/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
    });
  }

  console.log("Received Stripe event:", event.type);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.organization_id;
  const tier = session.metadata?.tier;
  const billingCycle = session.metadata?.billing_cycle;

  if (!orgId) return;

  await supabase.from("organizations").update({
    stripe_subscription_id: session.subscription as string,
    subscription_tier: tier,
    billing_cycle: billingCycle,
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    credit_card_on_file: session.payment_status === "paid",
  }).eq("id", orgId);

  console.log(`Checkout complete for org ${orgId}: ${tier} ${billingCycle}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find org by customer ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id, subscription_tier")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!org) return;

  // Reset minute usage for new billing period
  const minutesIncluded = getMinutesForTier(org.subscription_tier);
  const billingPeriodStart = new Date();
  const billingPeriodEnd = new Date();
  billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

  await supabase.from("minute_usage").insert({
    organization_id: org.id,
    billing_period_start: billingPeriodStart.toISOString(),
    billing_period_end: billingPeriodEnd.toISOString(),
    minutes_used: 0,
    minutes_included: minutesIncluded,
  });

  console.log(`Invoice paid for org ${org.id}, reset minutes to ${minutesIncluded}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  await supabase
    .from("organizations")
    .update({ subscription_status: "past_due" })
    .eq("stripe_customer_id", customerId);

  console.log(`Payment failed for customer ${customerId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.organization_id;
  
  // Also try to find by subscription ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  const targetOrgId = orgId || org?.id;
  if (!targetOrgId) return;

  await supabase.from("organizations").update({
    subscription_tier: "cancelled",
    stripe_subscription_id: null,
  }).eq("id", targetOrgId);

  console.log(`Subscription cancelled for org ${targetOrgId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (!org) return;

  // Get tier from the price metadata
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId);

  await supabase.from("organizations").update({
    subscription_tier: tier,
    subscription_status: subscription.status,
  }).eq("id", org.id);

  console.log(`Subscription updated for org ${org.id}: ${tier}`);
}

function getMinutesForTier(tier: string): number {
  switch (tier) {
    case "starter": return 500;
    case "growth": return 1500;
    case "enterprise": return 5000;
    case "trial": return 15;
    default: return 0;
  }
}

function getTierFromPriceId(priceId: string): string {
  // Map price IDs to tiers - replace with actual mappings
  if (priceId.includes("starter")) return "starter";
  if (priceId.includes("growth")) return "growth";
  if (priceId.includes("enterprise")) return "enterprise";
  return "starter";
}
```

## Environment Variables
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Stripe Webhook Configuration
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://<project>.supabase.co/functions/v1/stripe-webhook`
3. Select events: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted, customer.subscription.updated
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## Verification
Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
```

## On Completion
Update `activity.md` and mark task 4.2b as `[x]`
