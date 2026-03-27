-- Additional org columns needed by StatusTracker component
-- Tracks Google Nonprofits verification and Ad Grant application progress

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS google_nonprofit_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS google_nonprofit_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_ad_grant_applied BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS google_ad_grant_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_ad_grant_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS google_ad_grant_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS website_preflight_passed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS website_preflight_passed_at TIMESTAMPTZ;
