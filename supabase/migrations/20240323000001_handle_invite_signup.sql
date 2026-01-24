-- Modify handle_new_user function to process invitations on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_name TEXT;
    org_slug TEXT;
    new_org_id UUID;
    pending_invite RECORD;
BEGIN
    -- 1. Check for a pending invitation
    SELECT * INTO pending_invite
    FROM public.invitations
    WHERE
        (email = NEW.email AND invite_method = 'email') OR
        (phone_number = NEW.phone AND invite_method = 'sms')
    AND status = 'pending'
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- 2. Create user profile (common for both flows)
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;

    -- 3. If a valid invitation is found, use it
    IF pending_invite IS NOT NULL THEN
        -- Add user to the invited organization
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (pending_invite.organization_id, NEW.id, pending_invite.role);

        -- Update the invitation status
        UPDATE public.invitations
        SET
            status = 'accepted',
            accepted_at = NOW(),
            accepted_by_user_id = NEW.id
        WHERE id = pending_invite.id;

    -- 4. If no invitation is found, create a new organization
    ELSE
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

        -- Add user as admin of the new organization
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (new_org_id, NEW.id, 'admin');
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger and re-create it to ensure it's up-to-date
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a column to track who accepted an invite
ALTER TABLE public.invitations
ADD COLUMN IF NOT EXISTS accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
