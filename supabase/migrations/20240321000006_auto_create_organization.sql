-- Function to automatically create organization for new users
-- This function runs with elevated privileges (SECURITY DEFINER) to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_name TEXT;
  org_slug TEXT;
  new_org_id UUID;
BEGIN
  -- Get organization name from user metadata, default to "My Church"
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    'My Church'
  );

  -- Create a unique slug from the organization name
  org_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  org_slug := org_slug || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  -- Create the organization
  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Add user as admin of the organization
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
-- This fires when a new user is created (after email confirmation if enabled)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also need to allow users to INSERT their first organization membership
-- This is needed as a fallback if the trigger doesn't work
DROP POLICY IF EXISTS "Users can create their first organization" ON organizations;
CREATE POLICY "Users can create their first organization"
    ON organizations FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can add themselves to organization" ON organization_members;
CREATE POLICY "Users can add themselves to organization"
    ON organization_members FOR INSERT
    WITH CHECK (user_id = auth.uid());
