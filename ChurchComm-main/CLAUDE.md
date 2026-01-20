# 🏛️ CLAUDE.md — ChurchComm Project Guide

**Purpose:** This file provides guidance to Claude Code when working with this repository. It ensures consistency, utilizes the long-term memory system, and maintains project context across sessions.

---

## 🧠 Memory System (READ THIS FIRST)

ChurchComm uses a **Supabase Vector Database** (768-dimensional embeddings) for persistent project memory across all sessions.

### Memory Workflow

#### **BEFORE Starting Any Task**
```bash
node search.js "your topic or feature name"
```
- **Why:** Recall past decisions, implementation details, bugs, and technical debt
- **Example:** `node search.js "invite system RLS"`
- **Returns:** Relevant memories from previous sessions with context

#### **AFTER Completing Any Task**
```bash
node remember.js "Summary of change" "Technical details/preferences"
```
- **Why:** Ensure this work isn't forgotten in future sessions
- **Example:** `node remember.js "Fixed RLS invite bug" "Added organization_id check in invite edge function"`
- **Saves:** Decision context, implementation details, lessons learned

### Memory Implementation
- **Core Logic:** `church-ai.js`
- **Vector Table:** `church_memories` (768-dimensional)
- **Embedding Model:** OpenAI text-embedding-3-small
- **Search Function:** `match_memories(query_embedding, match_threshold, match_count)`

> ⚠️ **Critical:** Always check memory before making architectural decisions or "fixing" something that may have been intentionally designed a certain way.

---

## 🚀 Quick Start Commands

```bash
# Development
npm run dev              # Start Vite dev server → http://localhost:8080
npm run build            # TypeScript compilation + Vite production build
npm run lint             # Run ESLint
npm run preview          # Preview production build locally

# Memory Operations
node search.js "topic"   # 🔍 RECALL: Search project memory
node remember.js "x" "y" # 💾 COMMIT: Save to project memory

# Supabase
supabase functions deploy <function-name>  # Deploy edge function
supabase db push                           # Push schema changes
```

---

## 🏗️ Architecture Overview

**ChurchComm** is a modern Church Management System (ChMS) specializing in:
- Member & visitor tracking (CRM)
- AI-powered communications (SMS + Voice)
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

### State Management Pattern

- **Global Auth State:** `src/stores/authStore.ts` (Zustand)
  - Session, user, currentOrganization, permissions
  - Session handling is **critical** for edge function auth
- **Server State:** TanStack React Query hooks in page components
- **Local State:** React `useState` for UI-only concerns

---

## 📁 Directory Structure

```
churchcomm/
├── src/
│   ├── components/           # React components by domain
│   │   ├── auth/             # Login, signup, invite acceptance
│   │   ├── layout/           # AppLayout, navigation
│   │   ├── people/           # Member/visitor management
│   │   ├── groups/           # Group/ministry components
│   │   ├── communications/   # SMS, calling interfaces
│   │   └── ui/               # shadcn/ui components (Button, Dialog, etc.)
│   ├── pages/                # Route-level views (Dashboard, People, etc.)
│   ├── stores/
│   │   └── authStore.ts      # Zustand store (auth + org context)
│   ├── integrations/
│   │   └── supabase/         # Supabase client setup
│   ├── hooks/
│   │   └── use-toast.ts      # Custom hooks
│   └── lib/
│       └── utils.ts          # Utilities (cn() for Tailwind class merging)
├── supabase/
│   ├── functions/            # Edge functions (SMS, VAPI, invites)
│   └── migrations/           # Database schema versions
├── church-ai.js              # Memory system implementation
├── search.js                 # Memory search CLI
└── remember.js               # Memory commit CLI
```

### Path Alias
`@` maps to `./src` directory (configured in `vite.config.ts`)

**Example:** `import { Button } from '@/components/ui/button'`

---

## 🗺️ Routing Structure

### Public Routes
- `/login` → `LoginPage` (authentication)
- `/invite/:token` → `AcceptInvite` (invite acceptance)

### Protected Routes (under `AppLayout`)
- `/dashboard` → Dashboard overview
- `/people` → Member/visitor management
- `/groups` → Group management
- `/communications` → SMS + AI calling interface
- `/call-history` → Call delivery tracking
- `/follow-ups` → Follow-up pipeline
- `/settings` → Organization config + calling scripts
- `/system-test` → System diagnostics

---

## 🗄️ Database Schema (Supabase)

### Core Tables

#### `organizations`
- **Purpose:** Multi-tenant support, church/org settings
- **Key Fields:** `id`, `name`, `slug`, `subscription`, `created_at`
- **RLS:** Users can only access their organization

#### `organization_members`
- **Purpose:** User-org membership with role-based access
- **Key Fields:** `user_id`, `organization_id`, `role`, `permissions`
- **RLS:** Filtered by user authentication

#### `people`
- **Purpose:** Member/visitor CRM
- **Key Fields:** `id`, `organization_id`, `first_name`, `last_name`, `phone`, `email`, `status`, `groups`
- **RLS:** Filtered by `organization_id`

#### `groups` / `group_members`
- **Purpose:** Ministry/group definitions and memberships
- **RLS:** Organization-scoped

#### `communication_campaigns` / `campaign_recipients`
- **Purpose:** SMS campaign tracking
- **Key Fields:** Campaign metadata, recipient status, delivery tracking

#### `calling_scripts` / `calling_campaigns` / `call_attempts`
- **Purpose:** VAPI AI agent configurations and call tracking
- **Key Fields:** Script content, voice settings, call outcomes

#### `follow_up_messages`
- **Purpose:** Automated follow-up pipeline
- **Key Fields:** Trigger conditions, message templates

#### `church_memories` ⭐
- **Purpose:** Vector-based project memory (AI context persistence)
- **Key Fields:** `id`, `organization_id`, `content`, `embedding (vector(768))`, `metadata (jsonb)`
- **Search Function:** `match_memories(query_embedding, match_threshold, match_count)`

### Row-Level Security (RLS)

**All tables have RLS enabled.** Users must be in `organization_members` to access organization data.

> 🔒 **Security Pattern:** Always include `organization_id` in queries and ensure RLS policies are respected.

---

## ⚡ Edge Functions

Located in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `send-sms` | Twilio SMS integration |
| `send-group-call` | VAPI group calling trigger |
| `send-followup-notification` | Follow-up messaging automation |
| `send-invite` | Email invitations to new users |
| `vapi-webhook` | Call event webhook listener |

### Deployment
```bash
supabase functions deploy <function-name>
```

### Authentication in Edge Functions
- Edge functions receive session tokens via headers
- Recent fixes in `authStore.ts` ensure proper session handling
- Always validate `organization_id` in edge functions

---

## 📝 Common Patterns

### Data Fetching with Organization Context
```typescript
const { currentOrganization } = useAuthStore();

useEffect(() => {
  if (currentOrganization?.id) {
    loadData(); // Supabase query
  }
}, [currentOrganization]);
```

### Standard Supabase Query
```typescript
const { data, error } = await supabase
  .from('people')
  .select('*')
  .eq('organization_id', currentOrganization.id);
```

### Using React Query for Server State
```typescript
const { data: people, isLoading } = useQuery({
  queryKey: ['people', currentOrganization?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('people')
      .select('*')
      .eq('organization_id', currentOrganization.id);
    return data;
  },
  enabled: !!currentOrganization?.id,
});
```

### Toast Notifications
```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({
  title: "Success",
  description: "Operation completed successfully",
});
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZXFxZ3djZG56eHB3dHN1dXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzU4ODcsImV4cCI6MjA4Mzc1MTg4N30.5BrO35dGc3qryxEqnMBdm97zoIbX9kXRu3Y1TK-UqH4

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# VAPI (AI Calling)
VAPI_API_KEY=your_vapi_api_key
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id

# OpenAI (Memory System)
OPENAI_API_KEY=xxx
```

---

## 🎨 Coding Standards

### UI Components
- **Use shadcn/ui components** from `src/components/ui/`
- **Add new components:** `npx shadcn add <component>`
- **Icons:** Use `lucide-react` exclusively
- **Example:** `import { Button } from '@/components/ui/button'`

### TypeScript Configuration
- Configured loosely: `noImplicitAny: false`, `strictNullChecks: false`
- Aim for type safety where possible, but don't let it block development

### Security Best Practices
- **Always include** `organization_id` in Supabase queries
- **Respect RLS policies** in all data operations
- **Validate inputs** in edge functions
- **Never expose** API keys or tokens in client-side code

### Component Patterns
- Keep components focused and single-purpose
- Use composition over prop drilling
- Extract reusable logic into custom hooks
- Co-locate related components in domain folders

---

## 📋 Important Notes

### Large Feature Pages
- **`Communications.tsx`** - Complex SMS + AI calling interface
- **`Settings.tsx`** - Organization configuration + calling scripts management
- **`CallHistory.tsx`** - Delivery tracking with multiple data sources

### Known Considerations
- Session handling in `authStore.ts` is critical for edge function auth
- Vector embeddings are 768-dimensional (don't change without migration)
- Twilio and VAPI integrations require active accounts with credits
- RLS policies can be strict - always test with appropriate organization context

### Performance Tips
- Use React Query for caching and background updates
- Implement pagination for large datasets (people, call history)
- Optimize Supabase queries with appropriate indexes
- Consider using Supabase Realtime for live updates (groups, campaigns)

---

## 🎯 Development Workflow

1. **Check Memory** - Run `node search.js "feature"` before starting
2. **Read Relevant Code** - Use `@` path alias to navigate
3. **Test with Organization Context** - Always verify RLS and multi-tenancy
4. **Update Memory** - Run `node remember.js` after completing work
5. **Commit with Context** - Include memory references in commit messages

---

## 🤝 Contributing

When making changes:
1. Follow the established patterns in this document
2. Update memory system with significant decisions
3. Test across different organization contexts
4. Ensure RLS policies are respected
5. Update this CLAUDE.md if you establish new patterns

---

**Last Updated:** January 2026  
**Project:** ChurchComm by LawOne Cloud LLC  
**Memory System Version:** 1.0 (768-dim vectors)

