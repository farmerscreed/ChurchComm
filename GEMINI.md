# 🤖 GEMINI.md — ChurchComm Project Guide

**Purpose:** This file provides guidance to Gemini when working with this repository. It ensures consistency and maintains project context across sessions.

---

## 🚨 V2 IMPLEMENTATION IN PROGRESS (READ FIRST)

We are currently implementing **ChurchComm V2** using a workflow-based system. Before doing any implementation work:

### Key Reference Files
| File | Purpose |
|------|---------|
| `AI_GUIDE.md` | Central implementation guide (project status, patterns, all epics) |
| `implementation-order.md` | Master task checklist - find next task here |
| `activity.md` | Session log - check what's been done |
| `.agent/workflows/task-X.X.md` | Individual task instructions |

### Workflow System
Tasks are organized as self-contained workflows in `.agent/workflows/`. Each file contains:
- Prerequisites
- Step-by-step implementation instructions
- Code snippets
- Verification steps

**To run a task:** Type `/task-2.1a` (or any task ID) to execute that workflow.

### Current Status
- **Epic 1:** ✅ COMPLETE (Database & Data Model)
- **Epic 2-7:** 🔄 In Progress (see `implementation-order.md`)

### After Any Work
1. Update `implementation-order.md` - mark tasks as `[x]`
2. Update `activity.md` with session summary

---

## 🚀 Quick Start Commands

```bash
# Development
npm run dev              # Start Vite dev server → http://localhost:8080
npm run build            # TypeScript compilation + Vite production build
npm run lint             # Run ESLint
npm run preview          # Preview production build locally

# Supabase
supabase functions deploy <function-name>  # Deploy edge function
supabase db push                           # Push schema changes
```

---

## 🏗️ Architecture Overview

**ChurchComm** is a Church Management System (ChMS) specializing in:
- Member & visitor tracking (CRM)
- AI-powered communications (SMS + Voice via VAPI)
- Group/ministry management
- Follow-up automation

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript + Vite (with SWC) |
| **Styling** | Tailwind CSS + shadcn/ui (Radix UI primitives) |
| **State Management** | Zustand (Auth/Org) + TanStack React Query (Server State) |
| **Backend** | Supabase (PostgreSQL + Auth + Row Level Security) |
| **Edge Functions** | Supabase Edge Functions (Deno runtime) |
| **Communications** | Twilio (SMS) + VAPI (AI Voice Calling) |
| **AI Memory** | OpenAI Embeddings (768-dim) + pgvector |

---

## 📁 Directory Structure

```
ChurchComm-main/
├── src/
│   ├── components/           # React components by domain
│   │   ├── auth/             # Login, signup, invite acceptance
│   │   ├── layout/           # AppLayout, navigation
│   │   ├── people/           # Member/visitor management
│   │   ├── groups/           # Group/ministry components
│   │   ├── communications/   # SMS, calling interfaces
│   │   └── ui/               # shadcn/ui components
│   ├── pages/                # Route-level views
│   ├── stores/authStore.ts   # Zustand store (auth + org context)
│   ├── hooks/                # Custom hooks (usePermissions, etc.)
│   └── lib/                  # Utilities
├── supabase/
│   ├── functions/            # Edge functions (Deno)
│   └── migrations/           # Database migrations
└── .agent/workflows/         # Task workflow files
```

### Path Alias
`@` maps to `./src` directory (configured in `vite.config.ts`)

**Example:** `import { Button } from '@/components/ui/button'`

---

## 🗄️ Database Schema (Supabase)

### Core Tables
- **organizations** - Multi-tenant support, church settings
- **organization_members** - User-org membership with roles (admin, pastor, member)
- **people** - Member/visitor CRM
- **groups** / **group_members** - Ministry/group definitions
- **call_scripts** - AI call script configurations
- **calling_campaigns** / **call_attempts** - Voice campaign tracking
- **messaging_campaigns** / **campaign_recipients** - SMS campaign tracking
- **minute_usage** - AI calling minute tracking per org
- **auto_triggers** - Automated calling triggers (birthday, first-timer, etc.)
- **escalation_alerts** - Crisis/follow-up alerts from calls

### Row-Level Security (RLS)
**All tables have RLS enabled.** Users must be in `organization_members` to access organization data.

> 🔒 **Security Pattern:** Always include `organization_id` in queries and ensure RLS policies are respected.

---

## 📝 Common Patterns

### Data Fetching with Organization Context
```typescript
const { currentOrganization } = useAuthStore();

const { data, error } = await supabase
  .from('people')
  .select('*')
  .eq('organization_id', currentOrganization.id);
```

### Role-Based Permissions
```typescript
import { usePermissions } from '@/hooks/usePermissions';

const { isAdmin, isPastor, canManageCampaigns } = usePermissions();
```

### Edge Function Template
```typescript
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Your logic here

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

---

## 🔐 Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# VAPI (AI Calling)
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id

# OpenAI (Memory System)
OPENAI_API_KEY=your_openai_api_key

# Stripe (Billing)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

---

## 🎨 Coding Standards

### UI Components
- **Use shadcn/ui components** from `src/components/ui/`
- **Add new components:** `npx shadcn add <component>`
- **Icons:** Use `lucide-react` exclusively

### Security Best Practices
- **Always include** `organization_id` in Supabase queries
- **Respect RLS policies** in all data operations
- **Validate inputs** in edge functions
- **Never expose** API keys in client-side code

---

## 🎯 Development Workflow

1. **Check Status** - Read `activity.md` and `implementation-order.md`
2. **Find Next Task** - Look for first uncompleted `[ ]` task
3. **Run Workflow** - Type `/task-X.X` to execute
4. **Verify** - Follow verification steps in workflow
5. **Update Logs** - Mark task complete, update activity.md

---

**Last Updated:** 2026-01-24  
**Project:** ChurchComm V2 by LawOne Cloud LLC
