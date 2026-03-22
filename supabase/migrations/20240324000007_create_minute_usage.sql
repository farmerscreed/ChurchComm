-- Migration 7: Create minute_usage table for tracking AI calling minutes

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

-- Enable RLS
ALTER TABLE minute_usage ENABLE ROW LEVEL SECURITY;

-- Policy: org members can SELECT
CREATE POLICY "Org members can view minute usage"
    ON minute_usage FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = minute_usage.organization_id
        AND user_id = auth.uid()
    ));

-- Policy: admins can UPDATE (for overage_approved)
CREATE POLICY "Admins can update minute usage"
    ON minute_usage FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = minute_usage.organization_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ));

-- Add index for efficient lookups by org and period
CREATE INDEX idx_minute_usage_org_period
    ON minute_usage(organization_id, billing_period_start DESC);

-- Add comments
COMMENT ON TABLE minute_usage IS 'Tracks AI calling minute usage per organization per billing period.';
COMMENT ON COLUMN minute_usage.minutes_included IS 'Number of minutes included in the current subscription tier.';
COMMENT ON COLUMN minute_usage.overage_approved IS 'Whether the admin has approved going over the included minutes.';
