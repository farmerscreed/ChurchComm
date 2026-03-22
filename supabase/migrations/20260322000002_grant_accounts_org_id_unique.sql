-- Add UNIQUE constraint on org_id so upsert ON CONFLICT works
CREATE UNIQUE INDEX IF NOT EXISTS idx_grant_accounts_org_id_unique ON grant_accounts(org_id);
