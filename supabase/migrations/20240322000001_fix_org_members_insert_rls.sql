-- Comprehensive fix for infinite recursion in organization_members RLS policies
-- The original policies queried organization_members to check permissions on organization_members,
-- which causes infinite recursion. This fix uses SECURITY DEFINER functions to bypass RLS.

-- Function to check if a user is an admin of an organization
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM organization_members
        WHERE organization_id = org_id
        AND user_id = check_user_id
        AND role = 'admin'
    );
$$;

-- Function to check if a user is a member of an organization
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM organization_members
        WHERE organization_id = org_id
        AND user_id = check_user_id
    );
$$;

-- Drop all existing problematic policies on organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON organization_members;
DROP POLICY IF EXISTS "Users can update members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can insert members into their organizations" ON organization_members;
DROP POLICY IF EXISTS "Admins can insert members into their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can delete members from their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can add themselves to organization" ON organization_members;

-- SELECT: Users can view their own membership directly (no recursion)
CREATE POLICY "Users can view own membership"
    ON organization_members FOR SELECT
    USING (user_id = auth.uid());

-- SELECT: Users can view all members of organizations they belong to (uses function to avoid recursion)
CREATE POLICY "Users can view org members"
    ON organization_members FOR SELECT
    USING (is_org_member(organization_id, auth.uid()));

-- INSERT: Only admins can add new members to their organizations
CREATE POLICY "Admins can insert org members"
    ON organization_members FOR INSERT
    WITH CHECK (is_org_admin(organization_id, auth.uid()));

-- UPDATE: Only admins can update member records
CREATE POLICY "Admins can update org members"
    ON organization_members FOR UPDATE
    USING (is_org_admin(organization_id, auth.uid()));

-- DELETE: Only admins can remove members from organizations
CREATE POLICY "Admins can delete org members"
    ON organization_members FOR DELETE
    USING (is_org_admin(organization_id, auth.uid()));

-- Drop the old function if it exists (from partial fix attempts)
DROP FUNCTION IF EXISTS is_admin(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_organization_ids(UUID);
