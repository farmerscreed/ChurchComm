# 🏛️ CLAUDE.md — ChurchComm V2 Guide

**Purpose:** Guidance for Claude Code working on ChurchComm V2 implementation.

---

## 🚨 V2 IMPLEMENTATION IN PROGRESS (READ FIRST)

### Key Reference Files
| File | Purpose |
|------|---------|
| `../AI_GUIDE.md` | Central implementation guide (epics, status, patterns) |
| `../implementation-order.md` | Master task checklist |
| `../activity.md` | Session log |
| `../.agent/workflows/task-X.X.md` | Task instructions |

### Workflow System
**To run a task:** Type `/task-2.1a` (or any task ID)

### Current Status
- **Epic 1:** ✅ COMPLETE
- **Epic 2-7:** 🔄 In Progress

### After Any Work
1. Update `../implementation-order.md` - mark `[x]`
2. Update `../activity.md` with summary

---

## 🚀 Quick Commands

```bash
npm run dev                                  # Dev server → :8080
supabase functions deploy <function-name>   # Deploy edge function
supabase db push                             # Push migrations
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand + React Query |
| Backend | Supabase (PostgreSQL + RLS) |
| Edge | Deno runtime |
| Comms | Twilio (SMS) + VAPI (AI Voice) |
| AI | OpenAI embeddings + pgvector |

---

## 📁 Key Directories

```
src/
├── components/        # UI components by domain
├── pages/            # Routes
├── stores/           # Zustand (authStore.ts)
├── hooks/            # Custom hooks (usePermissions)
└── lib/              # Utils

supabase/
├── functions/        # Edge functions
└── migrations/       # DB schema
```

**Path Alias:** `@` → `./src`

---

## 🗄️ Database (RLS Enabled)

**Core Tables:**
- `organizations` - Multi-tenant orgs
- `organization_members` - User roles (admin/pastor/member)
- `people` - Members/visitors CRM
- `groups` / `group_members` - Ministries
- `call_scripts` - AI call configs
- `calling_campaigns` / `call_attempts` - Voice campaigns
- `messaging_campaigns` - SMS campaigns
- `minute_usage` - Calling minute tracking
- `auto_triggers` - Automated calls
- `escalation_alerts` - Crisis follow-ups

> 🔒 **Always include `organization_id` in queries**

---

## 📝 Common Patterns

### Organization Context
```typescript
const { currentOrganization } = useAuthStore();

const { data } = await supabase
  .from('people')
  .select('*')
  .eq('organization_id', currentOrganization.id);
```

### Role Permissions
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

  // Your logic

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

---

## 🎨 Coding Standards

- **UI:** Use shadcn/ui (`npx shadcn add <component>`)
- **Icons:** `lucide-react` only
- **Security:** Always include `organization_id`, respect RLS
- **Components:** Single-purpose, domain-grouped
- **TypeScript:** Loose config - aim for safety, don't block progress

---

## 🔐 Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# VAPI
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

**Last Updated:** 2026-01-24  
**Project:** ChurchComm V2 by LawOne Cloud LLC
