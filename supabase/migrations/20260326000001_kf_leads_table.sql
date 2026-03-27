-- KeepFlock leads table — stores leads from public eligibility checker, demo calls, and other sources
-- This table is accessed via service_role only (public endpoints use admin client)

CREATE TABLE IF NOT EXISTS kf_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(200) NOT NULL,
    first_name VARCHAR(100),
    church_name VARCHAR(200),
    phone VARCHAR(20),
    source VARCHAR(100) NOT NULL DEFAULT 'eligibility_checker',
    eligibility_result JSONB,
    demo_call_requested BOOLEAN DEFAULT false,
    demo_call_completed BOOLEAN DEFAULT false,
    demo_call_outcome VARCHAR(50),
    nurture_sequence_started BOOLEAN DEFAULT false,
    converted_to_signup BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'new',
    ip_hash VARCHAR(64),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kf_leads_email ON kf_leads(email);
CREATE INDEX IF NOT EXISTS idx_kf_leads_source ON kf_leads(source);
CREATE INDEX IF NOT EXISTS idx_kf_leads_status ON kf_leads(status);
CREATE INDEX IF NOT EXISTS idx_kf_leads_created_at ON kf_leads(created_at DESC);

-- No RLS — only service_role accesses this table via edge functions
ALTER TABLE kf_leads ENABLE ROW LEVEL SECURITY;
