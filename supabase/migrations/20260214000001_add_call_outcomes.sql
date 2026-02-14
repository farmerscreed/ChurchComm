-- Add ended_reason and escalation_status to vapi_call_logs
ALTER TABLE vapi_call_logs 
ADD COLUMN IF NOT EXISTS ended_reason TEXT,
ADD COLUMN IF NOT EXISTS escalation_status TEXT DEFAULT 'resolved';

-- Index for filtering open escalations
CREATE INDEX IF NOT EXISTS idx_vapi_call_logs_escalation_status ON vapi_call_logs(escalation_status);
