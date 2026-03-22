-- Migration 5: Add phone, calling window, billing, and subscription fields to organizations

-- Phone number configuration
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS dedicated_phone_number TEXT,
    ADD COLUMN IF NOT EXISTS phone_number_type TEXT DEFAULT 'shared',
    ADD COLUMN IF NOT EXISTS calling_window_start TIME DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS calling_window_end TIME DEFAULT '20:00',
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Organization profile fields
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS estimated_size TEXT,
    ADD COLUMN IF NOT EXISTS preferred_channels TEXT[];

-- Billing and subscription fields
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS credit_card_on_file BOOLEAN DEFAULT FALSE;

-- Add CHECK constraints
ALTER TABLE organizations
    ADD CONSTRAINT organizations_phone_number_type_check
    CHECK (phone_number_type IN ('shared', 'dedicated'));

ALTER TABLE organizations
    ADD CONSTRAINT organizations_subscription_tier_check
    CHECK (subscription_tier IN ('trial', 'starter', 'growth', 'enterprise'));

ALTER TABLE organizations
    ADD CONSTRAINT organizations_billing_cycle_check
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'annual'));

-- Add comments
COMMENT ON COLUMN organizations.dedicated_phone_number IS 'Dedicated phone number assigned to this organization for outbound calls.';
COMMENT ON COLUMN organizations.phone_number_type IS 'Whether the org uses a shared or dedicated phone number.';
COMMENT ON COLUMN organizations.calling_window_start IS 'Earliest time of day calls can be made (in org timezone).';
COMMENT ON COLUMN organizations.calling_window_end IS 'Latest time of day calls can be made (in org timezone).';
COMMENT ON COLUMN organizations.timezone IS 'IANA timezone identifier for the organization.';
COMMENT ON COLUMN organizations.subscription_tier IS 'Current subscription tier: trial, starter, growth, or enterprise.';
COMMENT ON COLUMN organizations.trial_ends_at IS 'When the trial period expires.';
