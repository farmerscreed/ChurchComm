-- Function to get dashboard stats efficiently
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_organization_id UUID)
RETURNS TABLE (
  total_calls BIGINT,
  total_minutes DOUBLE PRECISION,
  active_campaigns BIGINT,
  open_escalations BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM vapi_call_logs WHERE organization_id = p_organization_id) as total_calls,
    (SELECT COALESCE(SUM(call_duration), 0) / 60.0 FROM vapi_call_logs WHERE organization_id = p_organization_id) as total_minutes,
    (SELECT COUNT(*) FROM calling_campaigns WHERE organization_id = p_organization_id AND status = 'active') as active_campaigns,
    (SELECT COUNT(*) FROM vapi_call_logs WHERE organization_id = p_organization_id AND escalation_status = 'open') as open_escalations;
END;
$$;
