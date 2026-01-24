---
description: Create database trigger to invoke escalation notification on INSERT
epic: Epic 2 - Automated Calling & Workflows
task_id: 2.2b
---

## Context
When an escalation_alert is inserted into the database (typically from the vapi-webhook processing a crisis situation detected during a call), we need to automatically invoke the send-escalation-notification edge function.

## Prerequisites
- Task 2.2a complete (send-escalation-notification function exists)
- pg_net or http extension enabled in Supabase

## Implementation Steps

### 1. Create migration for the trigger

Create migration file `supabase/migrations/YYYYMMDDHHMMSS_escalation_notification_trigger.sql`:

```sql
-- Enable http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create function to call edge function
CREATE OR REPLACE FUNCTION notify_escalation_alert()
RETURNS TRIGGER AS $$
DECLARE
  service_role_key TEXT;
  supabase_url TEXT;
  request_id INT;
BEGIN
  -- Get Supabase URL from environment (stored in vault or as a constant)
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- For immediate (urgent/high priority) notifications
  IF NEW.priority IN ('urgent', 'high') THEN
    -- Call the edge function via http extension
    SELECT http_post(
      supabase_url || '/functions/v1/send-escalation-notification',
      json_build_object('record', row_to_json(NEW))::text,
      'application/json'
    ) INTO request_id;
  ELSE
    -- For medium/low priority, we could batch these (future enhancement)
    -- For now, still send immediately
    SELECT http_post(
      supabase_url || '/functions/v1/send-escalation-notification',
      json_build_object('record', row_to_json(NEW))::text,
      'application/json'
    ) INTO request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_escalation_alert_created ON escalation_alerts;
CREATE TRIGGER on_escalation_alert_created
  AFTER INSERT ON escalation_alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_escalation_alert();

-- Add notification_sent_at column if not exists
ALTER TABLE escalation_alerts 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP;
```

### 2. Alternative: Using Supabase Database Webhooks (Recommended)

If the http extension approach is complex, use Supabase's built-in Database Webhooks:

1. Go to Supabase Dashboard → Database → Webhooks
2. Create new webhook:
   - Name: `escalation-notification`
   - Table: `escalation_alerts`
   - Events: `INSERT`
   - HTTP Method: `POST`
   - URL: `https://<project-ref>.supabase.co/functions/v1/send-escalation-notification`
   - Headers: Add `Authorization: Bearer <service_role_key>`
   - Payload: Enable "Send payload"

### 3. Update the edge function to handle webhook payload format

The webhook sends data in this format:
```json
{
  "type": "INSERT",
  "table": "escalation_alerts",
  "record": { ... },
  "schema": "public",
  "old_record": null
}
```

Update the function to handle this:
```typescript
const body = await req.json();
const record = body.record || body; // Handle both direct and webhook formats
```

## Verification
1. Insert a test escalation_alert:
```sql
INSERT INTO escalation_alerts (organization_id, person_id, alert_type, priority, summary)
VALUES ('org-uuid', 'person-uuid', 'crisis', 'urgent', 'Member expressed feeling hopeless');
```

2. Check that the edge function was invoked
3. Verify notification_sent_at was updated
4. Check recipients received SMS/email

## On Completion
Update `activity.md` and mark task 2.2b as `[x]` in `implementation-order.md`
