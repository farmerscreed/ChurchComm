-- Add grant_application_status to organizations table
-- Tracks where a church is in the Google Ad Grant application process
-- Values: 'not_started' | 'goodstack_pending' | 'goodstack_approved' | 'ad_grants_active'

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS grant_application_status TEXT NOT NULL DEFAULT 'not_started';

-- Enforce valid values
ALTER TABLE organizations
  ADD CONSTRAINT organizations_grant_application_status_check
  CHECK (grant_application_status IN (
    'not_started',
    'goodstack_pending',
    'goodstack_approved',
    'ad_grants_active'
  ));

COMMENT ON COLUMN organizations.grant_application_status IS
  'Tracks Google Ad Grant application progress: not_started → goodstack_pending → goodstack_approved → ad_grants_active';
