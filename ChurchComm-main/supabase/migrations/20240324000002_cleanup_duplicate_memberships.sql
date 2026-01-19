-- Cleanup duplicate organization memberships
-- This removes duplicate memberships, keeping only the oldest one per user

-- First, let's see what duplicates exist (run this SELECT first to review)
-- SELECT
--     user_id,
--     COUNT(*) as membership_count,
--     array_agg(organization_id) as org_ids
-- FROM organization_members
-- GROUP BY user_id
-- HAVING COUNT(*) > 1;

-- Delete duplicate memberships, keeping only the oldest one per user
-- This uses a CTE to identify rows to delete
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id
               ORDER BY created_at ASC
           ) as rn
    FROM organization_members
)
DELETE FROM organization_members
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Also delete any "My Church" organizations that were auto-created but have no other members
-- (These are orphaned orgs created before users joined via invitation)
DELETE FROM organizations
WHERE name = 'My Church'
AND id NOT IN (
    SELECT DISTINCT organization_id FROM organization_members
);
