-- Migration: Add VAPI execution tracking fields to call_attempts

ALTER TABLE call_attempts
    ADD COLUMN IF NOT EXISTS vapi_call_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Index for looking up calls by VAPI call ID (webhook processing)
CREATE INDEX IF NOT EXISTS idx_call_attempts_vapi_call_id ON call_attempts(vapi_call_id);

COMMENT ON COLUMN call_attempts.vapi_call_id IS 'VAPI call ID returned when the call is initiated.';
COMMENT ON COLUMN call_attempts.started_at IS 'Timestamp when the call was actually initiated via VAPI.';
COMMENT ON COLUMN call_attempts.retry_count IS 'Number of retry attempts for failed calls (max 2).';
