-- Fix ambiguous organization_id reference in accept_invitation function
-- The RETURNS TABLE column 'organization_id' conflicts with the table column of the same name

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS accept_invitation(TEXT, UUID);

-- Recreate the function with renamed return column
CREATE OR REPLACE FUNCTION accept_invitation(p_invite_token TEXT, p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    org_id UUID,  -- Renamed from 'organization_id' to avoid ambiguity
    role TEXT,
    org_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- Find the invitation
    SELECT i.*, o.name as organization_name
    INTO v_invitation
    FROM invitations i
    JOIN organizations o ON o.id = i.organization_id
    WHERE i.invite_token = p_invite_token
    AND i.status = 'pending'
    AND i.expires_at > now();

    -- If no valid invitation found
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Add user to organization
    INSERT INTO organization_members (organization_id, user_id, role)
    VALUES (v_invitation.organization_id, p_user_id, v_invitation.role)
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- Mark invitation as accepted
    UPDATE invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invitation.id;

    -- Return success
    RETURN QUERY SELECT true, v_invitation.organization_id, v_invitation.role, v_invitation.organization_name;
END;
$$;

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated, service_role;
