-- Migration 1: Rename communication_campaigns to messaging_campaigns
-- This renames the table and recreates RLS policies with the new table name.
-- The FK constraint on campaign_recipients auto-follows the rename.

-- Step 1: Drop existing RLS policies on communication_campaigns
DROP POLICY IF EXISTS "Users can view campaigns for their organization" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can create campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can update campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Org members can view communication campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can create communication campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can update communication campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can delete communication campaigns" ON communication_campaigns;

-- Step 2: Rename the table
ALTER TABLE communication_campaigns RENAME TO messaging_campaigns;

-- Step 3: Rename the FK constraint to reflect the new table name
ALTER TABLE messaging_campaigns
    RENAME CONSTRAINT communication_campaigns_organization_id_fkey
    TO messaging_campaigns_organization_id_fkey;

-- Step 4: Recreate RLS policies with new table name
CREATE POLICY "Org members can view messaging campaigns"
    ON messaging_campaigns FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = messaging_campaigns.organization_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Admins can create messaging campaigns"
    ON messaging_campaigns FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = messaging_campaigns.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ));

CREATE POLICY "Admins can update messaging campaigns"
    ON messaging_campaigns FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = messaging_campaigns.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ));

CREATE POLICY "Admins can delete messaging campaigns"
    ON messaging_campaigns FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = messaging_campaigns.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ));
