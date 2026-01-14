-- Fix infinite recursion in organization_members RLS policy
-- The original policy queried organization_members to check if user can view organization_members,
-- which causes infinite recursion.

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;

-- Create a simple policy that allows users to view their own membership
-- This avoids the recursion by not querying the same table
CREATE POLICY "Users can view their own membership"
    ON organization_members FOR SELECT
    USING (user_id = auth.uid());

-- Create a separate policy for viewing other members (using a function to avoid recursion)
-- This uses a security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION get_user_organization_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id FROM organization_members WHERE user_id = p_user_id;
$$;

-- Allow users to view all members of organizations they belong to
CREATE POLICY "Users can view members of their organizations"
    ON organization_members FOR SELECT
    USING (
        organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    );
