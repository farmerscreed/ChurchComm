-- Migration 2: Drop calling_scripts table
-- The 2 rows of data are redundant since call_scripts has 10 rows.
-- This table is a legacy duplicate.

-- Drop any RLS policies first
DROP POLICY IF EXISTS "Users can view calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Admins can manage calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Org members can view calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Admins can create calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Admins can update calling scripts" ON calling_scripts;
DROP POLICY IF EXISTS "Admins can delete calling scripts" ON calling_scripts;

-- Drop the table (CASCADE will handle any remaining constraints)
DROP TABLE IF EXISTS calling_scripts CASCADE;
