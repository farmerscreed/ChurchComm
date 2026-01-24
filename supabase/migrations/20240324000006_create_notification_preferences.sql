-- Migration 6: Create notification_preferences table

CREATE TABLE notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    escalation_sms BOOLEAN DEFAULT TRUE,
    escalation_email BOOLEAN DEFAULT TRUE,
    call_summary_frequency TEXT DEFAULT 'daily' CHECK (call_summary_frequency IN ('off', 'realtime', 'daily')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: users can SELECT their own rows
CREATE POLICY "Users can view own notification preferences"
    ON notification_preferences FOR SELECT
    USING (user_id = auth.uid());

-- Policy: users can UPDATE their own rows
CREATE POLICY "Users can update own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (user_id = auth.uid());

-- Policy: users can INSERT for their own user_id
CREATE POLICY "Users can insert own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE notification_preferences IS 'Per-user per-organization notification settings for escalations and summaries.';
