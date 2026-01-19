-- ========================================
-- CHURCHCONNECT V1 - DATABASE VERIFICATION
-- Run this in Supabase SQL Editor
-- ========================================

-- 1. Check all tables exist (should return 13 rows)
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations',
    'organization_members',
    'people',
    'groups',
    'group_members',
    'communication_campaigns',
    'communication_templates',
    'campaign_recipients',
    'calling_scripts',
    'calling_campaigns',
    'call_attempts',
    'vapi_call_logs',
    'escalation_alerts'
  )
ORDER BY tablename;

-- Expected result: 13 tables
-- If you see fewer than 13, some migrations didn't run

-- ========================================
-- 2. Check RLS (Row Level Security) is enabled (should return 13 rows with rowsecurity = true)
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations',
    'organization_members',
    'people',
    'groups',
    'group_members',
    'communication_campaigns',
    'communication_templates',
    'campaign_recipients',
    'calling_scripts',
    'calling_campaigns',
    'call_attempts',
    'vapi_call_logs',
    'escalation_alerts'
  )
ORDER BY tablename;

-- Expected: All tables should have rowsecurity = true
-- If any show false, RLS policies weren't applied

-- ========================================
-- 3. Check enums exist
SELECT
  typname as enum_name,
  enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('status_enum', 'escalation_status', 'escalation_priority', 'member_response_type', 'follow_up_type')
ORDER BY typname, enumsortorder;

-- Expected: Multiple rows showing enum values
-- status_enum should have: first_time_visitor, regular_visitor, member, leader, inactive

-- ========================================
-- 4. Check RLS policies exist (should return multiple rows)
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as command_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations',
    'organization_members',
    'people',
    'groups',
    'group_members'
  )
ORDER BY tablename, policyname;

-- Expected: Several policies per table
-- Typical policies: "Users can view their org data", "Users can insert their org data", etc.

-- ========================================
-- 5. Check indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('people', 'groups', 'group_members', 'communication_campaigns')
ORDER BY tablename, indexname;

-- Expected: Several indexes for performance

-- ========================================
-- 6. Quick table structure check - people table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'people'
ORDER BY ordinal_position;

-- Expected columns: id, organization_id, first_name, last_name, email, phone_number,
-- address, birthday, member_status, tags, communication_preferences, created_at, updated_at

-- ========================================
-- RESULT SUMMARY
-- ========================================
-- Copy the results of each query and paste them back to me.
-- I'll confirm if everything is set up correctly!
