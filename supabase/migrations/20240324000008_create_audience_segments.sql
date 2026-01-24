-- Migration 8: Create audience_segments table for saved audience filters

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

-- Enable RLS
ALTER TABLE audience_segments ENABLE ROW LEVEL SECURITY;

-- Policy: org members can SELECT
CREATE POLICY "Org members can view audience segments"
    ON audience_segments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = audience_segments.organization_id
        AND user_id = auth.uid()
    ));

-- Policy: admins and pastors can INSERT
CREATE POLICY "Admins and pastors can create audience segments"
    ON audience_segments FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = audience_segments.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

-- Policy: admins and pastors can UPDATE
CREATE POLICY "Admins and pastors can update audience segments"
    ON audience_segments FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = audience_segments.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

-- Policy: admins and pastors can DELETE
CREATE POLICY "Admins and pastors can delete audience segments"
    ON audience_segments FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = audience_segments.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pastor')
    ));

-- Add updated_at trigger
CREATE TRIGGER update_audience_segments_updated_at
    BEFORE UPDATE ON audience_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add index for org lookups
CREATE INDEX idx_audience_segments_org
    ON audience_segments(organization_id);

-- Add comments
COMMENT ON TABLE audience_segments IS 'Saved audience segment definitions with filter criteria for targeting campaigns.';
COMMENT ON COLUMN audience_segments.filters IS 'JSONB filter criteria (e.g., member_status, tags, groups, stage).';
