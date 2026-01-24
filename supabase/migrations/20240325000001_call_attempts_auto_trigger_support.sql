-- Migration: Add auto-trigger support to call_attempts
-- Adds fields needed for automated (non-campaign) call scheduling

-- Add new columns for auto-trigger support
ALTER TABLE call_attempts
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS script_id UUID REFERENCES call_scripts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Make phone_number and provider nullable (auto-triggered calls populate these at execution time)
ALTER TABLE call_attempts
    ALTER COLUMN phone_number DROP NOT NULL,
    ALTER COLUMN provider DROP NOT NULL;

-- Drop and recreate the status CHECK to include 'scheduled'
ALTER TABLE call_attempts DROP CONSTRAINT IF EXISTS call_attempts_status_check;
ALTER TABLE call_attempts ADD CONSTRAINT call_attempts_status_check
    CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'failed', 'no_answer', 'busy'));

-- Make campaign_id optional (auto-triggered calls have no campaign)
-- The FK already allows NULL since there's no NOT NULL constraint

-- Add indexes for auto-trigger queries
CREATE INDEX IF NOT EXISTS idx_call_attempts_organization ON call_attempts(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_attempts_trigger_type ON call_attempts(trigger_type);
CREATE INDEX IF NOT EXISTS idx_call_attempts_scheduled_at ON call_attempts(scheduled_at);

-- Update RLS: allow access for auto-triggered calls via organization_id
CREATE POLICY "Users can view auto-triggered call attempts" ON call_attempts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Comments
COMMENT ON COLUMN call_attempts.organization_id IS 'Organization for auto-triggered calls (not tied to a campaign).';
COMMENT ON COLUMN call_attempts.trigger_type IS 'Type of auto-trigger that created this attempt (first_timer, birthday, anniversary).';
COMMENT ON COLUMN call_attempts.script_id IS 'Script to use for this call attempt.';
COMMENT ON COLUMN call_attempts.scheduled_at IS 'When this call was scheduled to be made.';
