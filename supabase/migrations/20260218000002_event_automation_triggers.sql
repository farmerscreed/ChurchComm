-- Migration: DB triggers for event-based automations (group_join, group_leave, first_visit)
-- These triggers invoke the process-event-trigger edge function via pg_net

-- Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- Trigger: group_join (fires on INSERT into group_members)
-- ============================================================
CREATE OR REPLACE FUNCTION automation_on_group_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  person_org_id UUID;
BEGIN
  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://hxeqqgwcdnzxpwtsuuvv.supabase.co'
  );
  service_role_key := current_setting('app.settings.service_role_key', true);

  -- Get the person's organization_id
  SELECT organization_id INTO person_org_id
  FROM people
  WHERE id = NEW.person_id;

  IF person_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Invoke process-event-trigger edge function via pg_net
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/process-event-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := jsonb_build_object(
      'event_type', 'group_join',
      'person_id', NEW.person_id,
      'organization_id', person_org_id,
      'group_id', NEW.group_id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'automation_on_group_join trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_group_member_added ON group_members;
CREATE TRIGGER on_group_member_added
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION automation_on_group_join();

-- ============================================================
-- Trigger: group_leave (fires on DELETE from group_members)
-- ============================================================
CREATE OR REPLACE FUNCTION automation_on_group_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  person_org_id UUID;
BEGIN
  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://hxeqqgwcdnzxpwtsuuvv.supabase.co'
  );
  service_role_key := current_setting('app.settings.service_role_key', true);

  SELECT organization_id INTO person_org_id
  FROM people
  WHERE id = OLD.person_id;

  IF person_org_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/process-event-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := jsonb_build_object(
      'event_type', 'group_leave',
      'person_id', OLD.person_id,
      'organization_id', person_org_id,
      'group_id', OLD.group_id
    )
  );

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'automation_on_group_leave trigger failed: %', SQLERRM;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_group_member_removed ON group_members;
CREATE TRIGGER on_group_member_removed
  AFTER DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION automation_on_group_leave();

-- ============================================================
-- Trigger: first_visit (fires when first_visit_date is set on people)
-- ============================================================
CREATE OR REPLACE FUNCTION automation_on_first_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only fire when first_visit_date transitions from NULL to a value
  IF OLD.first_visit_date IS NOT NULL OR NEW.first_visit_date IS NULL THEN
    RETURN NEW;
  END IF;

  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://hxeqqgwcdnzxpwtsuuvv.supabase.co'
  );
  service_role_key := current_setting('app.settings.service_role_key', true);

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/process-event-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := jsonb_build_object(
      'event_type', 'first_visit',
      'person_id', NEW.id,
      'organization_id', NEW.organization_id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'automation_on_first_visit trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_first_visit_set ON people;
CREATE TRIGGER on_first_visit_set
  AFTER UPDATE OF first_visit_date ON people
  FOR EACH ROW
  EXECUTE FUNCTION automation_on_first_visit();

-- Also handle INSERT with first_visit_date already set
CREATE OR REPLACE FUNCTION automation_on_person_insert_first_visit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  IF NEW.first_visit_date IS NULL THEN
    RETURN NEW;
  END IF;

  supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://hxeqqgwcdnzxpwtsuuvv.supabase.co'
  );
  service_role_key := current_setting('app.settings.service_role_key', true);

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/process-event-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := jsonb_build_object(
      'event_type', 'first_visit',
      'person_id', NEW.id,
      'organization_id', NEW.organization_id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'automation_on_person_insert_first_visit trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_person_insert_first_visit ON people;
CREATE TRIGGER on_person_insert_first_visit
  AFTER INSERT ON people
  FOR EACH ROW
  EXECUTE FUNCTION automation_on_person_insert_first_visit();
