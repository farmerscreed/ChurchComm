-- Create script_generations table for AI script builder rate limiting
CREATE TABLE IF NOT EXISTS script_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    purpose TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE script_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view script generations"
    ON script_generations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = script_generations.organization_id
            AND user_id = auth.uid()
        )
    );

-- Service role can insert (edge function uses service role)
CREATE POLICY "Service role can insert script generations"
    ON script_generations FOR INSERT
    WITH CHECK (true);

-- Add call_summary_frequency to notification_preferences if not exists
ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS call_summary_frequency TEXT DEFAULT 'none'
    CHECK (call_summary_frequency IN ('none', 'realtime', 'daily'));

COMMENT ON COLUMN notification_preferences.call_summary_frequency IS 'How often to receive call outcome notifications: none, realtime, or daily digest';
