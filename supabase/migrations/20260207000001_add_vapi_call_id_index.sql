-- Add index on vapi_call_id for faster webhook lookups
-- This improves the performance of the vapi-webhook function when updating call records

CREATE INDEX IF NOT EXISTS idx_vapi_call_logs_vapi_call_id ON vapi_call_logs(vapi_call_id);

-- Also add index on call_attempts.call_sid for faster lookups
CREATE INDEX IF NOT EXISTS idx_call_attempts_call_sid ON call_attempts(call_sid);
