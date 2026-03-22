-- Migration: Add onboarding_completed column to organization_members
-- This column tracks whether a user has completed the church setup wizard
-- For existing users, we default to TRUE since they already have their organizations set up

-- Add the column if it doesn't exist, with DEFAULT TRUE for existing records
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT TRUE;

-- Ensure all existing records have onboarding_completed set to TRUE
-- (This handles cases where the column was previously added with DEFAULT FALSE)
UPDATE organization_members
SET onboarding_completed = TRUE
WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;

COMMENT ON COLUMN organization_members.onboarding_completed IS 'Flag indicating if the user has completed the initial church setup wizard';
