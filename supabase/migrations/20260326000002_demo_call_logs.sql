-- Demo call logs — tracks AI sales demo calls made to leads from the landing page

CREATE TABLE IF NOT EXISTS demo_call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES kf_leads(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    first_name VARCHAR(100),
    church_name VARCHAR(200),
    vapi_call_id VARCHAR(100),
    status VARCHAR(30) DEFAULT 'initiated',
    duration_seconds INTEGER,
    call_outcome VARCHAR(50),
    transcript TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_call_logs_lead_id ON demo_call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_demo_call_logs_phone ON demo_call_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_demo_call_logs_created_at ON demo_call_logs(created_at DESC);

ALTER TABLE demo_call_logs ENABLE ROW LEVEL SECURITY;
