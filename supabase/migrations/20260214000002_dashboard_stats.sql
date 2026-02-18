-- Function to get dashboard stats efficiently
-- Only counts calls within the current billing period (current_period_end - 1 month)
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_organization_id UUID)
RETURNS TABLE (
  total_calls BIGINT,
  total_minutes DOUBLE PRECISION,
  active_campaigns BIGINT,
  open_escalations BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  period_start TIMESTAMPTZ;
BEGIN
  -- Calculate current billing period start from current_period_end - 1 month
  SELECT COALESCE(
    o.current_period_end - INTERVAL '1 month',
    o.created_at
  ) INTO period_start
  FROM organizations o
  WHERE o.id = p_organization_id;

  -- Default to 30 days ago if no org found
  IF period_start IS NULL THEN
    period_start := NOW() - INTERVAL '30 days';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM vapi_call_logs WHERE organization_id = p_organization_id AND created_at >= period_start) as total_calls,
    (SELECT COALESCE(SUM(call_duration), 0)::double precision / 60.0 FROM vapi_call_logs WHERE organization_id = p_organization_id AND created_at >= period_start) as total_minutes,
    (SELECT COUNT(*) FROM calling_campaigns WHERE organization_id = p_organization_id AND status = 'active') as active_campaigns,
    (SELECT COUNT(*) FROM vapi_call_logs WHERE organization_id = p_organization_id AND created_at >= period_start AND escalation_priority IS NOT NULL AND needs_pastoral_care = true AND escalation_status = 'open') as open_escalations;
END;
$$;
