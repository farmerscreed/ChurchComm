-- Migration: Add tour_completed to organization_members
-- Epic 7: Guided Tour

ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN organization_members.tour_completed IS 'Flag indicating if the user has completed the onboarding tour for this organization';
