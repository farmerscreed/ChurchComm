# 🤖 AI_GUIDE.md — ChurchComm V2 Development Guide

**Purpose:** This is the central guide for AI assistants (Claude, Gemini, or any other) working on ChurchComm V2. It provides context, workflows, and implementation patterns to ensure consistent development across sessions.

> **For both Claude and Gemini:** Read this file FIRST when starting any development session.

---

## 📋 Project Status Overview

| Item | Status |
|------|--------|
| **Current Phase** | All Epics Complete! 🎉 |
| **Epic 1** | ✅ COMPLETE (Database & Data Model) |
| **Epic 2** | ✅ COMPLETE (Automated Calling & Workflows) |
| **Epic 3** | ✅ COMPLETE (Script Management & AI Builder) |
| **Epic 4** | ✅ COMPLETE (Multi-Tenancy, Onboarding & Billing) |
| **Epic 5** | ✅ COMPLETE (Enhanced UI/UX) |
| **Epic 6** | ✅ COMPLETE (AI & Memory Enhancements) |
| **Epic 7** | ✅ COMPLETE (Demo Mode & Guided Tour) |
| **PRD Location** | `ChurchComm-main/prd.md` |
| **Activity Log** | `activity.md` (root) |
| **Workflows** | `.agent/workflows/` |

---

## 🚀 Quick Start for Any Session

### 1. Understand Current State
```bash
# Check what's been done
cat activity.md

# Check available workflows
ls .agent/workflows/
```

### 2. Find Your Task
Look at `implementation-order.md` for the next uncompleted task, or use a specific workflow:
```bash
# Run a specific task workflow
# Example: /task-2.1a
```

### 3. After Completing Work
Update `activity.md` with what you accomplished.

---

## 🗂️ Key Files Reference

| File | Purpose | When to Read |
|------|---------|--------------| 
| `ChurchComm-main/prd.md` | Full PRD with all requirements | When you need detailed requirements |
| `activity.md` | Session log of completed work | ALWAYS - before starting |
| `implementation-order.md` | Master checklist of all tasks | To find next task |
| `.agent/workflows/task-X.X.md` | Self-contained task instructions | When implementing a specific task |
| `ChurchComm-main/CLAUDE.md` | Original project guide (architecture, patterns) | For coding patterns and standards |
| `ChurchComm-main/techSpec.md` | Technical specification details | For deep technical reference |

---

## 🏗️ Architecture Summary

### Tech Stack
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Edge Functions + RLS)
- **AI Voice:** VAPI + 11Labs
- **SMS:** Twilio
- **Email:** Resend
- **Payments:** Stripe
- **AI Generation:** Claude (script builder)
- **Embeddings:** OpenAI text-embedding-3-small (768-dim)

### Directory Structure
```
ChurchComm-main/
├── src/
│   ├── components/           # React components by domain
│   ├── pages/                # Route-level views
│   ├── stores/authStore.ts   # Zustand store (auth + permissions)
│   ├── hooks/                # Custom hooks (usePermissions, etc.)
│   └── lib/                  # Utilities
├── supabase/
│   ├── functions/            # Edge functions (Deno)
│   └── migrations/           # Database migrations
└── .agent/workflows/         # Task workflow files
```

---

## 📝 Development Patterns

### Edge Function Template
```typescript
// supabase/functions/function-name/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Your logic here

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### React Component with Permissions
```typescript
import { usePermissions } from '@/hooks/usePermissions';

export function MyComponent() {
  const { canManagePeople, canManageCampaigns, isAdmin } = usePermissions();

  if (!canManageCampaigns) {
    return <div>You don't have permission to view this.</div>;
  }

  return <div>...</div>;
}
```

### Supabase Query Pattern
```typescript
const { currentOrganization } = useAuthStore();

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('organization_id', currentOrganization.id);
```

---

## ✅ Epic Progress Tracker

### Epic 1: Database & Data Model ✅ COMPLETE
All migrations applied, RLS policies created, frontend permissions implemented.

### Epic 2: Automated Calling & Workflows ✅ COMPLETE
- [x] 2.1a - auto-call-trigger scaffold + calling window
- [x] 2.1b - first_timer trigger logic
- [x] 2.1c - birthday + anniversary triggers
- [x] 2.1d - VAPI call execution
- [x] 2.2a - send-escalation-notification function
- [x] 2.2b - database trigger for escalation
- [x] 2.3 - minute usage tracking
- [x] 2.4 - send-call-summary function

### Epic 3: Script Management & AI Builder ✅ COMPLETE
- [x] 3.1a - template fields + gallery UI
- [x] 3.1b - integrate gallery into Settings
- [x] 3.2 - AI Script Builder with Claude
- [x] 3.3 - variable substitution engine
- [x] 3.4 - voice selection

### Epic 4: Multi-Tenancy, Onboarding & Billing ✅ COMPLETE
- [x] 4.1a - onboarding wizard UI
- [x] 4.1b - wire onboarding to database
- [x] 4.2a - Stripe checkout/portal functions
- [x] 4.2b - Stripe webhook handler
- [x] 4.2c - subscription fields migration
- [x] 4.2d - PricingPage + Billing UI
- [x] 4.2e - read-only mode for lapsed subscriptions
- [x] 4.3 - phone number allocation
- [x] 4.4 - invitation system updates

### Epic 5: Enhanced UI/UX ✅ COMPLETE
- [x] 5.1a - Dashboard widget grid
- [x] 5.1b - escalation + upcoming calls widgets
- [x] 5.2a - Campaign Builder (type + script)
- [x] 5.2b - Campaign Builder (audience + scheduling)
- [x] 5.2c - Campaign Builder (review + launch)
- [x] 5.3a - Settings: Calling Configuration tab (consolidated into AI & Calling)
- [x] 5.3b - Settings: Notifications tab (consolidated into General)
- [x] 5.3c - Settings: Team tab + Voice section
- [x] 5.4 - SMS campaign support via Campaign Builder

### Epic 6: AI & Memory Enhancements ✅ COMPLETE
- [x] 6.1 - member_memories table + matching function
- [x] 6.2 - vapi-webhook memory creation
- [x] 6.3a - church context admin UI
- [x] 6.3b - context injection into VAPI calls

### Epic 7: Demo Mode & Guided Tour ✅ COMPLETE
- [x] 7.1a - seed-demo-data function
- [x] 7.1b - is_demo flag + auto-clear
- [x] 7.2 - guided tour implementation

---

## 🔧 Workflow System

### How Workflows Work
Each task has a dedicated workflow file in `.agent/workflows/`. These are self-contained instructions that can be executed independently.

### Running a Workflow
When asked to run a task like `/task-2.1a`, read the corresponding workflow file:
```
.agent/workflows/task-2.1a.md
```

### Workflow File Format
```markdown
---
description: Short description of the task
epic: Epic X
task_id: X.Xa
---

## Context
Brief context for this task.

## Prerequisites
What must be done before this task.

## Implementation Steps
1. Step 1
2. Step 2
// turbo (if safe to auto-run)
3. Step 3

## Verification
How to verify the task is complete.

## On Completion
Update activity.md with: [summary of what was done]
```

---

## 📌 Important Conventions

### Naming
- Edge functions: kebab-case (e.g., `auto-call-trigger`)
- React components: PascalCase (e.g., `CampaignBuilder`)
- Hooks: camelCase with use prefix (e.g., `usePermissions`)
- Database: snake_case (e.g., `minute_usage`)

### Migrations
All migrations go in `supabase/migrations/` with timestamp prefix:
```
YYYYMMDDHHMMSS_description.sql
```

### Testing
- Test with organization context (multi-tenant aware)
- Check RLS policies are respected
- Verify role-based permissions work

---

## 🚨 Critical Reminders

1. **Always check `activity.md`** before starting work
2. **Update `activity.md`** after completing work
3. **One task per session** to avoid context limits
4. **Use workflows** for self-contained instructions
5. **Respect RLS** - always include organization_id in queries
6. **Test permissions** - verify admin/pastor/member access works

---

## 🔗 Related Documentation

- **Original CLAUDE.md:** `ChurchComm-main/CLAUDE.md` (coding standards, memory system)
- **Full PRD:** `ChurchComm-main/prd.md` (complete requirements)
- **Tech Spec:** `ChurchComm-main/techSpec.md` (detailed technical spec)
- **Activity Log:** `activity.md` (session history)

---

**Last Updated:** 2026-01-25  
**Compatible With:** Claude, Gemini, and other AI assistants
