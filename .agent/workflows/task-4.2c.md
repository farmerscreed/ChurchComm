---
description: Add subscription fields to organizations and create migration
epic: Epic 4 - Multi-Tenancy, Onboarding & Billing
task_id: 4.2c
---

## Context
Add all necessary subscription tracking fields to the organizations table.

## Prerequisites
- Task 4.2a, 4.2b complete

## Implementation Steps

### 1. Create migration for subscription fields

Create migration `supabase/migrations/YYYYMMDDHHMMSS_add_subscription_fields.sql`:

```sql
-- Subscription tracking fields
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR,
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR DEFAULT 'trial' 
  CHECK (subscription_tier IN ('trial', 'starter', 'growth', 'enterprise', 'cancelled')),
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR 
  CHECK (billing_cycle IN ('monthly', 'annual')),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'trialing'
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled')),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS credit_card_on_file BOOLEAN DEFAULT FALSE;

-- Set trial_ends_at for existing orgs without it
UPDATE organizations 
SET trial_ends_at = created_at + INTERVAL '14 days'
WHERE trial_ends_at IS NULL;

-- Update minute_usage based on tier
CREATE OR REPLACE FUNCTION get_minutes_for_tier(tier VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  CASE tier
    WHEN 'trial' THEN RETURN 15;
    WHEN 'starter' THEN RETURN 500;
    WHEN 'growth' THEN RETURN 1500;
    WHEN 'enterprise' THEN RETURN 5000;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update minute_usage when tier changes
CREATE OR REPLACE FUNCTION handle_tier_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
    -- Only update if there's an active billing period
    UPDATE minute_usage
    SET minutes_included = get_minutes_for_tier(NEW.subscription_tier)
    WHERE organization_id = NEW.id
      AND billing_period_end > NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_tier_change ON organizations;
CREATE TRIGGER on_tier_change
  AFTER UPDATE OF subscription_tier ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION handle_tier_change();
```

### 2. Create index for lookups

```sql
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer 
  ON organizations(stripe_customer_id);
  
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription 
  ON organizations(stripe_subscription_id);
```

### 3. Update TypeScript types

In relevant type definitions:

```typescript
interface Organization {
  id: string;
  name: string;
  // ... existing fields
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_tier: 'trial' | 'starter' | 'growth' | 'enterprise' | 'cancelled';
  billing_cycle?: 'monthly' | 'annual';
  subscription_status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  trial_ends_at?: string;
  credit_card_on_file: boolean;
}
```

### 4. Update minute limits based on trial/card status

```typescript
// When creating minute_usage for trial:
const minutesIncluded = creditCardOnFile ? 30 : 15;
```

## Verification
1. Run migration
2. Check fields exist on organizations table
3. Verify existing orgs have trial_ends_at set
4. Test tier change triggers minute update

## On Completion
Update `activity.md` and mark task 4.2c as `[x]`
