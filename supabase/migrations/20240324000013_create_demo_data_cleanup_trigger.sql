-- Migration 13: Create demo data cleanup trigger
-- When a real (non-demo) person is inserted, automatically delete all demo data for that org.
-- Only fires if the org actually has demo data.

CREATE OR REPLACE FUNCTION cleanup_demo_data_on_real_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    has_demo_data BOOLEAN;
BEGIN
    -- Only proceed if the newly inserted person is NOT demo data
    IF NEW.is_demo = FALSE THEN
        -- Check if this organization has any demo data
        SELECT EXISTS (
            SELECT 1 FROM people
            WHERE organization_id = NEW.organization_id
            AND is_demo = TRUE
            AND id != NEW.id
        ) INTO has_demo_data;

        -- If demo data exists, delete it
        IF has_demo_data THEN
            -- Delete demo people (cascading will handle related records via FK constraints)
            DELETE FROM people
            WHERE organization_id = NEW.organization_id
            AND is_demo = TRUE
            AND id != NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger on people table
CREATE TRIGGER trigger_cleanup_demo_data
    AFTER INSERT ON people
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_demo_data_on_real_insert();

-- Add comments
COMMENT ON FUNCTION cleanup_demo_data_on_real_insert IS 'Automatically removes demo/sample data from an organization when real member data is first added.';
