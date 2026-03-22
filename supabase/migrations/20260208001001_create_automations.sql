-- Create automations table for event-triggered automations (birthday, group join, etc.)
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('birthday', 'group_join', 'group_leave', 'first_visit_followup', 'missed_attendance', 'milestone', 'anniversary')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'draft')),
    action_type TEXT NOT NULL CHECK (action_type IN ('send_sms', 'send_email', 'create_followup', 'notify_staff', 'make_call')),
    action_config JSONB DEFAULT '{}', -- Stores message_content, template_id, etc.
    trigger_config JSONB DEFAULT '{}', -- Stores days_before, send_time, group_ids, delay_hours, etc.
    target_groups UUID[] DEFAULT '{}', -- Groups this automation applies to
    total_executions INTEGER DEFAULT 0,
    last_executed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_automations_org ON automations(organization_id);
CREATE INDEX idx_automations_trigger_type ON automations(trigger_type);
CREATE INDEX idx_automations_status ON automations(status);

-- Enable RLS
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's automations"
    ON automations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create automations for their organization"
    ON automations FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's automations"
    ON automations FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's automations"
    ON automations FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_automations_updated_at
    BEFORE UPDATE ON automations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
