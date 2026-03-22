-- Migration 10: Add template/voice fields to call_scripts and make organization_id nullable

-- Add new columns
ALTER TABLE call_scripts
    ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS template_type TEXT,
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS voice_id TEXT,
    ADD COLUMN IF NOT EXISTS voice_name TEXT;

-- Make organization_id nullable (for system templates that have no org)
ALTER TABLE call_scripts
    ALTER COLUMN organization_id DROP NOT NULL;

-- Drop the existing FK constraint and recreate to allow NULLs properly
-- The FK already allows NULLs once the column is nullable, but we need
-- to ensure the unique constraint handles NULL org_id for system templates.

-- Add a partial unique index for system templates (no org_id)
CREATE UNIQUE INDEX idx_call_scripts_system_template_type
    ON call_scripts(template_type)
    WHERE is_system = TRUE AND organization_id IS NULL;

-- Update RLS to allow SELECT on system templates for all authenticated users
-- First drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view call scripts" ON call_scripts;
DROP POLICY IF EXISTS "Org members can view call scripts" ON call_scripts;
DROP POLICY IF EXISTS "Admins can create call scripts" ON call_scripts;
DROP POLICY IF EXISTS "Admins can update call scripts" ON call_scripts;
DROP POLICY IF EXISTS "Admins can delete call scripts" ON call_scripts;

-- Recreate SELECT policy: org members can view their scripts OR anyone can view system templates
CREATE POLICY "Users can view org and system call scripts"
    ON call_scripts FOR SELECT
    USING (
        (is_system = TRUE)
        OR
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = call_scripts.organization_id
            AND user_id = auth.uid()
        )
    );

-- Recreate write policies for org-specific scripts only
CREATE POLICY "Admins and pastors can create call scripts"
    ON call_scripts FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = call_scripts.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

CREATE POLICY "Admins and pastors can update call scripts"
    ON call_scripts FOR UPDATE
    USING (
        is_system = FALSE
        AND EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = call_scripts.organization_id
            AND user_id = auth.uid()
            AND role IN ('admin', 'pastor')
        )
    );

CREATE POLICY "Admins and pastors can delete call scripts"
    ON call_scripts FOR DELETE
    USING (
        is_system = FALSE
        AND EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = call_scripts.organization_id
            AND user_id = auth.uid()
            AND role IN ('admin', 'pastor')
        )
    );

-- Add comments
COMMENT ON COLUMN call_scripts.is_template IS 'Whether this script is a reusable template.';
COMMENT ON COLUMN call_scripts.template_type IS 'Type identifier for system templates (e.g., first_timer_followup, birthday_greeting).';
COMMENT ON COLUMN call_scripts.is_system IS 'System templates are read-only and available to all organizations.';
COMMENT ON COLUMN call_scripts.voice_id IS 'AI voice provider voice ID to use with this script.';
COMMENT ON COLUMN call_scripts.voice_name IS 'Human-readable name of the selected voice.';
