-- Automations Schema Migration
-- Tables for birthday automations, scheduled messages, and event-triggered communications

-- 1. Automation trigger types enum
CREATE TYPE automation_trigger_type AS ENUM (
  'birthday',
  'anniversary',
  'membership_anniversary',
  'new_member',
  'first_visit',
  'missed_attendance',
  'group_joined',
  'group_left',
  'status_change',
  'scheduled',
  'custom'
);

-- 2. Automation status enum
CREATE TYPE automation_status AS ENUM (
  'active',
  'paused',
  'draft'
);

-- 3. Main automations table
CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type automation_trigger_type NOT NULL,
  status automation_status DEFAULT 'draft',

  -- Trigger configuration (varies by trigger_type)
  trigger_config JSONB DEFAULT '{}'::jsonb,
  -- Example configs:
  -- birthday: { "days_before": 0, "send_time": "09:00" }
  -- new_member: { "delay_hours": 24 }
  -- missed_attendance: { "consecutive_weeks": 2 }
  -- scheduled: { "cron": "0 9 * * 1", "timezone": "America/New_York" }

  -- Message configuration
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('sms', 'email', 'call')),
  message_template TEXT NOT NULL,
  message_subject VARCHAR(500), -- For emails

  -- Targeting (who receives the automation)
  target_filter JSONB DEFAULT '{}'::jsonb,
  -- Example: { "groups": ["uuid1", "uuid2"], "statuses": ["member", "leader"], "tags": ["active"] }

  -- Statistics
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Automation execution log
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,

  -- Execution details
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'skipped')),
  message_sent TEXT,
  error_message TEXT,

  -- Timing
  scheduled_for TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,

  -- External tracking
  external_id VARCHAR(255), -- Twilio message SID, etc.
  cost DECIMAL(10,4) DEFAULT 0.00,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Scheduled messages (one-time scheduled sends)
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Message details
  name VARCHAR(255) NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('sms', 'email', 'call')),
  message_content TEXT NOT NULL,
  message_subject VARCHAR(500),

  -- Targeting
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('all', 'group', 'individual', 'filter')),
  recipient_ids UUID[], -- Person IDs or Group IDs depending on type
  recipient_filter JSONB DEFAULT '{}'::jsonb,

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed', 'cancelled')),

  -- Statistics
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,

  -- Execution
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Birthday tracking view (for quick lookups)
CREATE OR REPLACE VIEW upcoming_birthdays AS
SELECT
  p.id,
  p.organization_id,
  p.first_name,
  p.last_name,
  p.phone_number,
  p.email,
  p.birthday,
  EXTRACT(MONTH FROM p.birthday) as birth_month,
  EXTRACT(DAY FROM p.birthday) as birth_day,
  -- Calculate next birthday
  CASE
    WHEN (
      EXTRACT(MONTH FROM p.birthday) > EXTRACT(MONTH FROM CURRENT_DATE)
      OR (
        EXTRACT(MONTH FROM p.birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM p.birthday) >= EXTRACT(DAY FROM CURRENT_DATE)
      )
    ) THEN
      make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::int,
        EXTRACT(MONTH FROM p.birthday)::int,
        EXTRACT(DAY FROM p.birthday)::int
      )
    ELSE
      make_date(
        (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::int,
        EXTRACT(MONTH FROM p.birthday)::int,
        EXTRACT(DAY FROM p.birthday)::int
      )
  END as next_birthday,
  -- Days until next birthday
  CASE
    WHEN (
      EXTRACT(MONTH FROM p.birthday) > EXTRACT(MONTH FROM CURRENT_DATE)
      OR (
        EXTRACT(MONTH FROM p.birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(DAY FROM p.birthday) >= EXTRACT(DAY FROM CURRENT_DATE)
      )
    ) THEN
      make_date(
        EXTRACT(YEAR FROM CURRENT_DATE)::int,
        EXTRACT(MONTH FROM p.birthday)::int,
        EXTRACT(DAY FROM p.birthday)::int
      ) - CURRENT_DATE
    ELSE
      make_date(
        (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::int,
        EXTRACT(MONTH FROM p.birthday)::int,
        EXTRACT(DAY FROM p.birthday)::int
      ) - CURRENT_DATE
  END as days_until_birthday
FROM people p
WHERE p.birthday IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automations_org_status ON automations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_next_run ON automations(next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_automation_executions_automation ON automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_person ON automation_executions(person_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_scheduled ON automation_executions(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_org ON scheduled_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled ON scheduled_messages(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_people_birthday ON people(birthday) WHERE birthday IS NOT NULL;

-- Enable RLS
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automations
CREATE POLICY "Users can view automations from their organization" ON automations
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create automations for their organization" ON automations
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update automations from their organization" ON automations
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete automations from their organization" ON automations
  FOR DELETE USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- RLS Policies for automation_executions
CREATE POLICY "Users can view execution logs from their organization" ON automation_executions
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create execution logs for their organization" ON automation_executions
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- RLS Policies for scheduled_messages
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_automations_timestamp
  BEFORE UPDATE ON automations
  FOR EACH ROW
  EXECUTE FUNCTION update_automations_updated_at();

CREATE TRIGGER update_scheduled_messages_timestamp
  BEFORE UPDATE ON scheduled_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_automations_updated_at();
