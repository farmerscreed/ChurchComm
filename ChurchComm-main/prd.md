# Product Requirements Document: ChurchComm AI (V2)

## 1. Introduction & Goal

This document outlines the requirements for evolving the existing ChurchComm application from a single-church solution into a scalable, multi-tenant Software-as-a-Service (SaaS) platform.

The primary goal is to combine the best features of the existing application with the advanced, scalable concepts outlined in the `techSpec.md` to create a commercially viable product that enables churches to automate pastoral care and outreach through AI-powered voice conversations.

This PRD is based on a detailed analysis of the existing codebase, database schema, and a direct interview process to clarify strategic direction.

## 2. Strategic Direction & Target Audience

*   **Product Vision:** A multi-tenant SaaS platform.
*   **Target Audience:** Small to medium-sized churches (200-2,000 members) seeking to scale their outreach and pastoral care without increasing staff.
*   **Go-to-Market:** The platform will be a paid service with tiered subscription plans. A 14-day free trial will be offered, including a usage cap on call minutes to manage costs.

## 3. Core Epics & Feature Requirements

This section details the major bodies of work required to achieve the V2 vision.

### Epic 1: Multi-Tenancy, Onboarding & Billing

This is the highest priority epic, transforming the application into a true SaaS product.

*   **1.1. User Onboarding:**
    *   Implement a new multi-step user interface for new church organizations to sign up.
    *   The first user to register an organization becomes the default `'admin'` (owner).
    *   This admin user can then invite other staff and assign them roles.

*   **1.2. Subscription Management & Billing:**
    *   Implement a full Stripe integration for subscription management.
    *   Create a pricing page with the following tiers (as per `techSpec.md`):
        *   **Starter:** $197/mo (500 minutes)
        *   **Growth:** $397/mo (1500 minutes)
        *   **Enterprise:** $797/mo (5000 minutes)
    *   Integrate Stripe Checkout for new subscriptions.
    *   Implement a Stripe webhook to listen for subscription events (e.g., `invoice.paid`, `customer.subscription.deleted`) and update the `subscription_status` in the `organizations` table.
    *   Implement logic for the 14-day free trial, which must include a hard cap on included calling minutes.

*   **1.3. Role-Based Access Control (RBAC):**
    *   The existing `role` field in `organization_members` will be used ('admin', 'member').
    *   The application UI must be updated to show/hide administrative features based on the logged-in user's role. For example, only admins can access billing information or invite new users.

*   **1.4. Robust Invitation System (Existing & Functional):**
    *   **Current State:** The invitation system is already robustly implemented across the database, backend Edge Functions, and frontend UI.
        *   **Database:** The `invitations` table, `handle_new_user` trigger, and `accept_invitation` function provide a secure and comprehensive backend for invitation lifecycle management, token generation, expiration, and RLS. It seamlessly handles both new organization creation and invitation-based signups.
        *   **Automated Delivery:** The `send-invite` Edge Function (located at `supabase/functions/send-invite/index.ts`) handles automated sending of invitations via email (integrates with Resend) or SMS (integrates with Twilio). It includes robust pre-checks to prevent duplicate invitations or inviting existing members.
        *   **Frontend UI:** The `Settings.tsx` page (`src/pages/Settings.tsx`) provides a full-fledged interface for organization admins to:
            *   Send new invitations (specifying email/phone and role).
            *   View pending invitations.
            *   Resend invitations.
            *   Cancel invitations.
            *   Add existing users directly to the organization.
    *   **Future Enhancement:** Ensure the `APP_URL` in `send-invite` is configurable via environment variables for deployment flexibility.

### Epic 2: Database & Data Model Refinement

To support the new features and resolve conflicts, the following database changes are required.

*   **2.1. Consolidate Campaign Tables:**
    *   The generic `communication_campaigns` table will be renamed to `messaging_campaigns` to be used for future SMS/email features.
    *   All dependencies in the frontend and backend must be updated to reflect this name change.
    *   The `calling_campaigns` table will be the single source of truth for all AI call campaigns.

*   **2.2. Consolidate Script Tables:**
    *   The legacy `calling_scripts` table will be dropped from the database.
    *   The `call_scripts` table will be the single source of truth for storing AI call scripts.

*   **2.3. Simplify Prayer Request Feature:**
    *   No new `prayer_requests` table will be created.
    *   The existing `prayer_requests` text array field within the `vapi_call_logs` table is sufficient for the current scope.

### Epic 3: Automated Calling & Workflows

This epic focuses on building the intelligent, automated features that deliver the core value of the product.

*   **3.1. Robust Escalation Notification System:**
    *   **Current State:** The `vapi-webhook` (`supabase/functions/vapi-webhook/index.ts`) already correctly creates records in the `escalation_alerts` table when a crisis or pastoral care need is detected during a call.
    *   **Required Development:**
        *   A new Supabase Edge Function, `send-escalation-notification`, will be created.
        *   This function will be triggered by a new row insertion into `escalation_alerts`.
        *   The function will identify the correct staff members to notify based on their roles and on-call availability (as defined in `techSpec.md` and configured in organization settings).
        *   It will integrate with Twilio (for SMS) and Resend (for email) to send richly formatted, actionable alert messages.
        *   API keys and secrets for these services will be managed via Supabase environment variables.

*   **3.2. Automated Call Triggering Engine:**
    *   A new system will be developed to schedule calls automatically based on database events.
    *   **Initial Trigger:** A call shall be automatically scheduled within 24 hours of a new person being added with the `stage` of `'first_timer'`.
    *   This will likely involve a cron job (e.g., a scheduled Supabase Edge Function) that runs periodically to query for trigger conditions and create `call_attempts`.
    *   Future triggers (birthdays, missed attendance) will be built on this same engine.

*   **3.3. Enhanced Script Management:**
    *   The `call_scripts` table and the UI will be enhanced to support the advanced features from the `techSpec.md`.
    *   This includes adding support for different prompt types (e.g., `member_checkin`, `first_timer_followup`) and a system for dynamically inserting variables like `{first_name}` and `{church_name}` into the prompts before sending them to VAPI.

### Epic 4: AI & Memory Enhancements

*   **4.1. Contextual AI Conversations:**
    *   Utilize the existing `church_memories` vector table to provide more context to AI conversations.
    *   Implement logic within VAPI assistant configurations to query `church_memories` based on conversation context (e.g., using `match_church_memories` function). This would allow the AI to recall past interactions or specific facts about a person.

### Epic 5: Enhanced UI/UX for Multi-Tenancy

*   **5.1. Dashboard Overview:** The main dashboard (`/dashboard`) needs to be updated to provide a clear overview tailored for a multi-tenant system, including widgets for billing status, minute usage, and active escalations.
*   **5.2. Campaigns Builder:** The UI for creating `calling_campaigns` needs to be built out, allowing users to select a `call_script`, define a target audience using filters, and schedule the campaign.
*   **5.3. Settings & Configuration:** Review and enhance existing settings pages to ensure all multi-tenancy related configurations (e.g., billing, organization profile, team management) are intuitive and accessible to admins.

## 6. Technical Architecture & Decisions

*   **Frontend Framework:** The project will continue to use the existing **Vite + React** stack. It is stable and performant. A migration to Next.js is not a priority for this phase.
*   **Backend Logic:** All backend and asynchronous tasks will be implemented as **Supabase Edge Functions** (written in TypeScript).
*   **Data Integrity:** All RLS policies must be reviewed to ensure strict data separation between organizations. This includes policies on Supabase Storage if it's used for call recordings or other assets.

## 7. Success Metrics

The success of the V2 launch will be measured by:

*   **Acquisition:** Number of new organizations successfully onboarded and subscribed after their trial period.
*   **Activation:** Percentage of trial organizations that create and launch at least one calling campaign.
*   **Engagement:** Weekly active users and the number of calls processed per organization.
*   **System Performance:** Call success rate and webhook processing latency.

## 8. Open Questions & Future Considerations

*   Full implementation of a generic `messaging_campaigns` system for SMS/email blasts beyond just invites.
*   Deeper integrations with third-party Church Management Systems (e.g., Planning Center).
*   Advanced analytics dashboard with trend analysis.