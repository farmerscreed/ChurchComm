-- ============================================================================
-- EPIC 1: Database & Data Model Refinement - Combined Migration Script
-- Project: ChurchComm V2 (hxeqqgwcdnzxpwtsuuvv)
-- Apply via: supabase db push --project-ref hxeqqgwcdnzxpwtsuuvv
-- Or execute directly via Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Rename communication_campaigns to messaging_campaigns
-- ============================================================================

DROP POLICY IF EXISTS "Users can view campaigns for their organization" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can create campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can update campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Org members can view communication campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can create communication campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can update communication campaigns" ON communication_campaigns;
DROP POLICY IF EXISTS "Admins can delete communication campaigns" ON communication_campaigns;

ALTER TABLE communication_campaigns RENAME TO messaging_campaigns;

ALTER TABLE messaging_campaigns
    RENAME CONSTRAINT communication_campaigns_organization_id_fkey
    TO messaging_campaigns_organization_id_fkey;

CREATE POLICY "Org members can view messaging campaigns"
    ON messaging_campaigns FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = messaging_campaigns.organization_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Admins can create messaging campaigns"
    ON messaging_campaigns FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = messaging_campaigns.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ));

CREATE POLICY "Admins can update messaging campaigns"
    ON messaging_campaigns FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = messaging_campaigns.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ));

CREATE POLICY "Admins can delete messaging campaigns"
    ON messaging_campaigns FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = messaging_campaigns.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ));

-- ============================================================================
-- MIGRATION 2: Drop calling_scripts table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Admins can manage calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Org members can view calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Admins can create calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Admins can update calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Admins can delete calling scripts" ON calling_scripts;

DROP TABLE IF EXISTS calling_scripts CASCADE;

-- ============================================================================
-- MIGRATION 3: Add 'pastor' role support
-- ============================================================================

ALTER TABLE organization_members
    DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('admin', 'pastor', 'member'));

ALTER TABLE invitations
    DROP CONSTRAINT IF EXISTS invitations_role_check;

ALTER TABLE invitations
    ADD CONSTRAINT invitations_role_check
    CHECK (role IN ('admin', 'pastor', 'leader', 'member'));

-- ============================================================================
-- MIGRATION 4: Add fields to people table
-- ============================================================================

ALTER TABLE people
    ADD COLUMN IF NOT EXISTS do_not_call BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN people.do_not_call IS 'Flag to prevent AI calling system from contacting this person.';
COMMENT ON COLUMN people.is_demo IS 'Flag indicating this is demo/sample data that should be cleaned up when real data is added.';

-- ============================================================================
-- MIGRATION 5: Add fields to organizations table
-- ============================================================================

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS dedicated_phone_number TEXT,
    ADD COLUMN IF NOT EXISTS phone_number_type TEXT DEFAULT 'shared',
    ADD COLUMN IF NOT EXISTS calling_window_start TIME DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS calling_window_end TIME DEFAULT '20:00',
    ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS estimated_size TEXT,
    ADD COLUMN IF NOT EXISTS preferred_channels TEXT[];

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS credit_card_on_file BOOLEAN DEFAULT FALSE;

ALTER TABLE organizations
    ADD CONSTRAINT organizations_phone_number_type_check
    CHECK (phone_number_type IN ('shared', 'dedicated'));

ALTER TABLE organizations
    ADD CONSTRAINT organizations_subscription_tier_check
    CHECK (subscription_tier IN ('trial', 'starter', 'growth', 'enterprise'));

ALTER TABLE organizations
    ADD CONSTRAINT organizations_billing_cycle_check
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'annual'));

COMMENT ON COLUMN organizations.dedicated_phone_number IS 'Dedicated phone number assigned to this organization for outbound calls.';
COMMENT ON COLUMN organizations.phone_number_type IS 'Whether the org uses a shared or dedicated phone number.';
COMMENT ON COLUMN organizations.calling_window_start IS 'Earliest time of day calls can be made (in org timezone).';
COMMENT ON COLUMN organizations.calling_window_end IS 'Latest time of day calls can be made (in org timezone).';
COMMENT ON COLUMN organizations.timezone IS 'IANA timezone identifier for the organization.';
COMMENT ON COLUMN organizations.subscription_tier IS 'Current subscription tier: trial, starter, growth, or enterprise.';
COMMENT ON COLUMN organizations.trial_ends_at IS 'When the trial period expires.';

-- ============================================================================
-- MIGRATION 6: Create notification_preferences table
-- ============================================================================

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

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
    ON notification_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE notification_preferences IS 'Per-user per-organization notification settings for escalations and summaries.';

-- ============================================================================
-- MIGRATION 7: Create minute_usage table
-- ============================================================================

CREATE TABLE minute_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    minutes_used DECIMAL DEFAULT 0,
    minutes_included INTEGER NOT NULL,
    overage_approved BOOLEAN DEFAULT FALSE,
    warning_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, billing_period_start)
);

ALTER TABLE minute_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view minute usage"
    ON minute_usage FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = minute_usage.organization_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Admins can update minute usage"
    ON minute_usage FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = minute_usage.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ));

CREATE INDEX idx_minute_usage_org_period
    ON minute_usage(organization_id, billing_period_start DESC);

COMMENT ON TABLE minute_usage IS 'Tracks AI calling minute usage per organization per billing period.';
COMMENT ON COLUMN minute_usage.minutes_included IS 'Number of minutes included in the current subscription tier.';
COMMENT ON COLUMN minute_usage.overage_approved IS 'Whether the admin has approved going over the included minutes.';

-- ============================================================================
-- MIGRATION 8: Create audience_segments table
-- ============================================================================

CREATE TABLE audience_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view audience segments"
    ON audience_segments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = audience_segments.organization_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Admins and pastors can create audience segments"
    ON audience_segments FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = audience_segments.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

CREATE POLICY "Admins and pastors can update audience segments"
    ON audience_segments FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = audience_segments.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

CREATE POLICY "Admins and pastors can delete audience segments"
    ON audience_segments FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = audience_segments.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

CREATE TRIGGER update_audience_segments_updated_at
    BEFORE UPDATE ON audience_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_audience_segments_org
    ON audience_segments(organization_id);

COMMENT ON TABLE audience_segments IS 'Saved audience segment definitions with filter criteria for targeting campaigns.';
COMMENT ON COLUMN audience_segments.filters IS 'JSONB filter criteria (e.g., member_status, tags, groups, stage).';

-- ============================================================================
-- MIGRATION 9: Create auto_triggers table
-- ============================================================================

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

ALTER TABLE auto_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view auto triggers"
    ON auto_triggers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = auto_triggers.organization_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Admins and pastors can create auto triggers"
    ON auto_triggers FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = auto_triggers.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

CREATE POLICY "Admins and pastors can update auto triggers"
    ON auto_triggers FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = auto_triggers.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

CREATE POLICY "Admins and pastors can delete auto triggers"
    ON auto_triggers FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = auto_triggers.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

CREATE TRIGGER update_auto_triggers_updated_at
    BEFORE UPDATE ON auto_triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_auto_triggers_org
    ON auto_triggers(organization_id);

COMMENT ON TABLE auto_triggers IS 'Configuration for automated calling triggers (first-timer, birthday, anniversary).';
COMMENT ON COLUMN auto_triggers.delay_hours IS 'Hours to wait after the triggering event before making the call.';
COMMENT ON COLUMN auto_triggers.anniversary_milestones IS 'Array of month milestones for anniversary triggers (e.g., {1,12} = 1 month and 12 months).';

-- ============================================================================
-- MIGRATION 10: Add template/voice fields to call_scripts
-- ============================================================================

ALTER TABLE call_scripts
    ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS template_type TEXT,
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS voice_id TEXT,
    ADD COLUMN IF NOT EXISTS voice_name TEXT;

ALTER TABLE call_scripts
    ALTER COLUMN organization_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_call_scripts_system_template_type
    ON call_scripts(template_type)
    WHERE is_system = TRUE AND organization_id IS NULL;

DROP POLICY IF EXISTS "Users can view call scripts" ON call_scripts;
DROP POLICY IF EXISTS "Org members can view call scripts" ON call_scripts;
DROP POLICY IF EXISTS "Admins can create call scripts" ON call_scripts;
DROP POLICY IF EXISTS "Admins can update call scripts" ON call_scripts;
DROP POLICY IF EXISTS "Admins can delete call scripts" ON call_scripts;

CREATE POLICY "Users can view org and system call scripts"
    ON call_scripts FOR SELECT
    USING (
        (is_system = TRUE)
        OR
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = call_scripts.organization_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and pastors can create call scripts"
    ON call_scripts FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = call_scripts.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

CREATE POLICY "Admins and pastors can update call scripts"
    ON call_scripts FOR UPDATE
    USING (
        is_system = FALSE
        AND EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = call_scripts.organization_id
            AND user_id = auth.uid()
            AND role IN ('admin', 'pastor')
        )
    );

CREATE POLICY "Admins and pastors can delete call scripts"
    ON call_scripts FOR DELETE
    USING (
        is_system = FALSE
        AND EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = call_scripts.organization_id
            AND user_id = auth.uid()
            AND role IN ('admin', 'pastor')
        )
    );

COMMENT ON COLUMN call_scripts.is_template IS 'Whether this script is a reusable template.';
COMMENT ON COLUMN call_scripts.template_type IS 'Type identifier for system templates (e.g., first_timer_followup, birthday_greeting).';
COMMENT ON COLUMN call_scripts.is_system IS 'System templates are read-only and available to all organizations.';
COMMENT ON COLUMN call_scripts.voice_id IS 'AI voice provider voice ID to use with this script.';
COMMENT ON COLUMN call_scripts.voice_name IS 'Human-readable name of the selected voice.';

-- ============================================================================
-- MIGRATION 11: Create member_memories table with vector search
-- ============================================================================

CREATE TABLE member_memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(768),
    memory_type TEXT NOT NULL CHECK (memory_type IN ('call_summary', 'prayer_request', 'personal_note', 'preference')),
    source_call_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_member_memories_embedding
    ON member_memories
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_member_memories_person
    ON member_memories(person_id);

CREATE INDEX idx_member_memories_org
    ON member_memories(organization_id);

CREATE INDEX idx_member_memories_type
    ON member_memories(person_id, memory_type);

ALTER TABLE member_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view member memories"
    ON member_memories FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = member_memories.organization_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Org members can create member memories"
    ON member_memories FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = member_memories.organization_id
        AND user_id = auth.uid()
    ));

CREATE OR REPLACE FUNCTION match_member_memories(
    p_person_id UUID,
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    memory_type TEXT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mm.id,
        mm.content,
        mm.memory_type,
        (1 - (mm.embedding <=> query_embedding))::FLOAT AS similarity,
        mm.created_at
    FROM member_memories mm
    WHERE mm.person_id = p_person_id
    AND 1 - (mm.embedding <=> query_embedding) > match_threshold
    ORDER BY mm.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON TABLE member_memories IS 'Stores AI-generated memories about church members from calls, notes, and interactions.';
COMMENT ON COLUMN member_memories.embedding IS '768-dimensional vector embedding for semantic similarity search.';
COMMENT ON COLUMN member_memories.memory_type IS 'Category of memory: call_summary, prayer_request, personal_note, or preference.';
COMMENT ON COLUMN member_memories.source_call_id IS 'Reference to the call that generated this memory (if applicable).';
COMMENT ON FUNCTION match_member_memories IS 'Semantic search across member memories using vector similarity.';

-- ============================================================================
-- MIGRATION 12: Seed script templates
-- ============================================================================

INSERT INTO call_scripts (id, organization_id, name, description, content, is_template, template_type, is_system)
VALUES
(
    gen_random_uuid(),
    NULL,
    'First-Timer Welcome Call',
    'Warm welcome call for first-time visitors to the church. Designed to make them feel valued and gather initial impressions.',
    E'You are a warm and friendly AI calling assistant for {church_name}. You are calling {first_name} who visited our church for the first time recently.\n\nYour goals:\n1. Thank them sincerely for visiting {church_name}\n2. Ask how their experience was and if they felt welcomed\n3. Find out if they have any questions about the church, services, or ministries\n4. Let them know about upcoming events or services they might enjoy\n5. Ask if there is anything the church can pray about for them\n6. Invite them to return this coming Sunday\n\nTone: Warm, genuine, conversational. Not pushy or salesy. Like a friendly neighbor checking in.\n\nImportant guidelines:\n- If they mention any concerns or negative experiences, acknowledge them with empathy and note them for pastoral follow-up\n- If they mention a prayer request, express care and note it carefully\n- If they seem uninterested, thank them graciously and let them know the door is always open\n- Keep the call to 3-5 minutes unless they want to talk longer\n- End by saying "{pastor_name} and the whole church family hope to see you again soon"\n\nIf they do not answer, leave a brief voicemail: "Hi {first_name}, this is a friendly call from {church_name}. We just wanted to say thank you so much for visiting us! We hope you felt at home. If you have any questions, please do not hesitate to reach out. We would love to see you again. Have a blessed day!"',
    TRUE,
    'first_timer_followup',
    TRUE
),
(
    gen_random_uuid(),
    NULL,
    'Birthday Celebration Call',
    'A joyful birthday call to make members feel special and remembered on their birthday.',
    E'You are a cheerful and caring AI calling assistant for {church_name}. You are calling {first_name} to wish them a happy birthday!\n\nYour goals:\n1. Wish them a heartfelt happy birthday\n2. Let them know that {church_name} and {pastor_name} are thinking of them today\n3. Share a brief encouraging word or blessing for their new year of life\n4. Ask if there is anything the church can celebrate with them or pray about\n5. Remind them they are valued and loved in our church family\n\nTone: Joyful, celebratory, genuinely warm. Like a friend who is truly excited for them.\n\nImportant guidelines:\n- Be enthusiastic but not over-the-top artificial\n- If they share something they are going through, pivot to genuine care and listening\n- If they mention a birthday gathering, express excitement for them\n- Keep the call to 2-4 minutes\n- End with a birthday blessing: "May God bless you abundantly in this new year of life, {first_name}. {church_name} loves you!"\n\nIf they do not answer, leave a voicemail: "Happy birthday, {first_name}! This is a call from your friends at {church_name}. {pastor_name} and your church family wanted you to know we are celebrating YOU today! We hope your day is absolutely wonderful. Have a blessed birthday!"',
    TRUE,
    'birthday_greeting',
    TRUE
),
(
    gen_random_uuid(),
    NULL,
    'Member Wellness Check-in',
    'General wellness check-in call for members who have not been seen recently or need a touchpoint.',
    E'You are a caring and attentive AI calling assistant for {church_name}. You are calling {first_name} for a friendly check-in.\n\nYour goals:\n1. Let them know {church_name} has been thinking about them\n2. Ask how they are doing personally and if everything is okay\n3. Gently ask if there is anything the church can help with or pray about\n4. If they have been absent, express that they are missed without making them feel guilty\n5. Share any relevant upcoming events or community opportunities\n6. Remind them the church family cares about them\n\nTone: Caring, genuine, non-judgmental. Like a trusted friend checking in, not an attendance enforcer.\n\nImportant guidelines:\n- NEVER make them feel guilty about missing church\n- If they share struggles (health, family, financial, spiritual), listen empathetically and flag for pastoral care\n- If they mention feeling disconnected, gently suggest small group or ministry opportunities\n- If there are crisis indicators (depression, grief, major life changes), prioritize listening and escalate\n- Keep the call to 3-5 minutes unless they want to talk\n- End with: "{first_name}, we genuinely care about you. {pastor_name} and the whole team at {church_name} are here for you anytime."\n\nIf they do not answer, leave a voicemail: "Hi {first_name}, this is a call from {church_name}. We have been thinking about you and just wanted to check in and see how you are doing. No pressure at all - we just want you to know we care. Feel free to call us back anytime, or just know that {pastor_name} and your church family are always here for you. Have a great day!"',
    TRUE,
    'member_checkin',
    TRUE
),
(
    gen_random_uuid(),
    NULL,
    'Membership Anniversary Call',
    'Celebrating a member''s anniversary of joining the church community.',
    E'You are an enthusiastic and grateful AI calling assistant for {church_name}. You are calling {first_name} to celebrate their membership anniversary with the church!\n\nYour goals:\n1. Congratulate them on their anniversary with {church_name}\n2. Express genuine gratitude for their faithful commitment to the community\n3. Ask what {church_name} has meant to them during this time\n4. Ask if there are ways the church can better serve them in the coming year\n5. Invite them to share their story or get more involved if they are interested\n6. Thank them for being part of the family\n\nTone: Grateful, celebratory, honoring. Make them feel their presence and contribution matters.\n\nImportant guidelines:\n- Reference the milestone naturally (e.g., "Can you believe it has been a year since you joined our family!")\n- If they share positive experiences, affirm and celebrate with them\n- If they express any frustrations or unmet needs, listen carefully and note for follow-up\n- If they seem interested in deeper involvement, mention relevant ministry or leadership opportunities\n- Keep the call to 3-5 minutes\n- End with: "Thank you for being part of {church_name}, {first_name}. {pastor_name} and all of us are so grateful for you. Here is to many more years together!"\n\nIf they do not answer, leave a voicemail: "Hi {first_name}! We are calling from {church_name} to celebrate a special milestone - your anniversary with our church family! We are so grateful for your presence, your faithfulness, and everything you bring to our community. {pastor_name} wanted you to know how much you mean to us. Here is to many more years together! God bless you!"',
    TRUE,
    'anniversary_celebration',
    TRUE
),
(
    gen_random_uuid(),
    NULL,
    'Event Invitation Call',
    'Personal invitation to an upcoming church event, making members feel personally included.',
    E'You are a friendly and inviting AI calling assistant for {church_name}. You are calling {first_name} to personally invite them to an upcoming event.\n\nYour goals:\n1. Greet them warmly and let them know about the upcoming event\n2. Share key details: what, when, where, and why it will be meaningful\n3. Explain why you thought they specifically would enjoy it\n4. Answer any questions they might have about the event\n5. Ask if they can attend and if they would like to bring anyone\n6. If they cannot make it, graciously accept and mention future opportunities\n\nTone: Excited, personal, inviting but not pressuring. Like a friend who found something cool and wants to share it.\n\nImportant guidelines:\n- Make the invitation feel personal, not like a mass robocall\n- If they express interest, offer to help with any logistics (childcare, transportation, etc.)\n- If they decline, be genuinely understanding and mention you will keep them in mind for future events\n- If they mention barriers to attendance, note them for the church team\n- Keep the call to 2-4 minutes\n- End with: "We would really love to see you there, {first_name}! It would not be the same without you. Either way, we hope you have a wonderful week!"\n\nIf they do not answer, leave a voicemail: "Hi {first_name}, this is a call from {church_name}! We have an exciting event coming up and we immediately thought of you. We would love to tell you about it - feel free to call us back or check our website for details. We hope to see you there! Have a great day!"',
    TRUE,
    'event_invitation',
    TRUE
),
(
    gen_random_uuid(),
    NULL,
    'Prayer Request Follow-up',
    'Compassionate follow-up call after someone shared a prayer request, checking on their situation.',
    E'You are a compassionate and prayerful AI calling assistant for {church_name}. You are calling {first_name} to follow up on a prayer request they shared with us.\n\nYour goals:\n1. Let them know the church has been praying for them\n2. Gently ask how things are going with the situation they shared\n3. Listen with empathy and care to any updates\n4. Ask if there are any new prayer needs or if the original request has changed\n5. Offer practical support if appropriate (meals, visits, resources)\n6. Assure them of continued prayer and support\n\nTone: Gentle, compassionate, pastoral. Like someone who genuinely cares and has been thinking about them. Never prying or nosy.\n\nImportant guidelines:\n- Be sensitive - they may not want to discuss details. Respect boundaries.\n- If things have improved, celebrate with them and give thanks\n- If things have worsened or are ongoing, express deep empathy and ask how the church can practically help\n- If there are crisis indicators, prioritize listening and escalate to pastoral care\n- Never offer medical, legal, or professional advice - offer to connect them with appropriate resources\n- Keep the call to 3-6 minutes (prayer follow-ups may naturally be longer)\n- End with: "{first_name}, please know that {pastor_name} and your {church_name} family are continuing to lift you up in prayer. You are not alone in this. We are here for you anytime."\n\nIf they do not answer, leave a voicemail: "Hi {first_name}, this is a call from {church_name}. We have been keeping you in our prayers and just wanted to check in and see how you are doing. We care about you and want you to know we are here for you. Feel free to call us back anytime, or just know that {pastor_name} and your church family are continuing to pray for you. God bless you."',
    TRUE,
    'prayer_followup',
    TRUE
);

-- ============================================================================
-- MIGRATION 13: Create demo data cleanup trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_demo_data_on_real_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    has_demo_data BOOLEAN;
BEGIN
    -- Only proceed if the newly inserted person is NOT demo data
    IF NEW.is_demo = FALSE THEN
        -- Check if this organization has any demo data
        SELECT EXISTS (
            SELECT 1 FROM people
            WHERE organization_id = NEW.organization_id
            AND is_demo = TRUE
            AND id != NEW.id
        ) INTO has_demo_data;

        -- If demo data exists, delete it
        IF has_demo_data THEN
            DELETE FROM people
            WHERE organization_id = NEW.organization_id
            AND is_demo = TRUE
            AND id != NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cleanup_demo_data
    AFTER INSERT ON people
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_demo_data_on_real_insert();

COMMENT ON FUNCTION cleanup_demo_data_on_real_insert IS 'Automatically removes demo/sample data from an organization when real member data is first added.';
