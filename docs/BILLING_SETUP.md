# 🔧 ChurchComm Billing Setup Guide

This guide will help you set up the complete billing system for ChurchComm. Follow these steps in order.

---

## 📋 Prerequisites

- Stripe account (Test mode for development, Live mode for production)
- Supabase project with Edge Functions enabled
- Access to environment variables configuration

---

## Step 1: Create Stripe Products & Recurring Prices

The MCP created products but with one-time prices. You need to create **recurring** prices in Stripe Dashboard:

### Go to Stripe Dashboard → Products

#### Starter Plan (prod_Tr8BcIiSE7Qna7)
1. Click on "ChurchComm Starter"
2. Add a new price:
   - **Monthly**: $49/month, Recurring, Billing period: Monthly
   - Click "Add another price"
   - **Annual**: $490/year, Recurring, Billing period: Yearly

#### Growth Plan (prod_Tr8BSIZXKWqVB8)
1. Click on "ChurchComm Growth"
2. Add prices:
   - **Monthly**: $119/month, Recurring, Billing period: Monthly
   - **Annual**: $1,190/year, Recurring, Billing period: Yearly

#### Enterprise Plan (prod_Tr8BC83XZmiAg8)
1. Click on "ChurchComm Enterprise"
2. Add prices:
   - **Monthly**: $299/month, Recurring, Billing period: Monthly
   - **Annual**: $2,990/year, Recurring, Billing period: Yearly

### Copy the Price IDs
After creating, you'll have 6 price IDs that look like `price_xxxxxxxxxxxxx`. Note them down:

| Tier | Billing | Price ID |
|------|---------|----------|
| Starter | Monthly | `price_XXXXXXXXX` |
| Starter | Annual | `price_XXXXXXXXX` |
| Growth | Monthly | `price_XXXXXXXXX` |
| Growth | Annual | `price_XXXXXXXXX` |
| Enterprise | Monthly | `price_XXXXXXXXX` |
| Enterprise | Annual | `price_XXXXXXXXX` |

---

## Step 2: Set Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your Supabase Edge Function URL:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

---

## Step 3: Configure Customer Portal

1. Go to Stripe Dashboard → Settings → Billing → Customer portal
2. Enable the following features:
   - ✅ Invoices (view invoice history)
   - ✅ Customer information (update email)
   - ✅ Payment methods (update payment method)
   - ✅ Subscriptions (cancel, change plans)
3. Configure cancellation settings:
   - Allow customers to cancel
   - Prorate when switching plans
4. Save changes

---

## Step 4: Configure Supabase Secrets

Run these commands to set your Stripe secrets in Supabase:

```bash
# Set Stripe API key (from Stripe Dashboard → Developers → API keys)
supabase secrets set STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXX

# Set Webhook signing secret (from Step 2)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX

# Set Price IDs (from Step 1)
supabase secrets set STRIPE_PRICE_STARTER_MONTHLY=price_XXXXXXXX
supabase secrets set STRIPE_PRICE_STARTER_ANNUAL=price_XXXXXXXX
supabase secrets set STRIPE_PRICE_GROWTH_MONTHLY=price_XXXXXXXX
supabase secrets set STRIPE_PRICE_GROWTH_ANNUAL=price_XXXXXXXX
supabase secrets set STRIPE_PRICE_ENTERPRISE_MONTHLY=price_XXXXXXXX
supabase secrets set STRIPE_PRICE_ENTERPRISE_ANNUAL=price_XXXXXXXX

# Set your app URL for redirects
supabase secrets set APP_URL=https://your-app-domain.com
```

For local development, create/update `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX
STRIPE_PRICE_STARTER_MONTHLY=price_XXXXXXXX
STRIPE_PRICE_STARTER_ANNUAL=price_XXXXXXXX
STRIPE_PRICE_GROWTH_MONTHLY=price_XXXXXXXX
STRIPE_PRICE_GROWTH_ANNUAL=price_XXXXXXXX
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_XXXXXXXX
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_XXXXXXXX
APP_URL=http://localhost:8080
```

---

## Step 5: Deploy Edge Functions

Deploy the Stripe edge functions to Supabase:

```bash
supabase functions deploy stripe-checkout
supabase functions deploy stripe-portal
supabase functions deploy stripe-webhook
```

---

## Step 6: Apply Database Migration

Ensure the subscription fields exist in the organizations table:

```bash
supabase db push
```

Or run the migration manually in Supabase SQL Editor:

```sql
-- Add subscription tracking fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS minutes_included INTEGER DEFAULT 15;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0;
```

---

## Step 7: Test the Integration

### Test Checkout Flow:
1. Log in to ChurchComm as an admin
2. Go to /pricing page
3. Click "Start Free Trial" on any plan
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify redirect to /settings?billing=success

### Test Customer Portal:
1. Go to Settings → Billing
2. Click "Manage Billing"
3. Should open Stripe Customer Portal
4. Test updating payment method

### Test Webhook:
1. In Stripe Dashboard → Developers → Webhooks
2. Select your endpoint
3. Click "Send test webhook"
4. Send `checkout.session.completed`
5. Check Supabase logs for processing

---

## 🔍 Troubleshooting

### "No checkout URL returned"
- Check that STRIPE_SECRET_KEY is set correctly
- Verify price IDs are correct recurring prices

### "Invalid signature"
- Ensure STRIPE_WEBHOOK_SECRET matches the webhook endpoint
- Make sure you're using the correct webhook secret

### "Only admins can manage billing"
- User must have `role = 'admin'` in organization_members

### Portal shows "No billing account"
- The organization needs a stripe_customer_id
- Complete a checkout first to create the customer

---

## 📊 Subscription Status Values

| Status | Description |
|--------|-------------|
| `trialing` | In 14-day free trial |
| `active` | Paid and active |
| `past_due` | Payment failed, grace period |
| `canceled` | Subscription ended |

---

## 🔐 Security Notes

1. **Never expose** STRIPE_SECRET_KEY in frontend code
2. **Always verify** webhook signatures before processing
3. **Use test keys** (`sk_test_`) for development
4. **Switch to live keys** (`sk_live_`) for production

---

## ✅ Verification Checklist

- [ ] 3 products created in Stripe
- [ ] 6 recurring prices created (monthly + annual for each)
- [ ] Webhook endpoint configured with correct events
- [ ] Customer Portal enabled
- [ ] All secrets set in Supabase
- [ ] Edge functions deployed
- [ ] Database migration applied
- [ ] Test checkout completed successfully
- [ ] Test portal access works
- [ ] Webhook events processing correctly

---

**Created:** 2026-01-25
**Last Updated:** 2026-01-25
