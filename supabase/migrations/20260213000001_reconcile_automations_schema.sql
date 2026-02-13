-- Reconciliation migration: Ensure automations and scheduled_messages tables
-- have all columns expected by the frontend and edge functions.
-- Uses ADD COLUMN IF NOT EXISTS for safety regardless of prior migration state.

-- ============================================================
-- 1. Fix automations table - add columns the frontend expects
-- ============================================================

-- Add action_type column (TEXT) - frontend saves 'send_sms', 'make_call', etc.
ALTER TABLE automations ADD COLUMN IF NOT EXISTS action_type TEXT;

-- Add action_config JSONB column - stores {message_template, message_content, script_id}
ALTER TABLE automations ADD COLUMN IF NOT EXISTS action_config JSONB DEFAULT '{}';

-- Add trigger_config JSONB column - stores {send_time, days_before, delay_hours, group_ids}
ALTER TABLE automations ADD COLUMN IF NOT EXISTS trigger_config JSONB DEFAULT '{}';

-- Add target_groups column - groups this automation applies to
ALTER TABLE automations ADD COLUMN IF NOT EXISTS target_groups UUID[] DEFAULT '{}';

-- Add total_executions column - tracks how many times automation has run
ALTER TABLE automations ADD COLUMN IF NOT EXISTS total_executions INTEGER DEFAULT 0;

-- Add last_executed_at column
ALTER TABLE automations ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMPTZ;

-- Ensure description column exists
ALTER TABLE automations ADD COLUMN IF NOT EXISTS description TEXT;

-- Migrate data from old columns to new if they exist
-- (message_template -> action_config.message_template, message_type -> action_type)
DO $$
BEGIN
  -- If the old message_template column exists, migrate data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automations' AND column_name = 'message_template' AND table_schema = 'public'
  ) THEN
    UPDATE automations
    SET action_config = jsonb_build_object('message_template', message_template)
    WHERE action_config = '{}'::jsonb AND message_template IS NOT NULL;
  END IF;

  -- If the old message_type column exists, use it to populate action_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automations' AND column_name = 'message_type' AND table_schema = 'public'
  ) THEN
    UPDATE automations
    SET action_type = CASE
      WHEN message_type = 'sms' THEN 'send_sms'
      WHEN message_type = 'email' THEN 'send_email'
      WHEN message_type = 'call' THEN 'make_call'
      ELSE message_type
    END
    WHERE action_type IS NULL AND message_type IS NOT NULL;
  END IF;

  -- Migrate total_sent to total_executions if applicable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automations' AND column_name = 'total_sent' AND table_schema = 'public'
  ) THEN
    UPDATE automations
    SET total_executions = total_sent
    WHERE total_executions = 0 AND total_sent > 0;
  END IF;

  -- Migrate last_run_at to last_executed_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'automations' AND column_name = 'last_run_at' AND table_schema = 'public'
  ) THEN
    UPDATE automations
    SET last_executed_at = last_run_at
    WHERE last_executed_at IS NULL AND last_run_at IS NOT NULL;
  END IF;
END $$;

-- If trigger_type is an enum type, convert to TEXT for flexibility
-- (frontend uses values like 'group_join', 'first_visit', 'birthday' etc.)
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'automations' AND column_name = 'trigger_type' AND table_schema = 'public';

  IF col_type = 'USER-DEFINED' THEN
    -- Convert enum to TEXT
    ALTER TABLE automations ALTER COLUMN trigger_type TYPE TEXT USING trigger_type::TEXT;
  END IF;
END $$;

-- If status is an enum type, convert to TEXT for flexibility
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'automations' AND column_name = 'status' AND table_schema = 'public';

  IF col_type = 'USER-DEFINED' THEN
    ALTER TABLE automations ALTER COLUMN status TYPE TEXT USING status::TEXT;
    ALTER TABLE automations ALTER COLUMN status SET DEFAULT 'active';
  END IF;
END $$;


-- ============================================================
-- 2. Fix scheduled_messages table
-- ============================================================

-- Add subject column (used to store script_id for AI calls)
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add content column (if table was created with message_content instead)
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS content TEXT;

-- Add sent_count and failed_count if missing
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;

-- Add recipient_type and recipient_ids if missing
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS recipient_type TEXT DEFAULT 'all';
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS recipient_ids UUID[] DEFAULT '{}';

-- Migrate data from old column names if they exist
DO $$
BEGIN
  -- Migrate message_content -> content
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_messages' AND column_name = 'message_content' AND table_schema = 'public'
  ) THEN
    UPDATE scheduled_messages
    SET content = message_content
    WHERE content IS NULL AND message_content IS NOT NULL;
  END IF;

  -- Migrate message_subject -> subject
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_messages' AND column_name = 'message_subject' AND table_schema = 'public'
  ) THEN
    UPDATE scheduled_messages
    SET subject = message_subject
    WHERE subject IS NULL AND message_subject IS NOT NULL;
  END IF;
END $$;

-- Fix the message_type CHECK constraint to include 'call'
ALTER TABLE scheduled_messages DROP CONSTRAINT IF EXISTS scheduled_messages_message_type_check;
ALTER TABLE scheduled_messages
  ADD CONSTRAINT scheduled_messages_message_type_check
  CHECK (message_type IN ('sms', 'email', 'call'));

-- Fix the status CHECK constraint to include 'completed' and 'cancelled'
ALTER TABLE scheduled_messages DROP CONSTRAINT IF EXISTS scheduled_messages_status_check;
ALTER TABLE scheduled_messages
  ADD CONSTRAINT scheduled_messages_status_check
  CHECK (status IN ('scheduled', 'processing', 'sent', 'completed', 'failed', 'cancelled'));

-- Make 'name' column nullable (frontend doesn't provide it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_messages' AND column_name = 'name' AND is_nullable = 'NO' AND table_schema = 'public'
  ) THEN
    ALTER TABLE scheduled_messages ALTER COLUMN name DROP NOT NULL;
  END IF;
END $$;

-- Make 'content' column nullable for call types (they use subject for script_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_messages' AND column_name = 'content' AND is_nullable = 'NO' AND table_schema = 'public'
  ) THEN
    ALTER TABLE scheduled_messages ALTER COLUMN content DROP NOT NULL;
  END IF;

  -- Also make message_content nullable if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_messages' AND column_name = 'message_content' AND is_nullable = 'NO' AND table_schema = 'public'
  ) THEN
    ALTER TABLE scheduled_messages ALTER COLUMN message_content DROP NOT NULL;
  END IF;
END $$;


-- ============================================================
-- 3. Ensure automation_executions table has all needed columns
-- ============================================================

ALTER TABLE automation_executions ADD COLUMN IF NOT EXISTS message_sent TEXT;
ALTER TABLE automation_executions ADD COLUMN IF NOT EXISTS error_message TEXT;


-- ============================================================
-- 4. Add missing indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_automations_org_id ON automations(organization_id);
CREATE INDEX IF NOT EXISTS idx_automations_action_type ON automations(action_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_org_status ON scheduled_messages(organization_id, status);
