-- Add notes column to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS notes TEXT;

-- Also fix the member_status enum to include all values used in the app
-- First, add the missing values to the enum
ALTER TYPE status_enum ADD VALUE IF NOT EXISTS 'visitor';
ALTER TYPE status_enum ADD VALUE IF NOT EXISTS 'prospect';
ALTER TYPE status_enum ADD VALUE IF NOT EXISTS 'child';
ALTER TYPE status_enum ADD VALUE IF NOT EXISTS 'regular_visitor';
