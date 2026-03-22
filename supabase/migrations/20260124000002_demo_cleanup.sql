-- Migration: Demo Data Cleanup Logic
-- Epic 7: Demo Mode

-- Function to clear all demo data for an org
CREATE OR REPLACE FUNCTION clear_demo_data(org_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete in order of dependencies (child tables first)
  DELETE FROM escalation_alerts WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM call_attempts WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM group_members WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM calling_campaigns WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM groups WHERE organization_id = org_id AND is_demo = true;
  DELETE FROM call_scripts WHERE organization_id = org_id AND is_demo = true;
  
  -- Delete demo people last (triggers might exist)
  DELETE FROM people WHERE organization_id = org_id AND is_demo = true;
  
  RAISE NOTICE 'Cleared demo data for org %', org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: when first real person is added, clear demo data
CREATE OR REPLACE FUNCTION on_first_real_person()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for non-demo people
  IF (NEW.is_demo IS NULL OR NEW.is_demo = false) THEN
    -- Check if this org still has demo data
    IF EXISTS (SELECT 1 FROM people WHERE organization_id = NEW.organization_id AND is_demo = true LIMIT 1) THEN
      PERFORM clear_demo_data(NEW.organization_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (from previous migrations)
DROP TRIGGER IF EXISTS trigger_on_first_real_person ON people;
DROP TRIGGER IF EXISTS trigger_cleanup_demo_data ON people;

-- Create the trigger
CREATE TRIGGER trigger_on_first_real_person
  AFTER INSERT ON people
  FOR EACH ROW
  EXECUTE FUNCTION on_first_real_person();
