-- Migration: Fix escalation notification trigger to use net.http_post (pg_net)
-- The original trigger used extensions.http_post (from the http extension),
-- which may not be available on all Supabase instances. pg_net's net.http_post
-- is the standard Supabase pattern for async HTTP calls from triggers.

CREATE OR REPLACE FUNCTION notify_escalation_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  payload JSONB;
BEGIN
  -- Get configuration from Supabase settings
  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://hxeqqgwcdnzxpwtsuuvv.supabase.co'
  );
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Build JSON payload
  payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'organization_id', NEW.organization_id,
      'member_id', NEW.member_id,
      'alert_type', NEW.alert_type,
      'priority', NEW.priority::text,
      'alert_message', NEW.alert_message,
      'vapi_call_log_id', NEW.vapi_call_log_id
    )
  );

  -- Make async HTTP POST via pg_net (replaces extensions.http_post)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-escalation-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't block the insert
    RAISE WARNING 'Escalation notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_escalation_alert IS 'Async notification trigger: calls send-escalation-notification edge function via pg_net when an escalation alert is created.';
