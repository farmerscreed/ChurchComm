# Product Requirements Document: ChurchComm AI (V2)

## 1. Introduction & Goal

This document outlines the requirements for evolving the existing ChurchComm application from a single-church solution into a scalable, multi-tenant Software-as-a-Service (SaaS) platform.

The primary goal is to combine the best features of the existing application with advanced, scalable concepts to create a commercially viable product that enables churches to automate pastoral care and outreach through AI-powered voice conversations.

This PRD incorporates findings from a detailed analysis of the existing codebase, database schema, and a structured requirements-gathering interview process.

---

## 2. Strategic Direction & Target Audience

* **Product Vision:** A multi-tenant SaaS platform for AI-powered church communication.
* **Target Audience:** Small to medium-sized churches (200-2,000 members) seeking to scale their outreach and pastoral care without increasing staff.
* **Go-to-Market:** Paid service with tiered subscription plans. A 14-day free trial with usage caps.
* **Deployment:** Vercel (frontend) + Supabase (backend/edge functions/database).

---

## 3. Implementation Priority Order

The following order reflects strategic priorities — build the core product value first, then monetize:

1. **Phase 1:** Database & Data Model Refinement (foundation for everything)
2. **Phase 2:** Automated Calling & Workflows (core product value)
3. **Phase 3:** Enhanced Script Management + AI Builder
4. **Phase 4:** Multi-Tenancy, Onboarding & Billing (monetization layer)
5. **Phase 5:** Enhanced UI/UX, Dashboard & Campaign Builder
6. **Phase 6:** AI Memory Enhancements
7. **Phase 7:** Demo Mode & Guided Tour

---

## 4. Core Epics & Feature Requirements

### Epic 1: Database & Data Model Refinement

**Goal:** Establish a clean, consistent database foundation for all V2 features.

#### 1.1. Rename `communication_campaigns` to `messaging_campaigns`

The existing `communication_campaigns` table will be renamed to `messaging_campaigns` for clarity. This table handles SMS/email campaigns. The `calling_campaigns` table remains the source of truth for AI call campaigns.

**Checklist:**
- [x] Create migration to rename `communication_campaigns` → `messaging_campaigns`
- [x] Update all RLS policies referencing the old table name
- [x] Update all frontend queries/imports referencing `communication_campaigns`
- [x] Update all edge functions referencing the old table name
- [x] Update `campaign_recipients` foreign key references
- [x] Verify existing data is preserved after rename
- [ ] Run full application smoke test after migration

#### 1.2. Consolidate Script Tables

The legacy `calling_scripts` table will be dropped. `call_scripts` is the single source of truth.

**Checklist:**
- [x] Verify no critical data exists only in `calling_scripts`
- [x] Migrate any unique data from `calling_scripts` to `call_scripts` if needed
- [x] Create migration to drop `calling_scripts` table
- [x] Update all frontend references from `calling_scripts` to `call_scripts`
- [x] Update edge functions (`send-group-call`) to use `call_scripts` exclusively
- [x] Verify Settings.tsx script management UI works with `call_scripts`

#### 1.3. Add RBAC Role: `pastor`

Introduce a third role between admin and member.

**Role Permissions Matrix:**

| Feature | Admin | Pastor | Member |
|---------|-------|--------|--------|
| Billing & Subscription | ✅ | ❌ | ❌ |
| Team Management (invite/remove) | ✅ | ❌ | ❌ |
| Org Settings | ✅ | ❌ | ❌ |
| People Management | ✅ | ✅ | 👁️ View Only |
| Calling Campaigns | ✅ | ✅ | 👁️ View Only |
| SMS Campaigns | ✅ | ✅ | 👁️ View Only |
| Escalation Handling | ✅ | ✅ | ❌ |
| Call History & Transcripts | ✅ | ✅ | 👁️ View Only |
| Script Management | ✅ | ✅ | ❌ |
| Groups | ✅ | ✅ | 👁️ View Only |
| Dashboard | ✅ | ✅ | ✅ (limited) |

**Checklist:**
- [x] Add `'pastor'` to the role enum/check constraint in `organization_members`
- [x] Update `authStore.ts` permissions logic to handle 3 roles
- [x] Create a `usePermissions()` hook that returns feature access booleans
- [x] Update Sidebar/Navigation to show/hide items based on role
- [x] Update all page components to check permissions before rendering actions
- [x] Update invitation system to allow inviting users as 'pastor'
- [x] Add RLS policies that differentiate pastor-level access where needed
- [ ] Test: admin can do everything
- [ ] Test: pastor cannot access billing or team management
- [ ] Test: member can only view, not act

#### 1.4. Add `do_not_call` Flag to People Table

**Checklist:**
- [x] Create migration to add `do_not_call BOOLEAN DEFAULT FALSE` to `people` table
- [x] Update the AddPersonDialog and PersonDialog to include do_not_call toggle
- [x] Update PeopleDirectory to show a visual indicator for do_not_call contacts
- [x] Update `send-group-call` edge function to filter out do_not_call people
- [ ] Update automated call trigger engine to respect do_not_call flag
- [ ] Update campaign audience builder to exclude do_not_call by default

#### 1.5. Add Phone Number Model Fields to Organizations

**Checklist:**
- [x] Add `dedicated_phone_number VARCHAR` to organizations table (NULL for shared)
- [x] Add `phone_number_type ENUM ('shared', 'dedicated') DEFAULT 'shared'` to organizations
- [x] Update `send-group-call` to use org's dedicated number if available, otherwise shared pool
- [ ] Document which subscription tiers get dedicated vs shared numbers

#### 1.6. Add Notification Preferences Table

**Checklist:**
- [x] Create `notification_preferences` table with columns: `id`, `user_id`, `organization_id`, `escalation_sms BOOLEAN`, `escalation_email BOOLEAN`, `call_summary_frequency ENUM ('off', 'realtime', 'daily')`, `created_at`, `updated_at`
- [x] Add RLS policies (users can only manage their own preferences)
- [x] Create default preferences on user join (escalation: both on, summary: daily)

#### 1.7. Add Calling Window Configuration

**Checklist:**
- [x] Add `calling_window_start TIME DEFAULT '09:00'` to organizations
- [x] Add `calling_window_end TIME DEFAULT '20:00'` to organizations
- [x] Add `timezone VARCHAR DEFAULT 'America/New_York'` to organizations (collected at onboarding)

#### 1.8. Add Minute Usage Tracking

**Checklist:**
- [x] Create `minute_usage` table: `id`, `organization_id`, `billing_period_start DATE`, `billing_period_end DATE`, `minutes_used DECIMAL`, `minutes_included INTEGER`, `overage_approved BOOLEAN DEFAULT FALSE`, `warning_sent_at TIMESTAMP`
- [x] Create trigger/function to increment `minutes_used` when a call_attempt completes
- [x] Add RLS policies (org-scoped, admin-only for overage approval)

#### 1.9. Add Audience Segments Table

**Checklist:**
- [x] Create `audience_segments` table: `id`, `organization_id`, `name`, `description`, `filters JSONB`, `created_by UUID`, `created_at`, `updated_at`
- [x] Filters JSONB structure: `{ "status": [...], "groups": [...], "tags": [...], "exclude_do_not_call": true }`
- [x] Add RLS policies (org-scoped)

#### 1.10. Add Auto-Trigger Configuration Table

**Checklist:**
- [x] Create `auto_triggers` table: `id`, `organization_id`, `trigger_type ENUM ('first_timer', 'birthday', 'anniversary')`, `enabled BOOLEAN DEFAULT TRUE`, `script_id UUID REFERENCES call_scripts(id)`, `delay_hours INTEGER DEFAULT 24`, `anniversary_milestones INTEGER[] DEFAULT '{1,12}'` (months), `created_at`, `updated_at`
- [x] Add RLS policies (org-scoped, admin/pastor can manage)
- [x] Seed default triggers (disabled) when a new org is created

---

### Epic 2: Automated Calling & Workflows

**Goal:** Build the intelligent automation engine that delivers core product value.

#### 2.1. Automated Call Triggering Engine

A scheduled Supabase Edge Function (`auto-call-trigger`) that runs periodically (every 15 minutes) to check for trigger conditions and create call_attempts.

**Supported Triggers:**
1. **First Timer Follow-up:** Call within configured hours after a person is added with status `first_time_visitor`
2. **Birthday Calls:** Call on the person's birthday (or day before if birthday falls outside calling window)
3. **Member Anniversary:** Call at configurable month milestones (e.g., 1mo, 3mo, 12mo after `created_at`)

**Checklist:**
- [ ] Create `auto-call-trigger` edge function
- [ ] Implement calling window check (respect org's configured hours + timezone)
- [ ] Implement first_timer trigger logic:
  - [ ] Query `people` where status = 'first_time_visitor' AND created_at within trigger window
  - [ ] Check no existing call_attempt exists for this person + trigger type
  - [ ] Respect `do_not_call` flag
  - [ ] Create call_attempt record with status 'scheduled'
- [ ] Implement birthday trigger logic:
  - [ ] Query `people` where birthday matches today (month + day)
  - [ ] Exclude do_not_call, check no duplicate call today
  - [ ] Create call_attempt with birthday script
- [ ] Implement anniversary trigger logic:
  - [ ] Calculate months since `created_at` for each person
  - [ ] Match against org's configured milestones
  - [ ] Create call_attempt with anniversary script
- [ ] Implement minute usage check (don't schedule if at limit)
- [ ] Queue calls for execution (call VAPI for each scheduled attempt)
- [ ] Implement retry logic for failed calls (max 2 retries, different times)
- [ ] Set up cron schedule (every 15 minutes via Supabase pg_cron or external scheduler)
- [ ] Add logging for all trigger evaluations
- [ ] Test: first_timer trigger fires correctly
- [ ] Test: birthday trigger fires on correct day
- [ ] Test: anniversary milestones calculate correctly
- [ ] Test: do_not_call exclusion works
- [ ] Test: calling window is respected
- [ ] Test: minute limit prevents new calls when exceeded

#### 2.2. Escalation Notification System

**Checklist:**
- [ ] Create `send-escalation-notification` edge function
- [ ] Set up database trigger: on INSERT to `escalation_alerts`, invoke the function
- [ ] Query `notification_preferences` + `organization_members` to determine recipients:
  - [ ] Admin and pastor roles receive escalation notifications
  - [ ] Respect individual SMS/email preferences
- [ ] Integrate Twilio SMS for escalation alerts:
  - [ ] Format: "[URGENT] ChurchComm Alert: {person_name} - {alert_type}. Call transcript summary: {summary}. Login to review: {app_url}"
- [ ] Integrate Resend email for escalation alerts:
  - [ ] Rich HTML email with: person details, crisis type, transcript excerpt, action link
- [ ] Handle priority levels (urgent = immediate, high = within 5min, medium/low = batched)
- [ ] Update escalation_alerts record with `notification_sent_at` timestamp
- [ ] Test: SMS notification delivered for urgent escalation
- [ ] Test: Email notification delivered with correct formatting
- [ ] Test: Respects per-user notification preferences
- [ ] Test: Only admin/pastor roles receive notifications

#### 2.3. Minute Usage Tracking & Overage Prevention

**Checklist:**
- [ ] Create function to calculate call duration from VAPI webhook data
- [ ] Update `vapi-webhook` to record call duration in minutes to `minute_usage`
- [ ] Implement 80% usage warning:
  - [ ] When usage crosses 80%, send admin notification (email + in-app)
  - [ ] Set `warning_sent_at` to prevent duplicate warnings
- [ ] Implement 100% hard stop:
  - [ ] `send-group-call` checks minute_usage before initiating calls
  - [ ] `auto-call-trigger` checks minute_usage before scheduling
  - [ ] Return clear error message: "Monthly minute limit reached. Upgrade plan or approve overage."
- [ ] Implement admin overage approval:
  - [ ] UI toggle in Settings → Billing to approve overage for current period
  - [ ] When approved, calls can proceed (still tracked against usage)
- [ ] Test: Warning fires at 80%
- [ ] Test: Calls blocked at 100% without approval
- [ ] Test: Calls proceed after overage approval
- [ ] Test: Usage resets at billing period boundary

#### 2.4. Call Outcome Notifications (Configurable)

**Checklist:**
- [ ] Create `send-call-summary` edge function
- [ ] Implement real-time mode: send notification per completed call
- [ ] Implement daily digest mode: aggregate call results, send once daily (e.g., 8am)
- [ ] Query notification_preferences to determine each user's preference
- [ ] Daily digest includes: total calls, success/failure counts, escalations, notable responses
- [ ] Real-time includes: person called, outcome, brief summary
- [ ] Set up daily cron for digest mode
- [ ] Test: Real-time notification fires per call
- [ ] Test: Daily digest aggregates correctly
- [ ] Test: 'off' preference suppresses all notifications

---

### Epic 3: Enhanced Script Management & AI Builder

**Goal:** Provide a powerful yet easy-to-use system for creating and managing AI call scripts.

#### 3.1. Script Template Library

Pre-built script templates for common church communication scenarios.

**Required Templates:**
1. `first_timer_followup` - Welcome call for first-time visitors
2. `birthday_greeting` - Birthday celebration call
3. `member_checkin` - General wellness check-in
4. `anniversary_celebration` - Membership anniversary call
5. `event_invitation` - Invite to upcoming church event
6. `prayer_followup` - Follow-up after a prayer request

**Checklist:**
- [ ] Add `is_template BOOLEAN DEFAULT FALSE` to `call_scripts` table
- [ ] Add `template_type VARCHAR` to `call_scripts` (matches trigger types)
- [ ] Add `is_system BOOLEAN DEFAULT FALSE` to mark system-provided templates
- [ ] Create seed migration with all 6 template scripts
- [ ] Each template includes: name, description, prompt content with variables, suggested voice
- [ ] Templates use variables: `{first_name}`, `{last_name}`, `{church_name}`, `{pastor_name}`, `{event_name}`, `{event_date}`
- [ ] UI: Template gallery view in script management section
- [ ] UI: "Use Template" button that clones template into org's scripts
- [ ] UI: Clear indication of which scripts are templates vs custom
- [ ] Test: Templates are read-only (orgs clone, not edit originals)
- [ ] Test: Cloned scripts belong to the org and are fully editable

#### 3.2. AI Script Builder (Claude-powered)

An AI assistant that helps orgs generate custom call scripts based on their needs.

**Checklist:**
- [ ] Create `generate-script` edge function
- [ ] Integrate Anthropic Claude API for script generation
- [ ] Input fields in UI:
  - [ ] Purpose/scenario (free text)
  - [ ] Tone (warm, professional, casual, pastoral)
  - [ ] Key points to cover (list)
  - [ ] Church denomination/style context
  - [ ] Desired call duration (short 2-3min, medium 5min, long 8-10min)
- [ ] Claude prompt engineering:
  - [ ] System prompt that understands church communication context
  - [ ] Output format matches call_scripts schema (prompt field)
  - [ ] Includes appropriate variable placeholders
  - [ ] Generates both the AI prompt AND a human-readable description
- [ ] UI: "Generate with AI" button in script creation flow
- [ ] UI: Preview generated script before saving
- [ ] UI: "Regenerate" and "Edit manually" options
- [ ] Rate limit: max 10 generations per org per day (prevent abuse)
- [ ] Test: Generated scripts include proper variable placeholders
- [ ] Test: Rate limit is enforced
- [ ] Test: Generated scripts work correctly when sent to VAPI

#### 3.3. Variable Substitution Engine

**Checklist:**
- [ ] Create utility function `substituteVariables(template, context)` in edge functions
- [ ] Supported variables:
  - [ ] `{first_name}` → person's first name
  - [ ] `{last_name}` → person's last name
  - [ ] `{church_name}` → organization name
  - [ ] `{pastor_name}` → org's configured pastor name (from org settings)
  - [ ] `{event_name}` → campaign's associated event name
  - [ ] `{event_date}` → campaign's associated event date
  - [ ] `{day_of_week}` → current day name
  - [ ] `{membership_duration}` → "X months/years" since joining
- [ ] Update `send-group-call` to apply variable substitution before VAPI call
- [ ] Update `auto-call-trigger` to apply variable substitution
- [ ] UI: Variable reference panel in script editor (shows available variables)
- [ ] UI: Variable preview with sample data
- [ ] Test: All variables substitute correctly
- [ ] Test: Missing variables gracefully fall back (empty string or generic)

#### 3.4. Voice Selection

**Checklist:**
- [ ] Add `voice_id VARCHAR` and `voice_name VARCHAR` to `call_scripts` table
- [ ] Define preset voice options (3-5 from 11Labs):
  - [ ] Warm Female (e.g., "Rachel")
  - [ ] Professional Male (e.g., "Josh")
  - [ ] Friendly Female (e.g., "Paula" - current default)
  - [ ] Calm Male (e.g., "Adam")
  - [ ] Energetic Female (e.g., "Bella")
- [ ] UI: Voice selection dropdown in script editor
- [ ] UI: "Preview Voice" button that plays a sample
- [ ] Update `send-group-call` to use script's voice_id instead of hardcoded
- [ ] Default to "Paula" if no voice selected (backwards compatible)
- [ ] Test: Different voices are correctly passed to VAPI

---

### Epic 4: Multi-Tenancy, Onboarding & Billing

**Goal:** Transform the app into a monetizable SaaS product with proper tenant isolation.

#### 4.1. Multi-Step Onboarding Flow

**Collected Information:**
- Step 1: Admin account (email, password, first name, last name)
- Step 2: Church details (church name, estimated membership size, timezone)
- Step 3: Preferred communication channels (Voice, SMS, or Both)
- Step 4: Confirmation + start trial

**Checklist:**
- [ ] Create new `OnboardingPage.tsx` with multi-step wizard UI
- [ ] Step 1: Account creation form (email, password, first/last name)
- [ ] Step 2: Church details form (name, size dropdown, timezone selector)
- [ ] Step 3: Channel preference selection (checkboxes: Voice, SMS)
- [ ] Step 4: Summary + "Start Free Trial" button
- [ ] Update `handle_new_user` trigger to store size/timezone/channels
- [ ] Add `estimated_size VARCHAR`, `preferred_channels TEXT[]` to organizations table
- [ ] Redirect new signups to onboarding flow (not directly to dashboard)
- [ ] After onboarding, redirect to dashboard with demo data loaded
- [ ] Progress indicator (steps 1-4) visible throughout flow
- [ ] Validation on each step before proceeding
- [ ] Test: Full onboarding creates org + member + correct defaults
- [ ] Test: Timezone is correctly stored and used for calling window
- [ ] Test: Cannot skip steps

#### 4.2. Stripe Integration & Subscription Management

**Pricing Tiers:**

| Tier | Monthly | Annual (15% off) | Minutes | Phone Number |
|------|---------|-------------------|---------|--------------|
| Starter | $197/mo | $167/mo ($2,009/yr) | 500 | Shared |
| Growth | $397/mo | $337/mo ($4,049/yr) | 1,500 | Shared |
| Enterprise | $797/mo | $677/mo ($8,129/yr) | 5,000 | Dedicated |

**Free Trial:**
- 14 days duration
- 15 minutes included (no credit card required)
- 30 minutes included (credit card on file)
- Can upgrade to paid plan at any time during trial

**Checklist:**
- [ ] Create Stripe products and prices for all 6 plan variants (3 tiers × 2 billing cycles)
- [ ] Create `stripe-checkout` edge function:
  - [ ] Creates Stripe Checkout Session
  - [ ] Includes trial_period_days: 14
  - [ ] Attaches organization_id as metadata
  - [ ] Returns checkout URL to frontend
- [ ] Create `stripe-webhook` edge function:
  - [ ] Handle `checkout.session.completed` → update org subscription
  - [ ] Handle `invoice.paid` → confirm active subscription, reset minute usage
  - [ ] Handle `invoice.payment_failed` → mark subscription as past_due
  - [ ] Handle `customer.subscription.deleted` → set read-only mode
  - [ ] Handle `customer.subscription.updated` → sync plan changes
  - [ ] Verify webhook signatures
- [ ] Create `stripe-portal` edge function:
  - [ ] Creates Stripe Customer Portal session for managing subscription
  - [ ] Returns portal URL to frontend
- [ ] Add to organizations table:
  - [ ] `stripe_subscription_id VARCHAR`
  - [ ] `subscription_tier ENUM ('trial', 'starter', 'growth', 'enterprise')`
  - [ ] `billing_cycle ENUM ('monthly', 'annual')`
  - [ ] `trial_ends_at TIMESTAMP`
  - [ ] `credit_card_on_file BOOLEAN DEFAULT FALSE`
- [ ] Create `PricingPage.tsx` component:
  - [ ] Display all 3 tiers with feature comparison
  - [ ] Monthly/Annual toggle
  - [ ] "Start Free Trial" CTA for each tier
  - [ ] Highlight most popular plan (Growth)
- [ ] Create Billing section in Settings:
  - [ ] Current plan display
  - [ ] Minutes used / included bar chart
  - [ ] "Change Plan" button → Stripe Checkout
  - [ ] "Manage Billing" button → Stripe Portal
  - [ ] Trial countdown if on trial
- [ ] Implement read-only mode for lapsed subscriptions:
  - [ ] All data remains visible
  - [ ] Disable: campaign creation, call initiation, SMS sending, script editing
  - [ ] Show banner: "Your subscription has lapsed. Reactivate to resume services."
- [ ] Trial minute allocation:
  - [ ] No credit card: 15 minutes
  - [ ] Credit card on file: 30 minutes
  - [ ] Track via `minute_usage` table with appropriate `minutes_included`
- [ ] Test: Checkout flow creates subscription correctly
- [ ] Test: Webhook updates org subscription status
- [ ] Test: Read-only mode activates on cancellation
- [ ] Test: Trial minute cap enforced (15 and 30 variants)
- [ ] Test: Annual billing calculates correct discount
- [ ] Test: Upgrade mid-trial works correctly

#### 4.3. Phone Number Allocation

**Checklist:**
- [ ] Starter/Growth: Use shared VAPI phone number (from env vars)
- [ ] Enterprise: Provision dedicated number on subscription activation
- [ ] Update `send-group-call` to check org's phone_number_type:
  - [ ] Shared: use VAPI_PHONE_NUMBER_ID from env
  - [ ] Dedicated: use org's dedicated_phone_number field
- [ ] AI greeting includes church name immediately for shared numbers
- [ ] Test: Shared number calls identify church by name in AI greeting
- [ ] Test: Dedicated number correctly routes to org

#### 4.4. Invitation System Updates

**Checklist:**
- [ ] Update invitation UI to include 'pastor' role option
- [ ] Update `send-invite` function to validate the new role
- [ ] Ensure `accept_invitation` correctly assigns pastor role
- [ ] Make `APP_URL` configurable via environment variable
- [ ] Test: Inviting as pastor role works end-to-end

---

### Epic 5: Enhanced UI/UX

**Goal:** Create an intuitive, calling-focused user experience.

#### 5.1. Calling-Focused Dashboard

**Widgets (in order of priority):**
1. Minutes Used / Remaining (progress bar with plan limit)
2. Active Campaigns (count + status indicators)
3. Recent Calls (last 5 with outcomes)
4. Unresolved Escalation Alerts (count + severity)
5. Call Success Rate (percentage this period)
6. Upcoming Auto-Scheduled Calls (next 24h)

**Checklist:**
- [ ] Redesign `Dashboard.tsx` with widget grid layout
- [ ] Create `MinuteUsageWidget` component:
  - [ ] Progress bar showing used/included
  - [ ] Color coding: green (<60%), yellow (60-80%), red (>80%)
  - [ ] "X minutes remaining" text
- [ ] Create `ActiveCampaignsWidget` component:
  - [ ] Count of in-progress campaigns
  - [ ] Quick status for each (% complete)
- [ ] Create `RecentCallsWidget` component:
  - [ ] Last 5 calls with: person name, outcome icon, timestamp
  - [ ] Click to view full transcript
- [ ] Create `EscalationWidget` component:
  - [ ] Count of open escalations by priority
  - [ ] Click to navigate to escalation list
- [ ] Create `CallSuccessWidget` component:
  - [ ] Percentage gauge (completed calls / total attempts)
- [ ] Create `UpcomingCallsWidget` component:
  - [ ] List of auto-scheduled calls for next 24h
  - [ ] Shows trigger type (birthday, first_timer, etc.)
- [ ] Responsive layout (2-column on desktop, single on mobile)
- [ ] Role-based widget visibility (members see fewer widgets)
- [ ] Test: Dashboard loads without errors for all roles
- [ ] Test: Widgets display accurate real-time data
- [ ] Test: Clicking widgets navigates to appropriate detail pages

#### 5.2. Campaign Builder

**Checklist:**
- [ ] Create `CampaignBuilder.tsx` page/component
- [ ] Step 1: Select campaign type (Voice Call / SMS)
- [ ] Step 2: Select script (from org's scripts, show templates)
- [ ] Step 3: Define audience:
  - [ ] Option A: Use saved segment (dropdown)
  - [ ] Option B: Build filter (status + groups + tags combinable)
  - [ ] Show preview count: "X people will be contacted"
  - [ ] Exclude do_not_call automatically (show count excluded)
- [ ] Step 4: Schedule:
  - [ ] "Send Now" option
  - [ ] "Schedule for later" with date/time picker
  - [ ] Respect calling window (warn if outside hours)
- [ ] Step 5: Review & Confirm:
  - [ ] Summary of selections
  - [ ] Estimated minutes to be used
  - [ ] "Launch Campaign" button
- [ ] Save audience filter as segment option ("Save this audience")
- [ ] Campaign progress page after launch (real-time status updates)
- [ ] Test: Campaign creates correct call_attempts for filtered audience
- [ ] Test: Scheduling respects calling window
- [ ] Test: Minute estimate is reasonably accurate
- [ ] Test: Saved segments persist and load correctly

#### 5.3. Settings Enhancements

**Checklist:**
- [ ] Add "Calling Configuration" tab:
  - [ ] Calling window (start/end time pickers)
  - [ ] Timezone selector
  - [ ] Auto-trigger configuration (enable/disable each type, set scripts)
  - [ ] Anniversary milestone configuration
  - [ ] Overage approval toggle
- [ ] Add "Notifications" tab:
  - [ ] Per-user notification preferences
  - [ ] Escalation alert channels (SMS, email, both)
  - [ ] Call summary frequency (off, real-time, daily)
- [ ] Update "Billing" tab (admin only):
  - [ ] Current plan + usage display
  - [ ] Upgrade/downgrade buttons
  - [ ] Stripe portal link
  - [ ] Trial status if applicable
- [ ] Update "Team" tab:
  - [ ] Show role column (admin, pastor, member)
  - [ ] Allow role changes (admin only)
  - [ ] Pastor role option in invite form
- [ ] Add "Voice" section:
  - [ ] Default voice selection for org
  - [ ] Preview voice samples
- [ ] Test: All settings persist correctly on save
- [ ] Test: Role-restricted tabs are hidden from non-admins
- [ ] Test: Timezone changes affect calling window calculations

#### 5.4. SMS Campaign Support (Full)

The existing SMS system will be maintained and enhanced with the campaign builder.

**Checklist:**
- [ ] Ensure SMS campaign creation works through new Campaign Builder
- [ ] SMS uses `messaging_campaigns` table (renamed from communication_campaigns)
- [ ] SMS supports audience segments and filters
- [ ] SMS supports variable substitution in message body
- [ ] SMS respects do_not_call flag (check `communication_preferences` if exists, else use `phone_number` presence)
- [ ] SMS delivery tracking in campaign_recipients
- [ ] Test: SMS campaign sends to filtered audience correctly
- [ ] Test: Variables substitute in SMS message body

---

### Epic 6: AI & Memory Enhancements

**Goal:** Enable contextual, personalized AI conversations using vector memory.

#### 6.1. Per-Member Conversation Context

**Checklist:**
- [ ] Create `member_memories` table: `id`, `organization_id`, `person_id REFERENCES people(id)`, `content TEXT`, `embedding vector(768)`, `memory_type ENUM ('call_summary', 'prayer_request', 'personal_note', 'preference')`, `source_call_id UUID`, `created_at`
- [ ] Create `match_member_memories(person_id, query_embedding, threshold, count)` function
- [ ] Update `vapi-webhook` to create member_memories entries after each call:
  - [ ] Store call summary as memory
  - [ ] Store prayer requests as individual memories
  - [ ] Store any personal facts mentioned (e.g., "my son is in college")
- [ ] Add RLS policies (org-scoped)

#### 6.2. Church-Level Context

**Checklist:**
- [ ] Utilize existing `church_memories` table for org-wide context
- [ ] Create admin UI to add/edit church memories:
  - [ ] Upcoming events
  - [ ] Church announcements
  - [ ] Pastoral care notes
  - [ ] Sermon series info
- [ ] Create `match_church_memories` search function (if not exists)

#### 6.3. Context Injection into VAPI Calls

**Checklist:**
- [ ] Before initiating a VAPI call, query relevant member_memories for the person
- [ ] Query church_memories for current org-wide context
- [ ] Inject context into the VAPI assistant prompt:
  - [ ] "Previous conversations: {memory_summaries}"
  - [ ] "Church context: {church_context}"
  - [ ] "Known preferences: {personal_preferences}"
- [ ] Limit context injection to most recent/relevant 5 memories per category
- [ ] Update `send-group-call` edge function with context injection
- [ ] Update `auto-call-trigger` edge function with context injection
- [ ] Test: AI references past conversation naturally
- [ ] Test: AI knows about upcoming church events
- [ ] Test: Context doesn't exceed VAPI prompt limits

---

### Epic 7: Demo Mode & Guided Tour

**Goal:** Help new organizations understand the platform quickly.

#### 7.1. Sample Data Seeding

**Checklist:**
- [ ] Create `seed-demo-data` function (called after onboarding completes)
- [ ] Generate sample data:
  - [ ] 15 sample people (mix of statuses: first_timer, member, leader)
  - [ ] 3 sample groups (Youth, Worship Team, Prayer Warriors)
  - [ ] 2 sample call scripts (first_timer_followup, member_checkin)
  - [ ] 5 sample call history entries with varied outcomes
  - [ ] 1 sample escalation alert (resolved)
- [ ] Mark all sample data with `is_demo BOOLEAN DEFAULT FALSE` flag
- [ ] Auto-clear behavior:
  - [ ] When org adds first real person (is_demo = false), delete all demo data
  - [ ] Use database trigger on people INSERT where is_demo = false
- [ ] Show "Demo data will be cleared when you add your first member" notice
- [ ] Test: Demo data appears immediately after onboarding
- [ ] Test: Adding a real person clears all demo data
- [ ] Test: Demo data is clearly labeled in the UI

#### 7.2. Guided Tour

**Checklist:**
- [ ] Integrate a lightweight tour library (e.g., react-joyride or shepherd.js)
- [ ] Tour steps:
  1. Dashboard overview ("Here's your command center")
  2. People page ("Manage your congregation here")
  3. Communications ("Launch AI calls and SMS campaigns")
  4. Settings ("Configure your calling preferences")
  5. Call Scripts ("Set up what your AI says")
- [ ] Tour triggers on first login after onboarding
- [ ] "Skip Tour" and "Next" buttons on each step
- [ ] Store `tour_completed BOOLEAN` in user preferences
- [ ] "Restart Tour" option in help menu
- [ ] Test: Tour triggers only on first login
- [ ] Test: Tour doesn't trigger on subsequent logins
- [ ] Test: Skip tour marks it as completed

---

## 5. Technical Architecture & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | Vite + React 19 | Existing stack, stable, performant |
| Backend | Supabase Edge Functions (Deno) | Existing infrastructure, integrated auth |
| Hosting | Vercel (frontend) + Supabase (backend) | Industry standard, scalable |
| Payments | Stripe | Best-in-class subscription management |
| AI Voice | VAPI + 11Labs | Already integrated and working |
| AI Script Gen | Anthropic Claude | High quality instruction following |
| SMS | Twilio | Already integrated |
| Email | Resend | Already integrated for invitations |
| Vector DB | pgvector (768-dim) | Existing infrastructure |
| Embeddings | OpenAI text-embedding-3-small | Existing integration |
| State Mgmt | Zustand + TanStack Query | Existing pattern |
| Recordings | Transcripts only (no audio) | Cost and compliance optimization |

---

## 6. Data Model Changes Summary

### New Tables
- `notification_preferences`
- `minute_usage`
- `audience_segments`
- `auto_triggers`
- `member_memories`

### Modified Tables
- `organizations` — add: `estimated_size`, `preferred_channels`, `timezone`, `calling_window_start`, `calling_window_end`, `dedicated_phone_number`, `phone_number_type`, `stripe_subscription_id`, `subscription_tier`, `billing_cycle`, `trial_ends_at`, `credit_card_on_file`
- `organization_members` — add: `'pastor'` role
- `people` — add: `do_not_call`, `is_demo`
- `call_scripts` — add: `is_template`, `template_type`, `is_system`, `voice_id`, `voice_name`
- `communication_campaigns` — rename to `messaging_campaigns`

### Dropped Tables
- `calling_scripts` (consolidated into `call_scripts`)

---

## 7. New Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `auto-call-trigger` | Cron (every 15min) | Evaluate trigger conditions, schedule calls |
| `send-escalation-notification` | DB trigger (escalation_alerts INSERT) | Notify staff of crisis/pastoral care |
| `send-call-summary` | Cron (daily) or per-call | Admin call outcome notifications |
| `stripe-checkout` | HTTP (frontend) | Create Stripe Checkout sessions |
| `stripe-webhook` | HTTP (Stripe) | Handle subscription lifecycle events |
| `stripe-portal` | HTTP (frontend) | Create Stripe Customer Portal sessions |
| `generate-script` | HTTP (frontend) | AI-powered script generation via Claude |
| `seed-demo-data` | Called after onboarding | Populate sample data for new orgs |

---

## 8. Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Trial → Paid Conversion | >15% | Stripe subscription activations / total trials |
| Campaign Activation | >60% of trials | Orgs that launch ≥1 campaign during trial |
| Call Success Rate | >80% | Completed calls / total attempts |
| Escalation Response Time | <30min | Time from alert creation to status change |
| Monthly Minute Usage | >50% of included | Average usage / plan allocation |
| Webhook Latency | <2s p95 | Time from VAPI event to DB write |

---

## 9. Open Questions & Future Considerations

- **Missed Attendance Trigger:** On hold — requires reliable attendance tracking mechanism
- **Planning Center Integration:** Import members from external ChMS systems
- **Advanced Analytics:** Trend analysis, cohort analysis, ROI calculations
- **Custom Voice Cloning:** Enterprise tier feature for pastor's own voice
- **Multi-language Support:** AI calls in Spanish, Korean, etc.
- **Inbound Calls:** Allow members to call in and speak to the AI
- **WhatsApp Integration:** Additional messaging channel
- **Bulk SMS Templates:** Pre-built SMS templates similar to call scripts
