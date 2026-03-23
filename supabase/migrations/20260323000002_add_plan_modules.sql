-- Add plan_modules array to organizations table
-- Tracks which KeepFlock modules an organization has access to
-- Values can include: 'reach', 'attract', 'engage'

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan_modules TEXT[] DEFAULT '{}';

COMMENT ON COLUMN organizations.plan_modules IS
  'Array of active module IDs for this org: reach | attract | engage. Populated by LemonSqueezy webhook on successful purchase.';
