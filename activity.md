# ChurchComm V2 - Activity Log

## Current Status
**Last Updated:** 2026-01-24
**Tasks Completed:** Epic 1 (all database & data model tasks)
**Current Task:** Starting Epic 2

---

## Completed Work (Epic 1 - Database & Data Model Refinement)

### Session: 2026-01-24 - Epic 1 Complete
**Summary:** All database migrations, RLS policies, edge function updates, and frontend permission gates for Epic 1 have been applied.

**Migrations Applied:**
- Renamed `communication_campaigns` → `messaging_campaigns`
- Dropped legacy `calling_scripts` table (consolidated to `call_scripts`)
- Added `pastor` role to organization_members
- Added `do_not_call` flag to people table
- Added `dedicated_phone_number` and `phone_number_type` to organizations
- Created `notification_preferences` table with default trigger
- Added calling window fields (`calling_window_start`, `calling_window_end`, `timezone`) to organizations
- Created `minute_usage` table with increment trigger
- Created `audience_segments` table
- Created `auto_triggers` table with org creation seed
- Seeded 6 script templates into `call_scripts`
- Created demo data cleanup trigger
- Added role-based RLS policies with `is_admin_or_pastor()` helper
- Fixed function search_path security warnings

**Frontend Changes:**
- Created `usePermissions()` hook for role-based access
- Updated Sidebar/Navigation visibility by role
- Added permission gates to People, Groups, Communications, FollowUps, Settings pages
- Updated invitation system for pastor role
- Updated all queries from `communication_campaigns` to `messaging_campaigns`

**Edge Function Updates:**
- `send-sms`: Updated to use `messaging_campaigns`
- `send-group-call`: Added `do_not_call` filtering + dedicated phone number support

---

## Session Log

<!-- The Ralph Wiggum loop will append dated entries below -->

