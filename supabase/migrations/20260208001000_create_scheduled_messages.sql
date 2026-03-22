-- Create scheduled_messages table for scheduled SMS/Email messages
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'email')),
    subject TEXT, -- For email only
    content TEXT NOT NULL,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all', 'group', 'individual', 'tags')),
    recipient_ids UUID[] DEFAULT '{}', -- Array of group IDs or person IDs
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled')),
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_scheduled_messages_org ON scheduled_messages(organization_id);
CREATE INDEX idx_scheduled_messages_status ON scheduled_messages(status);
CREATE INDEX idx_scheduled_messages_scheduled_for ON scheduled_messages(scheduled_for);

-- Enable RLS
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's scheduled messages"
    ON scheduled_messages FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create scheduled messages for their organization"
    ON scheduled_messages FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's scheduled messages"
    ON scheduled_messages FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's scheduled messages"
    ON scheduled_messages FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_messages_updated_at
    BEFORE UPDATE ON scheduled_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
