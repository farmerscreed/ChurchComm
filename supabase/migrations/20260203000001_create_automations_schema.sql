-- Automations Schema Migration
-- Supports birthday messages, scheduled communications, and event-triggered automations

-- 1. Create enum for automation trigger types
CREATE TYPE automation_trigger_type AS ENUM (
    'birthday',
    'anniversary',
    'membership_anniversary',
    'group_join',
    'group_leave',
    'first_visit_followup',
    'missed_attendance',
    'milestone',
    'scheduled',
    'custom'
);

-- 2. Create enum for automation status
CREATE TYPE automation_status AS ENUM (
    'active',
    'paused',
    'draft',
    'archived'
);

-- 3. Create enum for automation action types
CREATE TYPE automation_action_type AS ENUM (
    'send_sms',
    'send_email',
    'create_followup',
    'assign_tag',
    'notify_staff'
);

-- 4. Auto Triggers Table (main automation definitions)
CREATE TABLE IF NOT EXISTS auto_triggers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type automation_trigger_type NOT NULL,
    status automation_status DEFAULT 'draft',

    -- Action configuration
    action_type automation_action_type NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- For SMS: { template_id, message_content, use_template }
    -- For Email: { template_id, subject, body, use_template }
    -- For Followup: { priority, assign_to, notes_template }
    -- For Tag: { tag_name, action: 'add' | 'remove' }
    -- For Notify: { staff_ids[], notification_type }

    -- Trigger configuration
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- For birthday: { days_before: 0, send_time: "09:00" }
    -- For anniversary: { years: [1, 5, 10], days_before: 0, send_time: "09:00" }
    -- For group_join/leave: { group_ids: [], delay_hours: 0 }
    -- For first_visit: { delay_days: 1 }
    -- For missed_attendance: { consecutive_weeks: 2 }
    -- For scheduled: { cron: "0 9 * * 1", timezone: "America/New_York" }
    -- For milestone: { type: 'visits' | 'years', values: [10, 25, 50] }

    -- Targeting
    target_groups UUID[] DEFAULT '{}', -- Empty = all people
    target_tags TEXT[] DEFAULT '{}', -- Filter by tags
    exclude_tags TEXT[] DEFAULT '{}', -- Exclude by tags

    -- Scheduling
    send_time TIME DEFAULT '09:00:00', -- Default time to send
    timezone VARCHAR(100) DEFAULT 'America/New_York',

    -- Rate limiting
    max_sends_per_day INTEGER DEFAULT 100,
    cooldown_days INTEGER DEFAULT 0, -- Days before same person can receive again

    -- Tracking
    total_executions INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Auto Trigger Executions Table (log of all automation runs)
CREATE TABLE IF NOT EXISTS auto_trigger_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trigger_id UUID NOT NULL REFERENCES auto_triggers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,

    -- Execution details
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    action_type automation_action_type NOT NULL,

    -- Action result
    action_result JSONB DEFAULT '{}'::jsonb,
    -- { campaign_id, message_sid, followup_id, etc. }

    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timing
    scheduled_for TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Scheduled Messages Table (for one-off scheduled messages)
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Message details
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('sms', 'email')),
    subject VARCHAR(500), -- For emails
    content TEXT NOT NULL,

    -- Recipients
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('individual', 'group', 'all', 'tags')),
    recipient_ids UUID[] DEFAULT '{}', -- Person IDs or Group IDs based on type
    recipient_tags TEXT[] DEFAULT '{}', -- If type is 'tags'

    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(100) DEFAULT 'America/New_York',

    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled')),

    -- Results
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    campaign_id UUID REFERENCES communication_campaigns(id),

    -- Error tracking
    error_message TEXT,

    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_triggers_org_status ON auto_triggers(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_triggers_type ON auto_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_auto_triggers_active ON auto_triggers(organization_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_auto_executions_trigger ON auto_trigger_executions(trigger_id);
CREATE INDEX IF NOT EXISTS idx_auto_executions_person ON auto_trigger_executions(person_id);
CREATE INDEX IF NOT EXISTS idx_auto_executions_org_status ON auto_trigger_executions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_auto_executions_scheduled ON auto_trigger_executions(scheduled_for) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_org ON scheduled_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled ON scheduled_messages(scheduled_for) WHERE status = 'scheduled';

-- 8. Add birthday index to people table for efficient queries
CREATE INDEX IF NOT EXISTS idx_people_birthday_month_day ON people (
    EXTRACT(MONTH FROM birthday),
    EXTRACT(DAY FROM birthday)
) WHERE birthday IS NOT NULL;

-- 9. Enable RLS
ALTER TABLE auto_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_trigger_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for auto_triggers
CREATE POLICY "Users can view automations from their organization" ON auto_triggers
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create automations for their organization" ON auto_triggers
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update automations from their organization" ON auto_triggers
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete automations from their organization" ON auto_triggers
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- 11. RLS Policies for auto_trigger_executions
CREATE POLICY "Users can view executions from their organization" ON auto_trigger_executions
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Service role can manage executions" ON auto_trigger_executions
    FOR ALL USING (true);

-- 12. RLS Policies for scheduled_messages
CREATE POLICY "Users can view scheduled messages from their organization" ON scheduled_messages
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create scheduled messages for their organization" ON scheduled_messages
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update scheduled messages from their organization" ON scheduled_messages
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete scheduled messages from their organization" ON scheduled_messages
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- 13. Function to get upcoming birthdays for an organization
CREATE OR REPLACE FUNCTION get_upcoming_birthdays(
    org_id UUID,
    days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE (
    person_id UUID,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    email TEXT,
    birthday DATE,
    days_until INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.email,
        p.birthday,
        CASE
            WHEN EXTRACT(DOY FROM (DATE_TRUNC('year', CURRENT_DATE) +
                INTERVAL '1 year' * CASE
                    WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                        EXTRACT(MONTH FROM p.birthday)::INTEGER,
                        EXTRACT(DAY FROM p.birthday)::INTEGER) < CURRENT_DATE
                    THEN 1 ELSE 0 END +
                (EXTRACT(MONTH FROM p.birthday) - 1) * INTERVAL '1 month' +
                (EXTRACT(DAY FROM p.birthday) - 1) * INTERVAL '1 day')) - EXTRACT(DOY FROM CURRENT_DATE)
            WHEN EXTRACT(DOY FROM (DATE_TRUNC('year', CURRENT_DATE) +
                INTERVAL '1 year' * CASE
                    WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                        EXTRACT(MONTH FROM p.birthday)::INTEGER,
                        EXTRACT(DAY FROM p.birthday)::INTEGER) < CURRENT_DATE
                    THEN 1 ELSE 0 END +
                (EXTRACT(MONTH FROM p.birthday) - 1) * INTERVAL '1 month' +
                (EXTRACT(DAY FROM p.birthday) - 1) * INTERVAL '1 day')) - EXTRACT(DOY FROM CURRENT_DATE) < 0
            THEN 365 + (EXTRACT(DOY FROM (DATE_TRUNC('year', CURRENT_DATE) +
                INTERVAL '1 year' * CASE
                    WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                        EXTRACT(MONTH FROM p.birthday)::INTEGER,
                        EXTRACT(DAY FROM p.birthday)::INTEGER) < CURRENT_DATE
                    THEN 1 ELSE 0 END +
                (EXTRACT(MONTH FROM p.birthday) - 1) * INTERVAL '1 month' +
                (EXTRACT(DAY FROM p.birthday) - 1) * INTERVAL '1 day')) - EXTRACT(DOY FROM CURRENT_DATE))::INTEGER
            ELSE (EXTRACT(DOY FROM (DATE_TRUNC('year', CURRENT_DATE) +
                INTERVAL '1 year' * CASE
                    WHEN MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                        EXTRACT(MONTH FROM p.birthday)::INTEGER,
                        EXTRACT(DAY FROM p.birthday)::INTEGER) < CURRENT_DATE
                    THEN 1 ELSE 0 END +
                (EXTRACT(MONTH FROM p.birthday) - 1) * INTERVAL '1 month' +
                (EXTRACT(DAY FROM p.birthday) - 1) * INTERVAL '1 day')) - EXTRACT(DOY FROM CURRENT_DATE))::INTEGER
        END as days_until
    FROM people p
    WHERE p.organization_id = org_id
      AND p.birthday IS NOT NULL
    ORDER BY days_until ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Function to get today's birthdays
CREATE OR REPLACE FUNCTION get_todays_birthdays(org_id UUID)
RETURNS TABLE (
    person_id UUID,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    email TEXT,
    birthday DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.first_name,
        p.last_name,
        p.phone_number,
        p.email,
        p.birthday
    FROM people p
    WHERE p.organization_id = org_id
      AND p.birthday IS NOT NULL
      AND EXTRACT(MONTH FROM p.birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM p.birthday) = EXTRACT(DAY FROM CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Updated_at trigger for auto_triggers
CREATE OR REPLACE FUNCTION update_auto_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_triggers_updated_at
    BEFORE UPDATE ON auto_triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_triggers_updated_at();

-- 16. Updated_at trigger for scheduled_messages
CREATE TRIGGER scheduled_messages_updated_at
    BEFORE UPDATE ON scheduled_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_triggers_updated_at();
