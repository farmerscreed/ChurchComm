-- Migration: Add escalation notification trigger
-- When an escalation_alert is inserted, notify admins/pastors via edge function

-- Add notification_sent_at column
ALTER TABLE escalation_alerts
    ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- Enable pg_net extension for async HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create the trigger function using pg_net for async invocation
CREATE OR REPLACE FUNCTION notify_escalation_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  payload TEXT;
BEGIN
  -- Get configuration from Supabase vault/settings
  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://hxeqqgwcdnzxpwtsuuvv.supabase.co'
  );
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Build JSON payload
  payload := json_build_object(
    'record', json_build_object(
      'id', NEW.id,
      'organization_id', NEW.organization_id,
      'member_id', NEW.member_id,
      'alert_type', NEW.alert_type,
      'priority', NEW.priority::text,
      'alert_message', NEW.alert_message,
      'vapi_call_log_id', NEW.vapi_call_log_id
    )
  )::text;

  -- Make async HTTP POST to edge function
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-escalation-notification',
    body := payload,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    )::jsonb
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't block the insert
    RAISE WARNING 'Escalation notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on escalation_alerts insert
DROP TRIGGER IF EXISTS on_escalation_alert_created ON escalation_alerts;
CREATE TRIGGER on_escalation_alert_created
    AFTER INSERT ON escalation_alerts
    FOR EACH ROW
    EXECUTE FUNCTION notify_escalation_alert();

COMMENT ON FUNCTION notify_escalation_alert IS 'Async notification trigger: calls send-escalation-notification edge function when an escalation alert is created.';
