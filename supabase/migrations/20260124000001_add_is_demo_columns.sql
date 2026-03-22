-- Migration: Add is_demo columns to remaining tables
-- Epic 7: Demo Mode

-- Add is_demo flag to relevant tables
ALTER TABLE people ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE call_scripts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE calling_campaigns ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE call_attempts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE escalation_alerts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN groups.is_demo IS 'Flag indicating this is demo data';
