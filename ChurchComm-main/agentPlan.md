# Agent Implementation Plan: ChurchComm AI V2

## Overview

This document defines the sub-agent strategy for implementing the ChurchComm V2 PRD. Based on the constraint of 2-3 parallel agents, work is partitioned into independent streams that minimize merge conflicts while maximizing throughput.

---

## Agent Architecture

### Why 2-3 Agents?

The codebase has natural separation boundaries:
1. **Database/Backend** (migrations, edge functions, RLS policies) — changes are in `supabase/`
2. **Frontend** (pages, components, hooks, stores) — changes are in `src/`
3. **Integration** (connecting frontend to backend, end-to-end testing) — touches both but after the other two are stable

This maps cleanly to 2 primary agents working in parallel, with a 3rd agent handling integration/review work after each phase.

---

## Execution Strategy

Work proceeds in **Phases** (matching the PRD priority order). Within each phase, agents work in parallel on their designated areas. A phase is complete when all agents finish and the integration pass succeeds.

---

## Phase 1: Database & Data Model Refinement

**PRD Reference:** Epic 1 (all sections 1.1 through 1.10)

### Agent A: Database Migration Agent

**Scope:** All Supabase migrations, RLS policies, database functions, and triggers.

**Skills Required:**
- PostgreSQL DDL/DML
- Supabase RLS policy design
- pgvector operations
- Database trigger/function creation

**Tasks:**
1. Create migration: rename `communication_campaigns` → `messaging_campaigns`
2. Create migration: drop `calling_scripts` table (after data verification)
3. Create migration: add `'pastor'` role to `organization_members`
4. Create migration: add `do_not_call` to `people` table
5. Create migration: add `is_demo` to `people` table
6. Create migration: add phone number fields to `organizations`
7. Create migration: add calling window + timezone fields to `organizations`
8. Create migration: add Stripe/subscription fields to `organizations`
9. Create migration: add `estimated_size`, `preferred_channels` to `organizations`
10. Create migration: create `notification_preferences` table + RLS
11. Create migration: create `minute_usage` table + RLS + trigger
12. Create migration: create `audience_segments` table + RLS
13. Create migration: create `auto_triggers` table + RLS
14. Create migration: add template fields to `call_scripts`
15. Create migration: add voice fields to `call_scripts`
16. Create migration: create `member_memories` table + vector index + RLS
17. Create migration: create `match_member_memories` function
18. Create seed migration: 6 script templates
19. Create seed migration: default auto_triggers per org (via trigger)
20. Update all existing RLS policies for pastor role awareness
21. Create demo data cleanup trigger (on people INSERT where is_demo = false)

**Completion Criteria:**
- [ ] All migrations apply cleanly on a fresh Supabase instance
- [ ] `supabase db push` succeeds without errors
- [ ] RLS policies pass manual testing (admin/pastor/member isolation verified)
- [ ] All foreign key relationships are consistent
- [ ] Existing data is not lost (communication_campaigns data preserved in messaging_campaigns)
- [ ] Minute usage trigger correctly increments on call_attempt completion

**Dependencies:** None (this agent starts first or in parallel with Agent B prep work)

---

### Agent B: Frontend Foundation Agent

**Scope:** Core frontend infrastructure that doesn't depend on new backend data.

**Skills Required:**
- React 19 + TypeScript
- Zustand state management
- Custom hooks design
- shadcn/ui component composition
- Tailwind CSS

**Tasks:**
1. Create `usePermissions()` hook implementing the 3-role permission matrix
2. Update `authStore.ts` to handle `'pastor'` role
3. Update `Sidebar.tsx` with permission-based menu visibility
4. Update all page components with permission guards (read-only for members)
5. Create reusable `PermissionGate` component (wraps children, checks role)
6. Update `AddPersonDialog.tsx` to include `do_not_call` toggle
7. Update `PersonDialog.tsx` to show/edit `do_not_call` flag
8. Update `PeopleDirectory.tsx` with do_not_call visual indicator
9. Create `VariableReference` component (shows available script variables)
10. Update Settings.tsx Team tab to include pastor role in invite form
11. Rename all frontend references from `communication_campaigns` to `messaging_campaigns`
12. Rename all frontend references from `calling_scripts` to `call_scripts`

**Completion Criteria:**
- [ ] `npm run build` succeeds without TypeScript errors
- [ ] Permission hook correctly returns access booleans for all 3 roles
- [ ] Sidebar shows/hides items correctly per role
- [ ] All page components respect permission boundaries
- [ ] do_not_call flag appears in people UI
- [ ] No references to old table names remain in frontend code

**Dependencies:** Can start immediately (uses type stubs until DB agent completes)

---

## Phase 2: Automated Calling & Workflows

**PRD Reference:** Epic 2 (sections 2.1 through 2.4)

### Agent A: Backend Automation Agent

**Scope:** All new edge functions for calling automation.

**Skills Required:**
- Deno/TypeScript (Supabase Edge Functions)
- VAPI API integration
- Twilio SMS integration
- Resend email integration
- Cron scheduling concepts
- Date/timezone handling

**Tasks:**
1. Create `auto-call-trigger` edge function:
   - First timer logic (query people + status + timing)
   - Birthday logic (month/day match + timezone)
   - Anniversary logic (milestone calculation)
   - Calling window enforcement
   - Minute usage check before scheduling
   - do_not_call exclusion
   - Retry logic (max 2 retries)
   - VAPI call initiation for scheduled attempts
2. Create `send-escalation-notification` edge function:
   - Query notification_preferences for recipients
   - Twilio SMS integration for alerts
   - Resend email integration for rich alerts
   - Priority-based timing (urgent=immediate, high=5min, medium/low=batched)
3. Update `vapi-webhook` edge function:
   - Record call duration to minute_usage table
   - Calculate and store minutes used
4. Create `send-call-summary` edge function:
   - Real-time mode (per-call notification)
   - Daily digest mode (aggregate summary)
   - Respect notification_preferences
5. Create minute usage warning logic (80% threshold notification)
6. Update `send-group-call` to check minute limits before calling
7. Create variable substitution utility function
8. Update `send-group-call` to apply variable substitution
9. Update `send-group-call` to use script's voice_id
10. Update `send-group-call` to check org's phone_number_type (shared vs dedicated)
11. Update `send-group-call` to include church name in AI greeting for shared numbers

**Completion Criteria:**
- [ ] `auto-call-trigger` correctly identifies and schedules calls for all 3 trigger types
- [ ] Calling window is correctly enforced with timezone awareness
- [ ] do_not_call exclusion prevents calls to opted-out people
- [ ] Minute usage tracking increments correctly per call
- [ ] 80% warning fires once per billing period
- [ ] 100% hard stop prevents new calls
- [ ] Escalation notifications deliver via correct channels per user preference
- [ ] Call summary notifications work in both real-time and digest modes
- [ ] Variable substitution handles all 8 defined variables
- [ ] Voice selection correctly passes to VAPI API
- [ ] Shared number calls include church name in greeting
- [ ] All edge functions deploy successfully: `supabase functions deploy <name>`

**Dependencies:** Phase 1 migrations must be applied first

---

### Agent B: Frontend Calling UI Agent

**Scope:** Dashboard widgets, settings tabs, and calling-related UI.

**Skills Required:**
- React 19 + TypeScript
- TanStack React Query
- shadcn/ui components
- Responsive design (Tailwind)
- Form management (React Hook Form + Zod)

**Tasks:**
1. Redesign `Dashboard.tsx` with widget grid layout
2. Create `MinuteUsageWidget` component (progress bar, color coding)
3. Create `ActiveCampaignsWidget` component
4. Create `RecentCallsWidget` component (last 5 calls)
5. Create `EscalationWidget` component (open alerts by priority)
6. Create `CallSuccessWidget` component (percentage gauge)
7. Create `UpcomingCallsWidget` component (next 24h scheduled)
8. Create "Calling Configuration" tab in Settings:
   - Calling window time pickers
   - Timezone selector
   - Auto-trigger enable/disable per type
   - Script assignment per trigger
   - Anniversary milestone configuration
   - Overage approval toggle
9. Create "Notifications" tab in Settings:
   - Escalation channel preferences (SMS, email, both)
   - Call summary frequency (off, real-time, daily)
10. Add voice selection section in Settings (default voice for org)
11. Voice selection in script editor UI (dropdown + preview)

**Completion Criteria:**
- [ ] Dashboard renders all 6 widgets correctly
- [ ] Widgets display real data from Supabase queries
- [ ] Responsive layout works on desktop and mobile
- [ ] Calling Configuration tab saves all settings correctly
- [ ] Notifications tab persists preferences to notification_preferences table
- [ ] Voice selection dropdown shows preset options
- [ ] All components use shadcn/ui design system
- [ ] No TypeScript build errors

**Dependencies:** Phase 1 frontend foundation complete

---

## Phase 3: Script Management & AI Builder

**PRD Reference:** Epic 3 (sections 3.1 through 3.4)

### Agent A: AI Script Generation Backend

**Scope:** Claude integration for script generation, template system backend.

**Skills Required:**
- Anthropic Claude API
- Deno/TypeScript
- Prompt engineering
- Rate limiting

**Tasks:**
1. Create `generate-script` edge function:
   - Anthropic Claude API integration
   - System prompt for church communication context
   - Accept inputs: purpose, tone, key points, denomination, duration
   - Generate structured output (prompt + description)
   - Include variable placeholders in generated scripts
   - Rate limiting: 10 generations per org per day
2. Create template seeding logic:
   - 6 pre-built templates with full prompt content
   - Variable placeholders in all templates
   - Appropriate voice suggestions per template
3. Validate generated scripts match VAPI expected format

**Completion Criteria:**
- [ ] `generate-script` produces valid call scripts from all input combinations
- [ ] Generated scripts include appropriate variable placeholders
- [ ] Rate limit correctly blocks after 10 daily generations
- [ ] All 6 templates have complete, high-quality prompt content
- [ ] Templates are marked is_system=true and is_template=true
- [ ] Edge function deploys and responds correctly

**Dependencies:** Phase 1 DB migrations (call_scripts table changes)

---

### Agent B: Script Management Frontend

**Scope:** Template gallery, AI builder UI, voice selection, variable preview.

**Skills Required:**
- React 19 + TypeScript
- Form design
- UI/UX for wizard flows
- Audio playback (for voice preview)

**Tasks:**
1. Create template gallery view (grid of template cards)
2. Create "Use Template" flow (clone + customize)
3. Create AI script builder UI:
   - Purpose/scenario textarea
   - Tone selector (warm/professional/casual/pastoral)
   - Key points list input
   - Denomination/style input
   - Duration selector
   - "Generate" button with loading state
   - Preview panel for generated script
   - "Regenerate" and "Save" actions
4. Create variable reference panel (sidebar showing available vars)
5. Create variable preview (shows script with sample data substituted)
6. Voice selection in script editor (dropdown of 5 presets)
7. Voice preview button (play sample audio)

**Completion Criteria:**
- [ ] Template gallery displays all 6 system templates
- [ ] Clone template creates editable copy owned by org
- [ ] AI builder collects all inputs and calls generate-script
- [ ] Preview panel shows generated script clearly
- [ ] Regenerate produces different output
- [ ] Variable reference shows all 8 supported variables
- [ ] Voice preview plays audio sample
- [ ] Full flow: generate → preview → edit → save works end-to-end

**Dependencies:** Agent A (generate-script function) for full integration

---

## Phase 4: Billing & Onboarding

**PRD Reference:** Epic 4 (sections 4.1 through 4.4)

### Agent A: Stripe Backend Integration

**Scope:** All Stripe-related edge functions and webhook handling.

**Skills Required:**
- Stripe API (Checkout, Webhooks, Customer Portal)
- Deno/TypeScript
- Webhook signature verification
- Subscription lifecycle management

**Tasks:**
1. Create `stripe-checkout` edge function:
   - Create Checkout Session with plan selection
   - Attach org metadata
   - Handle trial configuration (14 days)
   - Differentiate minute allocation (15 vs 30 based on credit card)
2. Create `stripe-webhook` edge function:
   - Signature verification
   - Handle: checkout.session.completed
   - Handle: invoice.paid (reset minute_usage)
   - Handle: invoice.payment_failed
   - Handle: customer.subscription.deleted (activate read-only)
   - Handle: customer.subscription.updated
3. Create `stripe-portal` edge function:
   - Generate Customer Portal session URL
4. Create `seed-demo-data` edge function:
   - Generate 15 sample people
   - Generate 3 groups with members
   - Generate 2 sample scripts
   - Generate 5 call history entries
   - Generate 1 resolved escalation
   - Mark all with is_demo=true
5. Implement subscription tier → minute allocation mapping
6. Implement read-only mode enforcement logic

**Completion Criteria:**
- [ ] Stripe Checkout creates valid sessions for all 6 plan variants
- [ ] Webhooks correctly update org subscription fields
- [ ] Payment failure triggers read-only mode
- [ ] Minute usage resets on invoice.paid
- [ ] Trial correctly allocates 15 or 30 minutes
- [ ] Customer Portal allows plan management
- [ ] Demo data seeds correctly with is_demo flag
- [ ] All webhook events are idempotent (replay-safe)
- [ ] Webhook signatures are verified

**Dependencies:** Phase 1 DB (subscription fields on organizations table)

---

### Agent B: Onboarding & Billing Frontend

**Scope:** Onboarding wizard, pricing page, billing UI, demo mode.

**Skills Required:**
- React 19 + TypeScript
- Multi-step form wizards
- Stripe.js (frontend redirects)
- UI/UX design patterns

**Tasks:**
1. Create `OnboardingPage.tsx`:
   - 4-step wizard with progress indicator
   - Step 1: Account (email, password, name)
   - Step 2: Church (name, size, timezone)
   - Step 3: Channels (voice, SMS checkboxes)
   - Step 4: Summary + Start Trial
   - Validation per step
   - Redirect to dashboard after completion
2. Create `PricingPage.tsx`:
   - 3 plan cards with feature comparison
   - Monthly/Annual toggle
   - "Start Free Trial" buttons
   - Popular plan highlighting
3. Create Billing tab in Settings:
   - Plan display + minutes bar
   - Change Plan / Manage Billing buttons
   - Trial countdown
   - Overage approval UI
4. Implement read-only mode UI:
   - Banner on all pages
   - Disable action buttons
   - "Reactivate" CTA
5. Integrate guided tour (react-joyride):
   - 5 tour steps
   - First-login trigger
   - Skip/complete tracking
6. Demo data UI indicators:
   - "Sample data" labels
   - "Data will clear when you add your first member" notice

**Completion Criteria:**
- [ ] Onboarding wizard creates org with all fields correctly
- [ ] Pricing page correctly redirects to Stripe Checkout
- [ ] Billing tab shows accurate plan and usage info
- [ ] Read-only mode visually disables all action features
- [ ] Guided tour triggers on first login only
- [ ] Demo data is clearly labeled
- [ ] Tour skip marks completion
- [ ] Cannot skip onboarding steps

**Dependencies:** Agent A (Stripe endpoints) for full checkout flow

---

## Phase 5: Campaign Builder & SMS

**PRD Reference:** Epic 5 (sections 5.2 and 5.4)

### Agent A: Campaign Builder (Full Stack)

**Scope:** Complete campaign creation flow for both Voice and SMS.

**Tasks:**
1. Create `CampaignBuilder.tsx`:
   - Type selection (Voice/SMS)
   - Script selection (org scripts + templates)
   - Audience builder (filters + saved segments)
   - Schedule picker (now or later)
   - Review + launch
2. Create audience segment save/load logic
3. Create campaign progress/status page
4. Integrate with `send-group-call` (voice) and `send-sms` (SMS)
5. Minute estimation calculation
6. Update `send-sms` edge function to use messaging_campaigns table

**Completion Criteria:**
- [ ] Voice campaigns create correct call_attempts
- [ ] SMS campaigns send through Twilio correctly
- [ ] Audience filters produce correct people counts
- [ ] Saved segments persist and reload
- [ ] Scheduling respects calling window
- [ ] Campaign progress shows real-time status
- [ ] Minute estimate displays before launch

**Dependencies:** Phase 2 (automation backend) + Phase 1 (audience_segments table)

---

## Phase 6: AI Memory

**PRD Reference:** Epic 6 (sections 6.1 through 6.3)

### Agent A: Memory System (Full Stack)

**Scope:** Both backend memory creation and frontend memory management.

**Tasks:**
1. Update `vapi-webhook` to create member_memories on call completion
2. Implement embedding generation for member memories
3. Create context injection logic in `send-group-call`
4. Create context injection logic in `auto-call-trigger`
5. Create church memories admin UI (add/edit/delete church context)
6. Implement memory retrieval for VAPI prompt construction

**Completion Criteria:**
- [ ] Call completions create relevant member memories
- [ ] Embeddings are generated for all new memories
- [ ] VAPI calls include relevant member context in prompt
- [ ] VAPI calls include relevant church context in prompt
- [ ] Admin UI allows managing church-wide memories
- [ ] Context injection doesn't exceed VAPI limits

**Dependencies:** Phase 1 DB (member_memories table)

---

## Agent Communication Protocol

### Conflict Prevention Rules

1. **Agent A (Backend)** only modifies files in:
   - `supabase/migrations/`
   - `supabase/functions/`

2. **Agent B (Frontend)** only modifies files in:
   - `src/components/`
   - `src/pages/`
   - `src/stores/`
   - `src/hooks/`
   - `src/lib/`

3. **Shared files** (touched by both — serialize access):
   - `src/integrations/supabase/types.ts` (auto-generated, regenerate after migrations)
   - `package.json` (coordinate new dependency additions)

### Phase Transition Checklist

Before moving to the next phase:
- [ ] All agent tasks from current phase are complete
- [ ] All checklist items are verified
- [ ] `npm run build` succeeds
- [ ] `supabase db push` succeeds (if DB changes)
- [ ] All edge functions deploy without errors
- [ ] Integration testing passes (manual or automated)
- [ ] PRD checklist items for the phase are marked complete

---

## Timeline & Sequencing Summary

```
Phase 1: Database + Frontend Foundation     [Agent A: DB | Agent B: Frontend]
    ↓
Phase 2: Calling Automation                 [Agent A: Edge Functions | Agent B: Dashboard/Settings UI]
    ↓
Phase 3: Script Management                  [Agent A: AI Backend | Agent B: Script UI]
    ↓
Phase 4: Billing & Onboarding              [Agent A: Stripe Backend | Agent B: Onboarding/Billing UI]
    ↓
Phase 5: Campaign Builder                   [Agent A: Full Stack Campaign]
    ↓
Phase 6: AI Memory                          [Agent A: Full Stack Memory]
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| VAPI API rate limits | 2-second delay between calls (already implemented) |
| Stripe webhook reliability | Idempotent handlers, event deduplication |
| Timezone edge cases | Use `luxon` or `date-fns-tz` for all timezone ops |
| Memory context too large | Hard limit of 5 memories per category in VAPI prompt |
| Merge conflicts | Strict file ownership per agent |
| Demo data leaking to production | is_demo flag + auto-cleanup trigger |
| Minute tracking accuracy | Round up to nearest minute, reconcile with Stripe invoicing |

---

## Environment Variables Required (New)

```env
# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_ANNUAL_PRICE_ID=price_...
STRIPE_GROWTH_MONTHLY_PRICE_ID=price_...
STRIPE_GROWTH_ANNUAL_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_...

# Anthropic (Script Generation)
ANTHROPIC_API_KEY=sk-ant-...

# App
APP_URL=https://your-app.vercel.app
```

---

## Notes for Agent Operators

1. **Always check PRD checklists** before starting a task — items may have been partially completed.
2. **Run `node search.js "topic"` before implementing** — project memory may contain relevant past decisions.
3. **Run `node remember.js` after completing work** — persist implementation details for future sessions.
4. **Respect existing patterns** — use Zustand for global state, TanStack Query for server state, shadcn/ui for components.
5. **Test with organization context** — all queries must include `organization_id` and respect RLS.
6. **Edge functions use Deno** — imports use `https://` URLs or `jsr:` prefixes, not npm packages.
