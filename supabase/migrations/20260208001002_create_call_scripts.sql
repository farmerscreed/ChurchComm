-- Create call_scripts table for AI call scripts and templates
CREATE TABLE IF NOT EXISTS call_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- Nullable for system templates
    name TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL, -- The actual script content/prompt
    voice_id TEXT, -- ID of the AI voice to use
    voice_name TEXT, -- Friendly name of the voice
    is_template BOOLEAN DEFAULT FALSE,
    template_type TEXT, -- e.g. 'first_timer_followup', 'birthday_greeting'
    is_system BOOLEAN DEFAULT FALSE, -- System templates available to all
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_scripts_org ON call_scripts(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_scripts_is_system ON call_scripts(is_system);
CREATE UNIQUE INDEX IF NOT EXISTS idx_call_scripts_system_template_type 
    ON call_scripts(template_type) 
    WHERE is_system = TRUE AND organization_id IS NULL;

-- Enable RLS
ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. VIEW: Users can view their org's scripts OR system templates
CREATE POLICY "Users can view org and system call scripts"
    ON call_scripts FOR SELECT
    USING (
        (is_system = TRUE)
        OR
        (organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
        ))
    );

-- 2. INSERT: Admins/Pastors can create scripts for their org
CREATE POLICY "Admins and pastors can create call scripts"
    ON call_scripts FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pastor')
        )
    );

-- 3. UPDATE: Admins/Pastors can update their org's scripts (not system ones)
CREATE POLICY "Admins and pastors can update call scripts"
    ON call_scripts FOR UPDATE
    USING (
        is_system = FALSE
        AND organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pastor')
        )
    );

-- 4. DELETE: Admins/Pastors can delete their org's scripts (not system ones)
CREATE POLICY "Admins and pastors can delete call scripts"
    ON call_scripts FOR DELETE
    USING (
        is_system = FALSE
        AND organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'pastor')
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_call_scripts_updated_at
    BEFORE UPDATE ON call_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
