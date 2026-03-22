-- KeepFlock Empire Schema Migration
-- Adds REACH & ATTRACT module tables + modular billing columns

-- ═══════════════════════════════════════════════════════════════
-- 1. ALTER organizations — add modular billing columns
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS active_modules TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ls_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_subscription_ids JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ls_customer_portal_url TEXT;

-- Update subscription_tier CHECK to include new module tiers
-- First drop existing constraint if it exists, then add new one
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
  ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_subscription_tier;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE organizations
  ADD CONSTRAINT chk_subscription_tier
  CHECK (subscription_tier IS NULL OR subscription_tier IN (
    'trial', 'engage', 'reach', 'attract', 'empire', 'custom', 'free',
    'starter', 'growth', 'pro', 'enterprise'  -- keep legacy values during migration
  ));

-- ═══════════════════════════════════════════════════════════════
-- 2. NEW TABLE: grant_accounts — tracks Google Ad Grant status per org
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS grant_accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  google_ads_account_id   TEXT,
  google_ads_customer_id  TEXT,
  grant_status            TEXT DEFAULT 'not_started'
    CHECK (grant_status IN (
      'not_started', 'gathering_docs', 'submitted', 'under_review',
      'approved', 'grants_activated', 'campaigns_live'
    )),
  guardian_customer_id    UUID,
  preflight_last_score    INTEGER,
  preflight_last_run      TIMESTAMPTZ,
  application_submitted_at TIMESTAMPTZ,
  grant_approved_at       TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE grant_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage own grant account"
  ON grant_accounts FOR ALL
  USING (org_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════════════════════════
-- 3. NEW TABLE: preflight_results — automated website preflight checks
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS preflight_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url_scanned       TEXT NOT NULL,
  score             INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  is_ready          BOOLEAN NOT NULL,
  critical_failures JSONB DEFAULT '[]',
  high_failures     JSONB DEFAULT '[]',
  advisories        JSONB DEFAULT '[]',
  passing_checks    JSONB DEFAULT '[]',
  scanned_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE preflight_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage own preflight results"
  ON preflight_results FOR ALL
  USING (org_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════════════════════════
-- 4. NEW TABLE: grant_compliance_events — GUARDIAN compliance alerts
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS grant_compliance_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  severity      TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  metric_name   TEXT,
  metric_value  DECIMAL,
  threshold     DECIMAL,
  action_taken  TEXT,
  message       TEXT,
  raw_payload   JSONB,
  is_read       BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE grant_compliance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage own compliance events"
  ON grant_compliance_events FOR ALL
  USING (org_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════════════════════════
-- 5. Indexes for performance
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_grant_accounts_org_id ON grant_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_preflight_results_org_id ON preflight_results(org_id);
CREATE INDEX IF NOT EXISTS idx_grant_compliance_events_org_id ON grant_compliance_events(org_id);
CREATE INDEX IF NOT EXISTS idx_grant_compliance_events_created ON grant_compliance_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organizations_active_modules ON organizations USING gin(active_modules);
CREATE INDEX IF NOT EXISTS idx_organizations_ls_customer_id ON organizations(ls_customer_id);
