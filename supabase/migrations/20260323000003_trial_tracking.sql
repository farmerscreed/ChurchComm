-- Trial timing columns for REACH and ATTRACT modules
-- Also adds google_ad_grant_account_id for ATTRACT trial setup

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS reach_trial_started_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reach_trial_ends_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attract_trial_started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attract_trial_ends_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_ad_grant_account_id TEXT;
