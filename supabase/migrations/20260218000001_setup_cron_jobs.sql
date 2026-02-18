-- Migration: Set up pg_cron schedules for automation edge functions
-- Requires: pg_cron and pg_net extensions (pg_net already enabled in 20240325000003)
--
-- IMPORTANT: After applying this migration, you MUST set these in Supabase Dashboard → SQL Editor:
--   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- These are read by the cron jobs to authenticate with edge functions.

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Enable pg_net if not already enabled (should already exist from escalation migration)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role (required for pg_cron to work)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove any existing schedules with these names (idempotent)
SELECT cron.unschedule(job_name)
FROM cron.job
WHERE jobname IN ('execute-scheduled-outreach', 'process-automations', 'auto-call-trigger');

-- Every 5 minutes: Execute scheduled outreach (SMS and calls from the Communications page)
SELECT cron.schedule(
  'execute-scheduled-outreach',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/execute-scheduled-outreach',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Every 15 minutes: Process birthday/anniversary SMS automations
SELECT cron.schedule(
  'process-automations',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/process-automations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Every 10 minutes: Auto-call trigger (birthday/first_timer/anniversary calls)
SELECT cron.schedule(
  'auto-call-trigger',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/auto-call-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Schedules automation edge functions: execute-scheduled-outreach (5min), process-automations (15min), auto-call-trigger (10min)';
