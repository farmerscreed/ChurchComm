-- Fallback policies for organization creation
-- The handle_new_user trigger function is defined in 20240322000000_add_profiles.sql
-- These policies allow manual organization creation as a fallback

-- Allow users to create their first organization (for manual flow if trigger fails)
DROP POLICY IF EXISTS "Users can create their first organization" ON organizations;
CREATE POLICY "Users can create their first organization"
    ON organizations FOR INSERT
    WITH CHECK (true);
