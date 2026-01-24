-- Communications Schema Migration
-- Core tables for SMS and calling campaigns

-- 1. Communication Campaigns Table
CREATE TABLE IF NOT EXISTS communication_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'call', 'push')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'paused', 'cancelled')),
    subject VARCHAR(500), -- For emails
    content TEXT NOT NULL,
    target_audience JSONB NOT NULL DEFAULT '{}'::jsonb,
    recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    responded_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Communication Templates Table
CREATE TABLE IF NOT EXISTS communication_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'call')),
    category VARCHAR(100) NOT NULL,
    subject VARCHAR(500), -- For emails
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names like ["Name", "EventDate"]
    is_system BOOLEAN DEFAULT false, -- System templates vs user templates
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Campaign Recipients Table (for tracking individual sends)
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'responded', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    external_id VARCHAR(255), -- For tracking with external services (Twilio, SendGrid, etc.)
    cost DECIMAL(10,4) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, person_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_org_status ON communication_campaigns(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_type ON communication_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_communication_templates_org_type ON communication_templates(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_person ON campaign_recipients(person_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);

-- Enable RLS
ALTER TABLE communication_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns (using organization_members)
CREATE POLICY "Users can view campaigns from their organization" ON communication_campaigns
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create campaigns for their organization" ON communication_campaigns
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update campaigns from their organization" ON communication_campaigns
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Create RLS policies for templates
CREATE POLICY "Users can view templates from their organization" ON communication_templates
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        ) OR is_system = true
    );

CREATE POLICY "Users can create templates for their organization" ON communication_templates
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ));

-- Policies for recipients
CREATE POLICY "Users can view recipients from their organization campaigns" ON campaign_recipients
    FOR SELECT USING (campaign_id IN (
        SELECT id FROM communication_campaigns cc
        WHERE cc.organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can manage recipients for their organization campaigns" ON campaign_recipients
    FOR ALL USING (campaign_id IN (
        SELECT id FROM communication_campaigns cc
        WHERE cc.organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    ));
