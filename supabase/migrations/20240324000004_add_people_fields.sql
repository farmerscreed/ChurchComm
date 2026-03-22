-- Migration 4: Add do_not_call and is_demo fields to people table

ALTER TABLE people
    ADD COLUMN IF NOT EXISTS do_not_call BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN people.do_not_call IS 'Flag to prevent AI calling system from contacting this person.';
COMMENT ON COLUMN people.is_demo IS 'Flag indicating this is demo/sample data that should be cleaned up when real data is added.';
