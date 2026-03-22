-- Migration 9: Create auto_triggers table for automated calling triggers

CREATE TABLE auto_triggers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('first_timer', 'birthday', 'anniversary')),
    enabled BOOLEAN DEFAULT FALSE,
    script_id UUID REFERENCES call_scripts(id) ON DELETE SET NULL,
    delay_hours INTEGER DEFAULT 24,
    anniversary_milestones INTEGER[] DEFAULT '{1,12}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, trigger_type)
);

-- Enable RLS
ALTER TABLE auto_triggers ENABLE ROW LEVEL SECURITY;

-- Policy: org members can SELECT
CREATE POLICY "Org members can view auto triggers"
    ON auto_triggers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = auto_triggers.organization_id
        AND user_id = auth.uid()
    ));

-- Policy: admins and pastors can INSERT
CREATE POLICY "Admins and pastors can create auto triggers"
    ON auto_triggers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = auto_triggers.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

-- Policy: admins and pastors can UPDATE
CREATE POLICY "Admins and pastors can update auto triggers"
    ON auto_triggers FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = auto_triggers.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

-- Policy: admins and pastors can DELETE
CREATE POLICY "Admins and pastors can delete auto triggers"
    ON auto_triggers FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = auto_triggers.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

-- Add updated_at trigger
CREATE TRIGGER update_auto_triggers_updated_at
    BEFORE UPDATE ON auto_triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add index for org lookups
CREATE INDEX idx_auto_triggers_org
    ON auto_triggers(organization_id);

-- Add comments
COMMENT ON TABLE auto_triggers IS 'Configuration for automated calling triggers (first-timer, birthday, anniversary).';
COMMENT ON COLUMN auto_triggers.delay_hours IS 'Hours to wait after the triggering event before making the call.';
COMMENT ON COLUMN auto_triggers.anniversary_milestones IS 'Array of month milestones for anniversary triggers (e.g., {1,12} = 1 month and 12 months).';
