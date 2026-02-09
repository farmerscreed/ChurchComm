-- Migration: Add AI context fields to organizations for church knowledge injection
-- These fields populate script template placeholders like {church_name}, {pastor_name}, etc.

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS pastor_name TEXT,
    ADD COLUMN IF NOT EXISTS service_times TEXT,
    ADD COLUMN IF NOT EXISTS ministry_list TEXT,
    ADD COLUMN IF NOT EXISTS ai_context_notes TEXT;

COMMENT ON COLUMN organizations.pastor_name IS 'Name of the senior pastor for AI call personalization.';
COMMENT ON COLUMN organizations.service_times IS 'Service schedule for AI to reference (e.g., "Sundays at 9am and 11am").';
COMMENT ON COLUMN organizations.ministry_list IS 'Comma-separated list of ministries available at the church.';
COMMENT ON COLUMN organizations.ai_context_notes IS 'Additional notes for the AI to use in conversations.';
