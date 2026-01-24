# ChurchComm V2 - Activity Log

## Current Status
**Last Updated:** 2026-01-24
**Tasks Completed:** Epic 1 (all) + Epic 2 (all) + Epic 3 (all) + Epic 4 (all)
**Current Task:** Ready for Epic 5 (Enhanced UI/UX)

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

### Session: 2026-01-24 - Workflow System Setup
**Summary:** Created a complete workflow system for implementing ChurchComm V2 in manageable sessions.

**Files Created:**
- `AI_GUIDE.md` - Central guide for all AI assistants (Claude & Gemini)
- `implementation-order.md` - Master checklist of all 48 tasks across 7 Epics
- `.agent/workflows/` - 32 task workflow files (one per remaining task)

**Workflow Files (32 total):**
- Epic 2: task-2.1a through task-2.4 (8 files)
- Epic 3: task-3.1a through task-3.4 (5 files)
- Epic 4: task-4.1a through task-4.2e (7 files)
- Epic 5: task-5.1a through task-5.2c (5 files)
- Epic 6: task-6.1 through task-6.3b (4 files)
- Epic 7: task-7.1a through task-7.2 (3 files)

**How to Use:**
1. Start a new session
2. Reference `AI_GUIDE.md` for context
3. Run a specific task: `/task-2.1a`
4. After completion, update `implementation-order.md` and this file

### Session: 2026-01-24 - Tasks 2.1a + 2.1b (Auto-Call Trigger + First Timer Logic)
**Summary:** Implemented the auto-call-trigger edge function with first_timer trigger logic.

**Migration Applied:**
- `20240325000001_call_attempts_auto_trigger_support.sql`
  - Added `organization_id`, `trigger_type`, `script_id`, `scheduled_at` columns to `call_attempts`
  - Made `phone_number` and `provider` nullable for auto-triggered calls
  - Updated status CHECK constraint to include 'scheduled'
  - Added indexes and RLS policy for auto-triggered call attempts

**Edge Function: `auto-call-trigger`** (deployed to Supabase)
- `isWithinCallingWindow()` - timezone-aware calling window check
- `processFirstTimerTrigger()` - finds first_time_visitor people within delay window, prevents duplicates, creates scheduled call_attempts
- Organization-level minute usage check (stops if limit reached)
- Iterates all orgs, evaluates enabled triggers, schedules calls

**Key Design Decisions:**
- 1-hour evaluation window: catches people exactly when delay_hours expires
- Duplicate prevention: checks for existing `first_timer` call_attempt per person
- Phone number required: skips people without phone_number
- `do_not_call` respected: filters out opted-out people
- Uses modern `Deno.serve` + `jsr:@supabase/functions-js/edge-runtime.d.ts`

### Session: 2026-01-24 - Tasks 2.1c + 2.1d (Birthday/Anniversary Triggers + VAPI Execution)
**Summary:** Added birthday/anniversary trigger handlers and VAPI call execution to auto-call-trigger.

**Migration Applied:**
- `20240325000002_call_attempts_vapi_execution_fields.sql`
  - Added `vapi_call_id`, `started_at`, `retry_count` columns to `call_attempts`
  - Added index on `vapi_call_id` for webhook processing

**Edge Function: `auto-call-trigger` v2** (deployed)
- `processBirthdayTrigger()` - timezone-aware birthday detection, deduplicates by day
- `processAnniversaryTrigger()` - configurable milestone months (default: 1, 6, 12), deduplicates by month
- `executeScheduledCalls()` - fetches scheduled calls, applies variable substitution to scripts, calls VAPI API, updates status
- `substituteVariables()` - replaces `{placeholder}` syntax in script content
- `processRetries()` - reschedules failed calls (max 2 retries within 24h)

**VAPI Integration:**
- Uses `VAPI_API_KEY` and `VAPI_PHONE_NUMBER_ID` env vars
- Supports dedicated phone numbers per org
- Creates calls with 11Labs voice and GPT-4o-mini model
- Updates call_attempts with vapi_call_id on success, error_message on failure

### Session: 2026-01-24 - Tasks 2.2a + 2.2b (Escalation Notifications)
**Summary:** Created and deployed the send-escalation-notification edge function with database trigger.

**Migration Applied:**
- `20240325000003_escalation_notification_trigger.sql`
  - Added `notification_sent_at` column to `escalation_alerts`
  - Enabled `pg_net` extension for async HTTP calls
  - Created `notify_escalation_alert()` trigger function (SECURITY DEFINER)
  - Trigger fires AFTER INSERT on `escalation_alerts`, calls edge function async

**Edge Function: `send-escalation-notification`** (deployed v1)
- Receives escalation record (direct call or webhook format)
- Queries admin/pastor members for the organization
- Respects `notification_preferences` per user (escalation_sms, escalation_email)
- SMS via Twilio API with priority prefix for urgent alerts
- Email via Resend API with HTML template (priority-colored header + CTA button)
- Updates `notification_sent_at` timestamp on the escalation_alert record

<!-- The Ralph Wiggum loop will append dated entries below -->

### Session: 2026-01-24 - Epic 2 & Epic 3 Completion
**Summary:** Completed all remaining Epic 2 and Epic 3 tasks.

**Epic 2 Tasks Completed:**
- Task 2.3: Minute usage tracking in `vapi-webhook` with overage prevention in `send-group-call`
- Task 2.4: Created `send-call-summary` edge function for real-time and daily digest notifications

**Epic 3 Tasks Completed:**
- Task 3.1a: Created `ScriptTemplateGallery.tsx` component
- Task 3.1b: Integrated gallery, builder, and script list into Settings Scripts tab
- Task 3.2: Created `ScriptBuilder.tsx` with Claude-powered `generate-script` edge function
- Task 3.3: Created `substitute-variables.ts` shared utility and `VariableReference.tsx` component
- Task 3.4: Added voice selection via `voice-presets.ts` and integrated into `send-group-call`

**New Files Created:**
- `src/components/communications/ScriptTemplateGallery.tsx`
- `src/components/communications/ScriptBuilder.tsx`
- `src/components/communications/VariableReference.tsx`
- `src/components/communications/ScriptList.tsx`
- `src/lib/voice-presets.ts`
- `supabase/functions/generate-script/index.ts`
- `supabase/functions/send-call-summary/index.ts`
- `supabase/functions/_shared/substitute-variables.ts`
- `supabase/migrations/20240325000004_create_script_generations.sql`

**Files Modified:**
- `src/pages/Settings.tsx` - Added Scripts tab with all new components
- `supabase/functions/send-group-call/index.ts` - Updated with variable substitution and voice selection

### Session: 2026-01-24 - Task 4.1a Onboarding Wizard
**Summary:** Created multi-step onboarding wizard for new users.

**Completed:**
- Created `src/pages/OnboardingPage.tsx` with 4-step wizard (church name, details, preferences, review)
- Added checkbox component via shadcn
- Added `refreshOrganization` function to authStore

### Session: 2026-01-24 - Task 4.1b Wiring Onboarding
**Summary:** Connected onboarding wizard to database with routing logic.

**Completed:**
- Applied migration: `estimated_size`, `preferred_channels`, `timezone` on organizations; `onboarding_completed` on organization_members
- Added `/onboarding` route to `App.tsx`
- Created `useOnboardingRedirect.ts` hook
- Integrated hook into `AppLayout.tsx`

### Session: 2026-01-24 - Task 4.2a Stripe Functions
**Summary:** Created Stripe checkout and portal edge functions.

**Completed:**
- Created `stripe-checkout` edge function for subscription signup
- Created `stripe-portal` edge function for billing portal access
- Both functions include authentication, authorization (admin only), and Stripe API integration
- Applied migration for `stripe_customer_id` on organizations

### Session: 2026-01-24 - Epic 4 Completion
**Summary:** Completed all remaining Epic 4 tasks.

**Tasks Completed:**
- 4.2b: Created `stripe-webhook` edge function handling subscription lifecycle events
- 4.2c: Applied migration for subscription fields (`stripe_subscription_id`, `trial_ends_at`, `current_period_end`, `minutes_included`, `minutes_used`)
- 4.2d: Created `PricingPage.tsx` and `BillingSettings.tsx` components
- 4.2e: Created `useSubscriptionStatus.ts` hook and `SubscriptionBanner.tsx` for read-only mode
- 4.3: Applied migration for phone number allocation fields
- 4.4: Existing invitation system in AcceptInvite page is sufficient

**New Files Created:**
- `supabase/functions/stripe-webhook/index.ts`
- `src/pages/PricingPage.tsx`
- `src/components/settings/BillingSettings.tsx`
- `src/hooks/useSubscriptionStatus.ts`
- `src/components/layout/SubscriptionBanner.tsx`

**Files Modified:**
- `src/App.tsx` - Added PricingPage route
- `src/components/layout/AppLayout.tsx` - Added SubscriptionBanner

**Migrations Applied:**
- `add_subscription_fields` - subscription tracking fields
- `add_phone_number_fields` - Twilio/VAPI phone fields


### Session: 2026-01-24 - Tasks 5.1a + 5.1b (Dashboard Redesign)
**Summary:** Replaced the static dashboard with a dynamic widget-based layout featuring real-time data.

**Completed:**
- Created 6 new dashboard widgets in `src/components/dashboard/`:
  - `MinuteUsageWidget`: Visual usage tracking vs included minutes
  - `ActiveCampaignsWidget`: Status of running campaigns
  - `RecentCallsWidget`: Log of latest call attempts
  - `EscalationWidget`: Critical alerts for follow-up (Urgent/High/Medium)
  - `CallSuccessWidget`: 30-day success rate calculation
  - `UpcomingCallsWidget`: Auto-scheduled calls for next 24h
- Updated `Dashboard.tsx`:
  - Implemented 3-column responsive grid layout
  - Added role-based visibility (Admins/Pastors see operational widgets)

### Session: 2026-01-24 - Tasks 5.2a + 5.2b + 5.2c (Campaign Builder Wizard)
**Summary:** Implemented a complete 5-step Campaign Builder wizard for creating Voice and SMS campaigns.

**Completed:**
- Created `src/components/communications/CampaignBuilder.tsx`:
  - Step 1: Campaign Type (Voice/SMS)
  - Step 2: Script Selection (from call_scripts)
  - Step 3: Audience Definition (filters by status/groups, live count, do_not_call exclusion)
  - Step 4: Scheduling (Now or Later, date/time picker)
  - Step 5: Review & Launch (summary, minute estimate, launch button)
- Updated `src/pages/Communications.tsx`:
  - Added "New Campaign" button
  - Integrated CampaignBuilder component with toggle state
- Launch functionality creates campaign record, call_attempts, and triggers `send-group-call` edge function.

