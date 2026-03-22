-- Add subscription tracking fields to organizations table
-- These fields enable proper subscription management and billing tracking

-- Add stripe_subscription_id if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN stripe_subscription_id TEXT;
    COMMENT ON COLUMN organizations.stripe_subscription_id IS 'Stripe subscription ID for this organization';
  END IF;
END $$;

-- Add trial_ends_at if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN trial_ends_at TIMESTAMPTZ;
    COMMENT ON COLUMN organizations.trial_ends_at IS 'When the trial period ends';
  END IF;
END $$;

-- Add current_period_end if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE organizations ADD COLUMN current_period_end TIMESTAMPTZ;
    COMMENT ON COLUMN organizations.current_period_end IS 'When the current billing period ends';
  END IF;
END $$;

-- Add minutes_included if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'minutes_included'
  ) THEN
    ALTER TABLE organizations ADD COLUMN minutes_included INTEGER NOT NULL DEFAULT 15;
    COMMENT ON COLUMN organizations.minutes_included IS 'AI calling minutes included in the subscription';
  END IF;
END $$;

-- Add minutes_used if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'minutes_used'
  ) THEN
    ALTER TABLE organizations ADD COLUMN minutes_used INTEGER NOT NULL DEFAULT 0;
    COMMENT ON COLUMN organizations.minutes_used IS 'AI calling minutes used in the current billing period';
  END IF;
END $$;

-- Update default for subscription_status to 'active' instead of 'trial'
ALTER TABLE organizations ALTER COLUMN subscription_status SET DEFAULT 'active';

-- Create index on stripe fields for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription 
ON organizations(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer 
ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
