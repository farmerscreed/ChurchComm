-- Create profiles table to store user information
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view all profiles (needed for team member display)
CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Allow users to insert their own profile (needed for signup)
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Create a unified trigger function that handles both profile and organization creation
-- This replaces the previous handle_new_user function from auto_create_organization migration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_name TEXT;
    org_slug TEXT;
    new_org_id UUID;
BEGIN
    -- 1. Create user profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Create organization for new user
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users with profiles (if any)
INSERT INTO profiles (id, email, full_name)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
