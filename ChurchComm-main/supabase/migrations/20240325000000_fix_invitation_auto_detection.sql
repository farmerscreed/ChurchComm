-- Fix: Ensure users with pending invitations are automatically added to the correct organization
-- even when they sign up through the regular signup page instead of using the invitation link.
--
-- The key fix is:
-- 1. Check for pending invitations FIRST using case-insensitive email matching
-- 2. Only create a new organization if NO pending invitation exists
-- 3. Properly handle the invitation acceptance in the same transaction

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_name TEXT;
    org_slug TEXT;
    new_org_id UUID;
    pending_invite RECORD;
    should_skip_org_creation BOOLEAN;
    user_full_name TEXT;
BEGIN
    -- Build user's full name from metadata
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NULLIF(TRIM(CONCAT(
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            ' ',
            COALESCE(NEW.raw_user_meta_data->>'last_name', '')
        )), ''),
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- 1. Create user profile (always do this first)
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, user_full_name)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- 2. Check if this signup should skip org creation (user came via invitation link)
    should_skip_org_creation := COALESCE((NEW.raw_user_meta_data->>'skip_org_creation')::BOOLEAN, false);

    -- If skip_org_creation is true, the AcceptInvite page will handle org membership via accept_invitation() RPC
    IF should_skip_org_creation THEN
        RAISE NOTICE 'Skipping org creation for invited user (via invitation link): %', NEW.email;
        RETURN NEW;
    END IF;

    -- 3. CRITICAL FIX: Check for pending invitation using case-insensitive email match
    -- This catches users who sign up directly instead of using the invitation link
    SELECT * INTO pending_invite
    FROM public.invitations
    WHERE
        status = 'pending'
        AND expires_at > NOW()
        AND (
            (LOWER(email) = LOWER(NEW.email) AND invite_method = 'email')
            OR (phone_number = NEW.phone AND invite_method = 'sms' AND NEW.phone IS NOT NULL)
        )
    ORDER BY created_at DESC
    LIMIT 1;

    -- 4. If a valid pending invitation is found, add user to that organization
    IF pending_invite.id IS NOT NULL THEN
        RAISE NOTICE 'Found pending invitation for user % - adding to organization %', NEW.email, pending_invite.organization_id;

        -- Add user to the invited organization with the role specified in the invitation
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (pending_invite.organization_id, NEW.id, pending_invite.role)
        ON CONFLICT (organization_id, user_id) DO NOTHING;

        -- Mark the invitation as accepted
        UPDATE public.invitations
        SET
            status = 'accepted',
            accepted_at = NOW(),
            accepted_by_user_id = NEW.id
        WHERE id = pending_invite.id;

        RAISE NOTICE 'User % successfully added to organization via auto-detected invitation', NEW.email;
        RETURN NEW;
    END IF;

    -- 5. No pending invitation found - create a new organization for this user
    RAISE NOTICE 'No pending invitation found for user % - creating new organization', NEW.email;

    org_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'organization_name'), ''),
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

    RAISE NOTICE 'Created new organization "%" for user %', org_name, NEW.email;
    RETURN NEW;

EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS
'Handles new user signup: creates profile, checks for pending invitations (auto-detects even if user bypasses invitation link), and creates organization if needed.';
