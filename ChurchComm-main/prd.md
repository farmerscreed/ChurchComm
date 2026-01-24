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

---

## 10. JSON Task List (Ralph Wiggum Format)

This section is used by the Ralph Wiggum autonomous loop. Each task is atomic and verifiable. Work through them in order. Epic 1 is complete.

```json
[
  {
    "id": "2.1a",
    "category": "feature",
    "epic": "Epic 2: Automated Calling & Workflows",
    "description": "Create auto-call-trigger edge function - scaffold and calling window logic",
    "steps": [
      "Create supabase/functions/auto-call-trigger/index.ts edge function",
      "Implement CORS headers and Supabase client initialization",
      "Query org's calling_window_start, calling_window_end, timezone from organizations table",
      "Implement isWithinCallingWindow() helper that checks current time against org's window",
      "Query auto_triggers table for enabled triggers for each org",
      "Return early if outside calling window",
      "Add basic logging for trigger evaluations"
    ],
    "passes": false
  },
  {
    "id": "2.1b",
    "category": "feature",
    "epic": "Epic 2: Automated Calling & Workflows",
    "description": "Implement first_timer trigger logic in auto-call-trigger",
    "steps": [
      "In auto-call-trigger, add first_timer trigger handler",
      "Query people where status = 'first_time_visitor' AND created_at within trigger's delay_hours window",
      "Check no existing call_attempt exists for this person + trigger_type 'first_timer'",
      "Filter out people with do_not_call = true",
      "Check minute_usage to ensure org hasn't exceeded their limit",
      "Create call_attempt records with status 'scheduled' for qualifying people",
      "Log each scheduled call attempt"
    ],
    "passes": false
  },
  {
    "id": "2.1c",
    "category": "feature",
    "epic": "Epic 2: Automated Calling & Workflows",
    "description": "Implement birthday and anniversary trigger logic in auto-call-trigger",
    "steps": [
      "Add birthday trigger handler: query people where birthday month+day matches today",
      "Exclude do_not_call people and check no duplicate call today",
      "Create call_attempt with the org's birthday script_id from auto_triggers",
      "Add anniversary trigger handler: calculate months since created_at for each person",
      "Match against org's configured anniversary_milestones array",
      "Create call_attempt with anniversary script for matching people",
      "Implement retry logic: if a call_attempt has status 'failed' and retries < 2, reschedule"
    ],
    "passes": false
  },
  {
    "id": "2.1d",
    "category": "feature",
    "epic": "Epic 2: Automated Calling & Workflows",
    "description": "Implement VAPI call execution in auto-call-trigger",
    "steps": [
      "After creating scheduled call_attempts, queue them for VAPI execution",
      "For each scheduled attempt, call VAPI API to initiate the call",
      "Apply variable substitution to the script prompt before sending to VAPI",
      "Use org's dedicated phone number if available, otherwise shared",
      "Update call_attempt status to 'in_progress' after VAPI accepts",
      "Handle VAPI errors gracefully (update status to 'failed', log error)"
    ],
    "passes": false
  },
  {
    "id": "2.2a",
    "category": "feature",
    "epic": "Epic 2: Automated Calling & Workflows",
    "description": "Create send-escalation-notification edge function",
    "steps": [
      "Create supabase/functions/send-escalation-notification/index.ts",
      "Accept escalation_alert record data (person_id, alert_type, priority, summary)",
      "Query notification_preferences + organization_members for admin/pastor recipients",
      "Filter recipients based on their escalation_sms and escalation_email preferences",
      "Integrate Twilio SMS: format '[URGENT] ChurchComm Alert: {person_name} - {alert_type}'",
      "Integrate Resend email: rich HTML with person details, alert type, transcript excerpt, action link",
      "Update escalation_alerts record with notification_sent_at timestamp"
    ],
    "passes": false
  },
  {
    "id": "2.2b",
    "category": "integration",
    "epic": "Epic 2: Automated Calling & Workflows",
    "description": "Create database trigger to invoke escalation notification on INSERT",
    "steps": [
      "Create a Supabase database trigger on escalation_alerts INSERT",
      "The trigger should invoke the send-escalation-notification edge function via pg_net or http extension",
      "Pass the new escalation_alert record data to the function",
      "Handle priority levels: urgent = immediate, high = within 5min batch",
      "Test: insert an escalation_alert and verify the function is called"
    ],
    "passes": false
  },
  {
    "id": "2.3",
    "category": "feature",
    "epic": "Epic 2: Automated Calling & Workflows",
    "description": "Implement minute usage tracking and overage prevention",
    "steps": [
      "Update vapi-webhook edge function to calculate call duration from webhook data",
      "Record call duration in minutes to minute_usage table (increment minutes_used)",
      "In send-group-call, check minute_usage before initiating calls - block if at limit",
      "In auto-call-trigger, check minute_usage before scheduling - skip if at limit",
      "Implement 80% usage warning: when crossed, set warning_sent_at (notification handled separately)",
      "Return clear error message when limit reached: 'Monthly minute limit reached'",
      "If overage_approved = true, allow calls to proceed past limit"
    ],
    "passes": false
  },
  {
    "id": "2.4",
    "category": "feature",
    "epic": "Epic 2: Automated Calling & Workflows",
    "description": "Create send-call-summary edge function for call outcome notifications",
    "steps": [
      "Create supabase/functions/send-call-summary/index.ts",
      "Implement real-time mode: send notification per completed call to subscribed users",
      "Implement daily digest mode: aggregate call results for the day",
      "Query notification_preferences to determine each user's call_summary_frequency",
      "Daily digest includes: total calls, success/failure counts, escalations, notable responses",
      "Real-time includes: person called, outcome, brief summary",
      "Format as email via Resend with clean HTML template"
    ],
    "passes": false
  },
  {
    "id": "3.1a",
    "category": "feature",
    "epic": "Epic 3: Enhanced Script Management & AI Builder",
    "description": "Add template fields to call_scripts and create template gallery UI",
    "steps": [
      "Create migration: ADD is_template BOOLEAN DEFAULT FALSE to call_scripts",
      "ADD template_type VARCHAR to call_scripts",
      "ADD is_system BOOLEAN DEFAULT FALSE to call_scripts",
      "Update the existing 6 seed scripts to set is_template=true, is_system=true, appropriate template_type",
      "Create a ScriptTemplateGallery component in src/components/communications/",
      "Display templates as cards with name, description, and template_type badge",
      "Add 'Use Template' button that clones template into org's scripts (is_template=false, is_system=false)"
    ],
    "passes": false
  },
  {
    "id": "3.1b",
    "category": "feature",
    "epic": "Epic 3: Enhanced Script Management & AI Builder",
    "description": "Integrate template gallery into Settings script management",
    "steps": [
      "In Settings.tsx calling scripts section, add a 'Templates' tab alongside existing script list",
      "Import and render ScriptTemplateGallery in the Templates tab",
      "After cloning a template, switch to the script list tab showing the new script",
      "Mark cloned scripts as editable, show clear distinction between templates and custom scripts",
      "Templates should be read-only in the UI (no edit/delete buttons)",
      "Verify the script list correctly filters out is_system=true templates"
    ],
    "passes": false
  },
  {
    "id": "3.2",
    "category": "feature",
    "epic": "Epic 3: Enhanced Script Management & AI Builder",
    "description": "Create AI Script Builder with Claude-powered generation",
    "steps": [
      "Create supabase/functions/generate-script/index.ts edge function",
      "Accept input: purpose, tone, key_points, denomination_style, desired_duration",
      "Integrate Anthropic Claude API for script generation",
      "System prompt: understands church communication, outputs call_scripts prompt format, includes variable placeholders",
      "Create ScriptBuilder component in src/components/communications/",
      "Form fields: purpose (textarea), tone (select), key points (list input), duration (select)",
      "Show preview of generated script with 'Save', 'Regenerate', and 'Edit manually' buttons",
      "Implement rate limit check: max 10 generations per org per day"
    ],
    "passes": false
  },
  {
    "id": "3.3",
    "category": "feature",
    "epic": "Epic 3: Enhanced Script Management & AI Builder",
    "description": "Create variable substitution engine for scripts",
    "steps": [
      "Create utility function substituteVariables(template, context) in supabase/functions/_shared/",
      "Support variables: {first_name}, {last_name}, {church_name}, {pastor_name}, {event_name}, {event_date}, {day_of_week}, {membership_duration}",
      "Update send-group-call to apply substituteVariables before VAPI call",
      "Update auto-call-trigger to apply substituteVariables",
      "Gracefully handle missing variables (replace with empty string)",
      "Add a VariableReference panel component showing available variables in script editor",
      "Show variable reference panel next to the script prompt textarea in Settings"
    ],
    "passes": false
  },
  {
    "id": "3.4",
    "category": "feature",
    "epic": "Epic 3: Enhanced Script Management & AI Builder",
    "description": "Add voice selection to scripts",
    "steps": [
      "Create migration: ADD voice_id VARCHAR and voice_name VARCHAR to call_scripts",
      "Define preset voice options: Warm Female (Rachel), Professional Male (Josh), Friendly Female (Paula), Calm Male (Adam), Energetic Female (Bella)",
      "Add voice selection dropdown to script editor in Settings.tsx",
      "Update send-group-call to use script's voice_id instead of hardcoded value",
      "Default to Paula if no voice selected (backwards compatible)",
      "Show voice name in script list cards"
    ],
    "passes": false
  },
  {
    "id": "4.1a",
    "category": "feature",
    "epic": "Epic 4: Multi-Tenancy, Onboarding & Billing",
    "description": "Create multi-step onboarding wizard page",
    "steps": [
      "Create src/pages/OnboardingPage.tsx with multi-step wizard UI",
      "Step 1: Account info display (email, first name, last name - already created via signup)",
      "Step 2: Church details form (church name, size dropdown, timezone selector with common US timezones)",
      "Step 3: Channel preference selection (checkboxes: Voice Calls, SMS, Both)",
      "Step 4: Summary of selections + 'Start Free Trial' button",
      "Add progress indicator (steps 1-4) visible throughout flow",
      "Add validation on each step before proceeding to next",
      "Style with shadcn/ui Card, Button, Select, Input components"
    ],
    "passes": false
  },
  {
    "id": "4.1b",
    "category": "feature",
    "epic": "Epic 4: Multi-Tenancy, Onboarding & Billing",
    "description": "Wire onboarding to database and add routing",
    "steps": [
      "Create migration: ADD estimated_size VARCHAR and preferred_channels TEXT[] to organizations",
      "On 'Start Free Trial' click, update the organization with size, timezone, channels",
      "Add route /onboarding to App.tsx pointing to OnboardingPage",
      "Redirect new signups (users with no organization or fresh org) to /onboarding",
      "After onboarding completes, redirect to /dashboard",
      "Store onboarding_completed boolean in organization_members or org to prevent re-showing"
    ],
    "passes": false
  },
  {
    "id": "4.2a",
    "category": "feature",
    "epic": "Epic 4: Multi-Tenancy, Onboarding & Billing",
    "description": "Create Stripe checkout and portal edge functions",
    "steps": [
      "Create supabase/functions/stripe-checkout/index.ts",
      "Accept tier and billing_cycle from frontend, create Stripe Checkout Session",
      "Include trial_period_days: 14, attach organization_id as metadata",
      "Return checkout URL to frontend",
      "Create supabase/functions/stripe-portal/index.ts",
      "Create Stripe Customer Portal session for managing subscription",
      "Return portal URL to frontend"
    ],
    "passes": false
  },
  {
    "id": "4.2b",
    "category": "feature",
    "epic": "Epic 4: Multi-Tenancy, Onboarding & Billing",
    "description": "Create Stripe webhook handler edge function",
    "steps": [
      "Create supabase/functions/stripe-webhook/index.ts",
      "Verify Stripe webhook signatures",
      "Handle checkout.session.completed: update org with stripe_subscription_id, subscription_tier, billing_cycle",
      "Handle invoice.paid: confirm active subscription, reset minute_usage for new billing period",
      "Handle invoice.payment_failed: mark subscription as past_due",
      "Handle customer.subscription.deleted: set subscription_tier to 'cancelled'",
      "Handle customer.subscription.updated: sync plan changes to org record"
    ],
    "passes": false
  },
  {
    "id": "4.2c",
    "category": "feature",
    "epic": "Epic 4: Multi-Tenancy, Onboarding & Billing",
    "description": "Add subscription fields to organizations and create migration",
    "steps": [
      "Create migration: ADD stripe_subscription_id VARCHAR to organizations",
      "ADD subscription_tier with values 'trial','starter','growth','enterprise' defaulting to 'trial'",
      "ADD billing_cycle with values 'monthly','annual'",
      "ADD trial_ends_at TIMESTAMP (set to NOW() + 14 days on org creation)",
      "ADD credit_card_on_file BOOLEAN DEFAULT FALSE",
      "Update minute_usage minutes_included based on tier (trial=15, starter=500, growth=1500, enterprise=5000)"
    ],
    "passes": false
  },
  {
    "id": "4.2d",
    "category": "feature",
    "epic": "Epic 4: Multi-Tenancy, Onboarding & Billing",
    "description": "Create PricingPage and Billing settings UI",
    "steps": [
      "Create src/pages/PricingPage.tsx with 3-tier comparison layout",
      "Show Starter ($197/mo), Growth ($397/mo), Enterprise ($797/mo) with feature lists",
      "Add Monthly/Annual toggle (annual shows 15% discount)",
      "Highlight Growth as 'Most Popular'",
      "Add 'Start Free Trial' CTA button per tier that calls stripe-checkout",
      "In Settings.tsx, add Billing tab (admin only): current plan, minutes bar chart, Change Plan button, Manage Billing button (Stripe Portal)",
      "Show trial countdown if on trial tier"
    ],
    "passes": false
  },
  {
    "id": "4.2e",
    "category": "feature",
    "epic": "Epic 4: Multi-Tenancy, Onboarding & Billing",
    "description": "Implement read-only mode for lapsed subscriptions",
    "steps": [
      "Create useSubscription() hook that reads org's subscription_tier and trial_ends_at",
      "If subscription is 'cancelled' or trial_ends_at has passed, set isReadOnly = true",
      "When isReadOnly: disable campaign creation, call initiation, SMS sending, script editing",
      "Show persistent banner: 'Your subscription has lapsed. Reactivate to resume services.'",
      "All data remains visible (read-only, not deleted)",
      "Add route to PricingPage from the reactivation banner"
    ],
    "passes": false
  },
  {
    "id": "4.3",
    "category": "feature",
    "epic": "Epic 4: Multi-Tenancy, Onboarding & Billing",
    "description": "Phone number allocation logic",
    "steps": [
      "Starter/Growth tiers use shared VAPI phone number (VAPI_PHONE_NUMBER_ID env var)",
      "Enterprise tier provisions dedicated number (stored in org's dedicated_phone_number)",
      "Update stripe-webhook: on Enterprise subscription, prompt admin to configure dedicated number",
      "Ensure send-group-call already uses org's phone_number_type (done in Epic 1)",
      "AI greeting should include church name immediately for shared numbers",
      "Update script templates to start with '{church_name} calling' pattern"
    ],
    "passes": false
  },
  {
    "id": "4.4",
    "category": "feature",
    "epic": "Epic 4: Multi-Tenancy, Onboarding & Billing",
    "description": "Update invitation system for pastor role",
    "steps": [
      "Update invitation UI in Settings Team tab to include 'pastor' role option in dropdown",
      "Update send-invite edge function to validate 'pastor' as a valid role",
      "Ensure accept_invitation correctly assigns pastor role in organization_members",
      "Make APP_URL configurable via VITE_APP_URL environment variable for invite links",
      "Test: invite form shows Admin, Pastor, Member role options"
    ],
    "passes": false
  },
  {
    "id": "5.1a",
    "category": "feature",
    "epic": "Epic 5: Enhanced UI/UX",
    "description": "Redesign Dashboard with widget grid layout",
    "steps": [
      "Redesign src/pages/Dashboard.tsx with responsive widget grid (2-column desktop, 1-column mobile)",
      "Create src/components/dashboard/ directory for widget components",
      "Create MinuteUsageWidget: progress bar (green/yellow/red), 'X minutes remaining' text",
      "Create ActiveCampaignsWidget: count of in-progress campaigns with % complete",
      "Create RecentCallsWidget: last 5 calls with person name, outcome icon, timestamp",
      "Use Supabase queries to fetch real data for each widget",
      "Apply role-based visibility (members see fewer widgets)"
    ],
    "passes": false
  },
  {
    "id": "5.1b",
    "category": "feature",
    "epic": "Epic 5: Enhanced UI/UX",
    "description": "Add escalation and upcoming calls widgets to Dashboard",
    "steps": [
      "Create EscalationWidget: count of open escalations by priority with click-to-navigate",
      "Create CallSuccessWidget: percentage gauge showing completed/total attempts",
      "Create UpcomingCallsWidget: list of auto-scheduled calls for next 24h with trigger type",
      "Add all widgets to Dashboard grid layout",
      "Ensure widgets gracefully handle empty/loading states",
      "Add click handlers to navigate to relevant detail pages"
    ],
    "passes": false
  },
  {
    "id": "5.2a",
    "category": "feature",
    "epic": "Epic 5: Enhanced UI/UX",
    "description": "Create Campaign Builder - type and script selection steps",
    "steps": [
      "Create src/components/communications/CampaignBuilder.tsx with multi-step wizard",
      "Step 1: Select campaign type (Voice Call / SMS) with card selection UI",
      "Step 2: Select script - show org's scripts filtered by type, include template option",
      "Display script preview when selected",
      "Add Back/Next navigation buttons",
      "Add progress indicator showing current step",
      "Style with shadcn/ui Card, RadioGroup, Button components"
    ],
    "passes": false
  },
  {
    "id": "5.2b",
    "category": "feature",
    "epic": "Epic 5: Enhanced UI/UX",
    "description": "Create Campaign Builder - audience and scheduling steps",
    "steps": [
      "Step 3: Define audience - Option A: use saved segment (dropdown from audience_segments)",
      "Option B: build filter (status multi-select + groups multi-select + tags)",
      "Show preview count: 'X people will be contacted' with live query",
      "Auto-exclude do_not_call, show count excluded",
      "Step 4: Schedule - 'Send Now' option or 'Schedule for later' with date/time picker",
      "Warn if scheduled time falls outside org's calling window",
      "Add 'Save this audience' option to save filter as new audience_segment"
    ],
    "passes": false
  },
  {
    "id": "5.2c",
    "category": "feature",
    "epic": "Epic 5: Enhanced UI/UX",
    "description": "Create Campaign Builder - review step and launch",
    "steps": [
      "Step 5: Review & Confirm - summary of all selections",
      "Show estimated minutes to be used (audience count * avg call duration)",
      "Show warning if estimated usage would exceed remaining minutes",
      "'Launch Campaign' button that creates calling_campaign + call_attempts",
      "After launch, redirect to campaign progress page with real-time status",
      "Integrate CampaignBuilder into Communications page as primary action"
    ],
    "passes": false
  },
  {
    "id": "5.3a",
    "category": "feature",
    "epic": "Epic 5: Enhanced UI/UX",
    "description": "Add Calling Configuration tab to Settings",
    "steps": [
      "Add 'Calling' tab to Settings.tsx",
      "Calling window: start/end time pickers (using shadcn/ui input type='time')",
      "Timezone selector dropdown with common timezones",
      "Auto-trigger configuration: toggle enable/disable for each trigger type",
      "Script selector for each trigger type (dropdown from call_scripts)",
      "Anniversary milestone configuration (array of month numbers)",
      "Save changes to organizations and auto_triggers tables"
    ],
    "passes": false
  },
  {
    "id": "5.3b",
    "category": "feature",
    "epic": "Epic 5: Enhanced UI/UX",
    "description": "Add Notifications tab to Settings",
    "steps": [
      "Add 'Notifications' tab to Settings.tsx",
      "Per-user notification preferences form",
      "Escalation alert channels: checkboxes for SMS and email",
      "Call summary frequency: radio group (off, real-time, daily)",
      "Save to notification_preferences table for current user",
      "Load existing preferences on mount"
    ],
    "passes": false
  },
  {
    "id": "5.3c",
    "category": "feature",
    "epic": "Epic 5: Enhanced UI/UX",
    "description": "Update Team tab and add Voice section to Settings",
    "steps": [
      "Update Team tab: show role column (admin, pastor, member) in member list",
      "Add role change dropdown (admin only) to change member roles",
      "Pastor role option in invite form (already partially done in Epic 1)",
      "Add 'Voice' section in script management: default voice selection for org",
      "Show voice preset options with names",
      "Save default voice preference to organizations table"
    ],
    "passes": false
  },
  {
    "id": "5.4",
    "category": "feature",
    "epic": "Epic 5: Enhanced UI/UX",
    "description": "Full SMS campaign support through Campaign Builder",
    "steps": [
      "Ensure SMS campaign type in CampaignBuilder works end-to-end",
      "SMS uses messaging_campaigns table for campaign records",
      "SMS supports audience segments and filters (same as voice)",
      "Apply substituteVariables to SMS message body",
      "Respect do_not_call flag for SMS recipients",
      "Track SMS delivery status in campaign_recipients",
      "Show SMS delivery progress on campaign detail page"
    ],
    "passes": false
  },
  {
    "id": "6.1",
    "category": "feature",
    "epic": "Epic 6: AI & Memory Enhancements",
    "description": "Create member_memories table and matching function",
    "steps": [
      "Create migration for member_memories table: id, organization_id, person_id (FK people), content TEXT, embedding vector(768), memory_type ENUM, source_call_id UUID, created_at",
      "memory_type values: 'call_summary', 'prayer_request', 'personal_note', 'preference'",
      "Create match_member_memories(person_id, query_embedding, threshold, count) function using cosine similarity",
      "Add RLS policies: org-scoped SELECT, admin/pastor INSERT/UPDATE/DELETE",
      "Create index on embedding column for fast vector search"
    ],
    "passes": false
  },
  {
    "id": "6.2",
    "category": "feature",
    "epic": "Epic 6: AI & Memory Enhancements",
    "description": "Update vapi-webhook to create member memories after calls",
    "steps": [
      "In vapi-webhook, after a call completes, extract summary from transcript",
      "Use OpenAI embeddings API to generate 768-dim embedding of the summary",
      "Store call summary as member_memory with type 'call_summary'",
      "Parse transcript for prayer requests - store each as type 'prayer_request'",
      "Parse for personal facts mentioned - store as type 'personal_note'",
      "Link memories to person_id and source_call_id"
    ],
    "passes": false
  },
  {
    "id": "6.3a",
    "category": "feature",
    "epic": "Epic 6: AI & Memory Enhancements",
    "description": "Create admin UI for church-level memories",
    "steps": [
      "Add 'Church Context' section to Settings or a new dedicated page",
      "Form to add/edit church memories: content field, category selector (events, announcements, pastoral notes, sermon series)",
      "On save, generate embedding via OpenAI and store in church_memories table",
      "List existing church memories with edit/delete options",
      "Create match_church_memories function if it doesn't already exist"
    ],
    "passes": false
  },
  {
    "id": "6.3b",
    "category": "feature",
    "epic": "Epic 6: AI & Memory Enhancements",
    "description": "Inject member and church context into VAPI calls",
    "steps": [
      "Before initiating a VAPI call in send-group-call, generate embedding for the person's context query",
      "Call match_member_memories to get top 5 relevant memories for the person",
      "Call match_church_memories to get top 5 relevant church-wide context items",
      "Inject into VAPI assistant prompt: 'Previous conversations: ...', 'Church context: ...', 'Known preferences: ...'",
      "Apply same context injection in auto-call-trigger",
      "Limit total injected context to prevent exceeding VAPI prompt limits (max ~2000 chars)"
    ],
    "passes": false
  },
  {
    "id": "7.1a",
    "category": "feature",
    "epic": "Epic 7: Demo Mode & Guided Tour",
    "description": "Create seed-demo-data edge function",
    "steps": [
      "Create supabase/functions/seed-demo-data/index.ts",
      "Accept organization_id, generate sample data:",
      "15 sample people (mix of statuses: first_timer, member, leader) with is_demo=true",
      "3 sample groups (Youth, Worship Team, Prayer Warriors) with is_demo=true",
      "2 sample call scripts (first_timer_followup, member_checkin) cloned from templates with is_demo=true",
      "5 sample call history entries with varied outcomes",
      "1 sample resolved escalation alert",
      "All sample data marked with is_demo = true"
    ],
    "passes": false
  },
  {
    "id": "7.1b",
    "category": "feature",
    "epic": "Epic 7: Demo Mode & Guided Tour",
    "description": "Add is_demo flag and auto-clear behavior",
    "steps": [
      "Create migration: ADD is_demo BOOLEAN DEFAULT FALSE to people, groups, call_scripts, calling_campaigns, call_attempts, escalation_alerts",
      "Database trigger already exists from Epic 1 (cleanup on first real person insert)",
      "Verify the trigger deletes all is_demo=true records across all relevant tables",
      "Show notice in UI: 'Demo data will be cleared when you add your first member'",
      "Call seed-demo-data from onboarding completion flow",
      "Add visual indicator (badge/tag) on demo data items in the UI"
    ],
    "passes": false
  },
  {
    "id": "7.2",
    "category": "feature",
    "epic": "Epic 7: Demo Mode & Guided Tour",
    "description": "Implement guided tour for new users",
    "steps": [
      "Install react-joyride: npm install react-joyride",
      "Create GuidedTour component with tour steps configuration",
      "Tour steps: Dashboard overview, People page, Communications, Settings, Call Scripts",
      "Trigger tour on first login after onboarding (check tour_completed flag)",
      "Add 'Skip Tour' and 'Next' buttons on each step overlay",
      "Store tour_completed in notification_preferences or organization_members",
      "Add 'Restart Tour' option in a help menu or Settings page"
    ],
    "passes": false
  }
]
```
