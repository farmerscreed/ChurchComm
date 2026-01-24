-- Fix handle_new_user trigger to respect skip_org_creation flag
-- This prevents duplicate organization memberships when users sign up via invitation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    org_name TEXT;
    org_slug TEXT;
    new_org_id UUID;
    pending_invite RECORD;
    should_skip_org_creation BOOLEAN;
BEGIN
    -- Check if this signup should skip org creation (invited user)
    should_skip_org_creation := COALESCE((NEW.raw_user_meta_data->>'skip_org_creation')::BOOLEAN, false);

    -- 1. Create user profile (always do this)
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            CONCAT(
                COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
                ' ',
                COALESCE(NEW.raw_user_meta_data->>'last_name', '')
            ),
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        )
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. If skip_org_creation is true, don't create an org (invitation flow handles it)
    IF should_skip_org_creation THEN
        RAISE NOTICE 'Skipping org creation for invited user: %', NEW.email;
        RETURN NEW;
    END IF;

    -- 3. Check for a pending invitation (fallback check)
    SELECT * INTO pending_invite
    FROM public.invitations
    WHERE (
        (email = NEW.email AND invite_method = 'email') OR
        (phone_number = NEW.phone AND invite_method = 'sms')
    )
    AND status = 'pending'
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- 4. If a valid invitation is found, use it
    IF pending_invite IS NOT NULL THEN
        -- Add user to the invited organization (with conflict handling)
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (pending_invite.organization_id, NEW.id, pending_invite.role)
        ON CONFLICT (organization_id, user_id) DO NOTHING;

        -- Update the invitation status
        UPDATE public.invitations
        SET
            status = 'accepted',
            accepted_at = NOW(),
            accepted_by_user_id = NEW.id
        WHERE id = pending_invite.id;

        RETURN NEW;
    END IF;

    -- 5. No invitation found - create a new organization
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

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger is up to date
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
