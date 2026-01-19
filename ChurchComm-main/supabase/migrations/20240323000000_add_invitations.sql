-- Create invitations table for team member invitations
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT,
    phone_number TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'leader', 'member')),
    invite_token TEXT UNIQUE NOT NULL,
    invite_method TEXT NOT NULL CHECK (invite_method IN ('email', 'sms')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,

    -- Ensure either email or phone_number is provided
    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone_number IS NOT NULL)
);

-- Create index for faster lookups
CREATE INDEX idx_invitations_token ON invitations(invite_token);
CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_email ON invitations(email) WHERE email IS NOT NULL;
CREATE INDEX idx_invitations_phone ON invitations(phone_number) WHERE phone_number IS NOT NULL;

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view invitations for their organization
CREATE POLICY "Admins can view org invitations"
    ON invitations FOR SELECT
    USING (is_org_admin(organization_id, auth.uid()));

-- Policy: Admins can create invitations for their organization
CREATE POLICY "Admins can create invitations"
    ON invitations FOR INSERT
    WITH CHECK (is_org_admin(organization_id, auth.uid()));

-- Policy: Admins can update invitations (cancel, etc.)
CREATE POLICY "Admins can update invitations"
    ON invitations FOR UPDATE
    USING (is_org_admin(organization_id, auth.uid()));

-- Policy: Admins can delete invitations
CREATE POLICY "Admins can delete invitations"
    ON invitations FOR DELETE
    USING (is_org_admin(organization_id, auth.uid()));

-- Policy: Anyone can view invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
    ON invitations FOR SELECT
    USING (true);

-- Function to generate secure invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN encode(gen_random_bytes(24), 'base64');
END;
$$;

-- Function to check and accept invitation during signup
-- This will be called from the modified handle_new_user trigger
CREATE OR REPLACE FUNCTION accept_invitation(p_invite_token TEXT, p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    organization_id UUID,
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
    SELECT i.*, o.name as org_name
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
    RETURN QUERY SELECT true, v_invitation.organization_id, v_invitation.role, v_invitation.org_name;
END;
$$;

-- Function to get invitation details by token (public, for the accept page)
CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    organization_name TEXT,
    role TEXT,
    email TEXT,
    phone_number TEXT,
    status TEXT,
    expires_at TIMESTAMPTZ,
    is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.id,
        o.name as organization_name,
        i.role,
        i.email,
        i.phone_number,
        i.status,
        i.expires_at,
        (i.status = 'pending' AND i.expires_at > now()) as is_valid
    FROM invitations i
    JOIN organizations o ON o.id = i.organization_id
    WHERE i.invite_token = p_token;
END;
$$;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION generate_invite_token() TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(TEXT) TO anon, authenticated;
