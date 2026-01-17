-- Calling System Schema Migration
-- Tables for bulk calling system and VAPI integration

-- Create enums
CREATE TYPE public.escalation_status AS ENUM ('open', 'in_progress', 'closed', 'archived');
CREATE TYPE public.escalation_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.member_response_type AS ENUM ('positive', 'neutral', 'negative', 'unclear', 'no_response');
CREATE TYPE public.follow_up_type AS ENUM ('none', 'general_follow_up', 'pastoral_visit', 'phone_call', 'email');

-- 1. Calling Scripts Table
CREATE TABLE IF NOT EXISTS calling_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    provider_compatibility VARCHAR(50) DEFAULT 'both',
    is_template BOOLEAN DEFAULT false,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Calling Campaigns Table
CREATE TABLE IF NOT EXISTS calling_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('vapi', 'twilio')),
    cost_threshold DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    actual_cost DECIMAL(10,2) DEFAULT 0.00,
    target_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    batch_size INTEGER DEFAULT 50,
    responses_summary JSONB DEFAULT '{"yes": 0, "maybe": 0, "no": 0, "failed": 0}'::jsonb,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_start TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Call Attempts Table
CREATE TABLE IF NOT EXISTS call_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES calling_campaigns(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    call_sid VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'no_answer', 'busy')),
    response_category VARCHAR(50) CHECK (response_category IN ('yes', 'maybe', 'no', 'call_back')),
    response_notes TEXT,
    attendance_confirmed BOOLEAN DEFAULT false,
    follow_up_sent BOOLEAN DEFAULT false,
    cost DECIMAL(10,4) DEFAULT 0.00,
    duration INTEGER DEFAULT 0,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    recording_url TEXT,
    error_message TEXT
);

-- 4. Attendance Tracking Table
CREATE TABLE IF NOT EXISTS attendance_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('call_campaign', 'manual', 'other')),
    status VARCHAR(50) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'maybe', 'declined')),
    campaign_id UUID REFERENCES calling_campaigns(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- 5. Follow-up Messages Table
CREATE TABLE IF NOT EXISTS follow_up_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_attempt_id UUID REFERENCES call_attempts(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'sms' CHECK (message_type IN ('sms', 'email')),
    content TEXT NOT NULL,
    twilio_message_sid VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_received BOOLEAN DEFAULT false,
    response_content TEXT
);

-- 6. Campaign Summaries Table
CREATE TABLE IF NOT EXISTS campaign_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID REFERENCES calling_campaigns(id) ON DELETE CASCADE,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    responses JSONB DEFAULT '{"yes": 0, "maybe": 0, "no": 0, "call_back": 0}'::jsonb,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    cost_per_call DECIMAL(10,4) DEFAULT 0.00,
    average_duration INTEGER DEFAULT 0,
    attendance_conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. VAPI Call Logs Table
CREATE TABLE IF NOT EXISTS vapi_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES people(id) ON DELETE CASCADE,
    vapi_call_id TEXT,
    call_status TEXT,
    call_duration INT,
    phone_number_used TEXT,
    call_summary TEXT,
    full_transcript TEXT,
    member_response_type member_response_type,
    likelihood_to_return VARCHAR(50),
    specific_interests TEXT[],
    prayer_requests TEXT[],
    crisis_indicators BOOLEAN DEFAULT FALSE,
    crisis_details TEXT,
    follow_up_needed BOOLEAN DEFAULT FALSE,
    follow_up_type follow_up_type,
    notes TEXT,
    escalation_priority escalation_priority,
    needs_pastoral_care BOOLEAN DEFAULT FALSE,
    assistant_id TEXT,
    raw_vapi_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Escalation Alerts Table
CREATE TABLE IF NOT EXISTS escalation_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    vapi_call_log_id UUID NOT NULL REFERENCES vapi_call_logs(id) ON DELETE CASCADE,
    status escalation_status NOT NULL DEFAULT 'open',
    priority escalation_priority NOT NULL DEFAULT 'medium',
    alert_type VARCHAR(100),
    alert_message TEXT,
    assigned_to UUID,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calling_scripts_organization ON calling_scripts(organization_id);
CREATE INDEX IF NOT EXISTS idx_calling_campaigns_organization ON calling_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_calling_campaigns_status ON calling_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_call_attempts_campaign ON call_attempts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_call_attempts_person ON call_attempts(person_id);
CREATE INDEX IF NOT EXISTS idx_call_attempts_status ON call_attempts(status);
CREATE INDEX IF NOT EXISTS idx_attendance_tracking_person ON attendance_tracking(person_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tracking_campaign ON attendance_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_messages_attempt ON follow_up_messages(call_attempt_id);
CREATE INDEX IF NOT EXISTS idx_campaign_summaries_campaign ON campaign_summaries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_vapi_call_logs_organization ON vapi_call_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_vapi_call_logs_member ON vapi_call_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_escalation_alerts_organization ON escalation_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_escalation_alerts_status ON escalation_alerts(status);
CREATE INDEX IF NOT EXISTS idx_escalation_alerts_priority ON escalation_alerts(priority);

-- Enable RLS
ALTER TABLE calling_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calling_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vapi_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calling_scripts
CREATE POLICY "Users can view scripts in their organization" ON calling_scripts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create scripts in their organization" ON calling_scripts
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for calling_campaigns
CREATE POLICY "Users can view campaigns in their organization" ON calling_campaigns
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create campaigns in their organization" ON calling_campaigns
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update campaigns in their organization" ON calling_campaigns
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for call_attempts
CREATE POLICY "Users can view call attempts in their organization" ON call_attempts
    FOR SELECT USING (
        campaign_id IN (
            SELECT id FROM calling_campaigns
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage call attempts in their organization" ON call_attempts
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM calling_campaigns
            WHERE organization_id IN (
                SELECT organization_id FROM organization_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for vapi_call_logs
CREATE POLICY "Users can view call logs in their organization" ON vapi_call_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage call logs in their organization" ON vapi_call_logs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for escalation_alerts
CREATE POLICY "Users can view escalation alerts in their organization" ON escalation_alerts
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update escalation alerts in their organization" ON escalation_alerts
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage escalation alerts in their organization" ON escalation_alerts
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_vapi_call_logs_updated_at
    BEFORE UPDATE ON vapi_call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalation_alerts_updated_at
    BEFORE UPDATE ON escalation_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
