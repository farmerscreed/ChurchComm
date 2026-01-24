# ChurchConnect V1 - Clean Extraction & Build Plan

## Executive Summary

Extract production-ready code from `divine-connect-frontend` into a new clean repository `churchconnect-v1` with **5 core features**: Members CRUD, CSV Import, Groups, SMS Broadcasting, and AI Calls. Target: Under 50 files, demo-ready in 7 days.

**Approach**: Extract existing working code as-is (not simplified rewrites)
**Database**: 13 tables (7 core + 6 calling system)
**Location**: `/workspaces/churchconnect-v1`

---

## Phase 1: Repository Setup (Day 1)

### 1.1 Initialize Project

```bash
mkdir /workspaces/churchconnect-v1
cd /workspaces/churchconnect-v1
npm create vite@latest . -- --template react-ts
npm install
```

### 1.2 Install Dependencies

```bash
# Core
npm install @supabase/supabase-js@2.50.0
npm install react-router-dom@6.26.2
npm install zustand@5.0.5
npm install @tanstack/react-query@5.56.2

# UI & Forms
npm install papaparse@5.5.3 react-dropzone@14.3.8
npm install lucide-react@0.462.0
npm install class-variance-authority@0.7.1
npm install clsx@2.1.1
npm install tailwind-merge@2.5.2
npm install date-fns@3.6.0

# Dev Dependencies
npm install -D tailwindcss@3.4.11 postcss autoprefixer
npm install -D @types/papaparse
```

### 1.3 Copy Configuration Files

**From `divine-connect-frontend`, copy these exact files:**

1. `tailwind.config.ts` → Keep as-is
2. `vite.config.ts` → Keep as-is
3. `tsconfig.json` → Keep as-is
4. `components.json` → Keep as-is (for shadcn)
5. `postcss.config.js` → Create standard config
6. `index.html` → Copy, update title to "ChurchConnect"

### 1.4 Create Environment Files

**`.env.example`:**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**`.gitignore`:** Standard Node.js + `.env`, `dist/`, `node_modules/`

---

## Phase 2: Database Migration (Day 2)

### 2.1 Create Supabase Project

1. Go to supabase.com, create new project: `churchconnect-v1`
2. Save URL and anon key to `.env`

### 2.2 Extract & Consolidate Migrations

Create `supabase/migrations/` directory with 5 migration files:

#### Migration 1: Initial Schema
**File:** `20240320000000_initial_schema.sql`
**Source:** `/workspaces/divine-connect-frontend/supabase/migrations/20240320000000_initial_schema.sql`
**Action:** Copy lines 1-127 exactly (organizations, organization_members, RLS, triggers)

#### Migration 2: People Schema
**File:** `20240321000001_people_schema.sql`
**Source:** `/workspaces/divine-connect-frontend/supabase/migrations/20240321000002_people_schema.sql`
**Action:** Copy entire file (status_enum, people table, RLS, indexes)

#### Migration 3: Groups Schema
**File:** `20240321000002_groups_schema.sql`
**Source:** `/workspaces/divine-connect-frontend/supabase/migrations/20240321000003_groups_schema.sql`
**Action:** Copy entire file (groups, group_members, RLS)

#### Migration 4: Communications Schema
**File:** `20240321000003_communications_schema.sql`
**Source:** `/workspaces/divine-connect-frontend/supabase/migrations/20250615120006_communications_hub_schema.sql`
**Tables to extract:**
- communication_campaigns (lines 5-29)
- communication_templates (lines 32-45)
- campaign_recipients (lines 48-64)
- RLS policies (lines 109-177)

**Action:** Extract these tables only, omit audience_segments and campaign_analytics

#### Migration 5: Calling System Schema
**File:** `20240321000004_calling_system_schema.sql`
**Source:** Multiple files:
- `/workspaces/divine-connect-frontend/supabase/migrations/20250615120007_calling_system_schema.sql`
- `/workspaces/divine-connect-frontend/supabase/migrations/20250624000000_vapi_and_escalations_schema.sql`

**Tables to extract:**
- calling_scripts
- calling_campaigns
- call_attempts
- attendance_tracking
- follow_up_messages
- campaign_summaries
- vapi_call_logs
- escalation_alerts

**Action:** Merge into single comprehensive calling schema file

### 2.3 Run Migrations

```bash
# Option 1: Supabase CLI (if available)
supabase db reset

# Option 2: Manual (copy SQL to Supabase SQL Editor)
```

### 2.4 Verification

Execute in Supabase SQL Editor:
```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
-- Expected: 13 tables

-- Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';
-- Expected: All tables have rowsecurity = true
```

---

## Phase 3: Backend Functions (Day 3)

### 3.1 Create Functions Directory Structure

```
supabase/functions/
├── _shared/
│   └── cors.ts
├── send-sms/
│   ├── index.ts
│   └── deno.json
├── send-group-call/
│   ├── index.ts
│   └── deno.json
└── vapi-webhook/
    ├── index.ts
    └── deno.json
```

### 3.2 Extract Functions Exactly

#### Shared CORS
**File:** `supabase/functions/_shared/cors.ts`
**Source:** `/workspaces/divine-connect-frontend/supabase/functions/_shared/cors.ts`
**Action:** Copy lines 1-5 exactly

#### Send SMS Function
**File:** `supabase/functions/send-sms/index.ts`
**Source:** `/workspaces/divine-connect-frontend/supabase/functions/send-sms/index.ts`
**Action:** Copy lines 1-223 exactly
**Note:** Function reads from `communication_automation_settings` table (lines 33-37). Options:
- Add this table to migrations, OR
- Modify to use env vars only (recommended for V1)

**Recommended modification (lines 43-49):**
```typescript
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const FROM_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER')
```

#### Send Group Call Function
**File:** `supabase/functions/send-group-call/index.ts`
**Source:** `/workspaces/divine-connect-frontend/supabase/functions/send-group-call/index.ts`
**Action:** Copy entire file (lines 1-324)
**Note:** Same settings table dependency - use env vars

#### VAPI Webhook Function
**File:** `supabase/functions/vapi-webhook/index.ts`
**Source:** `/workspaces/divine-connect-frontend/supabase/functions/vapi-webhook/index.ts`
**Action:** Copy lines 1-121 exactly
**Note:** Calls `send-escalation-notification` function (lines 99-106) - this is optional for V1, can comment out if function doesn't exist

### 3.3 Create deno.json for Each Function

```json
{
  "importMap": "../import_map.json"
}
```

### 3.4 Deploy Functions

```bash
supabase functions deploy send-sms
supabase functions deploy send-group-call
supabase functions deploy vapi-webhook
```

### 3.5 Set Environment Variables

In Supabase Dashboard → Edge Functions → Secrets:
```
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
VAPI_API_KEY=your_key
VAPI_PHONE_NUMBER_ID=your_phone_id
VAPI_WEBHOOK_SECRET=your_secret
```

---

## Phase 4: Frontend Core (Days 4-5)

### 4.1 Directory Structure

```
src/
├── main.tsx
├── App.tsx
├── index.css
├── vite-env.d.ts
├── components/
│   ├── ui/ (15 shadcn components)
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── people/
│   │   ├── CSVUpload.tsx
│   │   ├── PeopleDirectory.tsx
│   │   └── AddPersonDialog.tsx
│   ├── groups/
│   │   └── GroupManager.tsx
│   └── communications/
│       └── SMSBroadcast.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── People.tsx
│   ├── Groups.tsx
│   └── Communications.tsx
├── hooks/
│   └── use-toast.ts
├── lib/
│   └── utils.ts
├── stores/
│   └── authStore.ts
└── integrations/
    └── supabase/
        ├── client.ts
        └── types.ts
```

### 4.2 Install Essential shadcn/ui Components

```bash
npx shadcn@latest init
# Choose: Default style, Slate color, CSS variables: Yes

npx shadcn@latest add button input label card dialog table
npx shadcn@latest add select badge progress toast textarea
npx shadcn@latest add command alert-dialog avatar
```

**Total: 15 UI components** (targets under 50 file limit)

### 4.3 Copy Core Files Exactly

#### Critical Files (Copy as-is, lines 1 to end):

1. **`src/components/people/CSVUpload.tsx`**
   Source: `/workspaces/divine-connect-frontend/src/components/people/CSVUpload.tsx`
   Lines: 1-427 (ENTIRE FILE)

2. **`src/components/groups/GroupManager.tsx`**
   Source: `/workspaces/divine-connect-frontend/src/components/groups/GroupManager.tsx`
   Lines: 1-368 (ENTIRE FILE)

3. **`src/stores/authStore.ts`**
   Source: `/workspaces/divine-connect-frontend/src/stores/authStore.ts`
   Lines: 1-259 (ENTIRE FILE)

4. **`src/lib/utils.ts`**
   Source: Standard shadcn utils
   ```typescript
   import { clsx, type ClassValue } from "clsx"
   import { twMerge } from "tailwind-merge"

   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs))
   }
   ```

5. **`src/hooks/use-toast.ts`**
   Source: Copy from shadcn installation

### 4.4 Create Supabase Client

**File:** `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 4.5 Create Simple Pages

#### Dashboard.tsx
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { Users, UsersRound, MessageSquare } from 'lucide-react';

export default function Dashboard() {
  const { currentOrganization } = useAuthStore();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{currentOrganization?.member_count || 0}</p>
          </CardContent>
        </Card>
        {/* Add more cards as needed */}
      </div>
    </div>
  );
}
```

#### People.tsx
```typescript
import { CSVUpload } from '@/components/people/CSVUpload';
import { PeopleDirectory } from '@/components/people/PeopleDirectory';

export default function People() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">People</h1>
      <CSVUpload onUploadComplete={() => window.location.reload()} />
      <PeopleDirectory />
    </div>
  );
}
```

#### Groups.tsx
```typescript
import { GroupManager } from '@/components/groups/GroupManager';

export default function Groups() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Groups</h1>
      <GroupManager />
    </div>
  );
}
```

### 4.6 Create App Router

**File:** `src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';
import LoginPage from '@/components/auth/LoginPage';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import People from '@/pages/People';
import Groups from '@/pages/Groups';
import Communications from '@/pages/Communications';

function App() {
  const { fetchSession, user, loading } = useAuthStore();

  useEffect(() => {
    fetchSession();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/" element={user ? <AppLayout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="people" element={<People />} />
          <Route path="groups" element={<Groups />} />
          <Route path="communications" element={<Communications />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### 4.7 Create Layout Components

Extract simplified versions from `/workspaces/divine-connect-frontend/src/components/layout/`

Keep only:
- Sidebar with 4 menu items (Dashboard, People, Groups, Communications)
- TopBar with user menu and logout
- AppLayout as container with Outlet

---

## Phase 5: Integration & Testing (Day 6)

### 5.1 Start Development Server

```bash
cd /workspaces/churchconnect-v1
npm run dev
```

### 5.2 Testing Checklist

#### Authentication
- [ ] Sign up creates organization and adds user to organization_members
- [ ] Login redirects to dashboard
- [ ] authStore loads currentOrganization correctly
- [ ] Logout clears session

#### People Management
- [ ] Add person manually (create AddPersonDialog component)
- [ ] Edit person details
- [ ] Delete person
- [ ] CSV upload validates correctly
- [ ] CSV upload creates person records
- [ ] CSV upload assigns groups

#### Groups
- [ ] Create group
- [ ] Delete group with confirmation
- [ ] Add members to group
- [ ] Remove members from group
- [ ] Member count updates in real-time

#### SMS Broadcasting
- [ ] Create SMSBroadcast component that calls send-sms function
- [ ] Send to individual works
- [ ] Send to group works
- [ ] Variable {Name} replaced correctly
- [ ] Campaign tracking creates records

### 5.3 Common Issues & Fixes

**Issue: Type errors from Supabase**
Fix: Run `supabase gen types typescript --local > src/integrations/supabase/types.ts`

**Issue: authStore not loading organization**
Fix: Check organization_members table has record for user

**Issue: RLS blocking queries**
Fix: Verify user is in organization_members and RLS policies are correct

**Issue: Supabase functions fail**
Fix: Check environment variables are set in Supabase dashboard

---

## Phase 6: Demo Preparation (Day 7)

### 6.1 Create Sample Data

**File:** `supabase/seed.sql`

```sql
-- Insert demo organization
INSERT INTO organizations (name, slug, email, phone) VALUES
('Demo Church', 'demo-church', 'admin@demochurch.com', '+1-555-0100');

-- Get the organization ID
DO $$
DECLARE
  org_id UUID;
BEGIN
  SELECT id INTO org_id FROM organizations WHERE slug = 'demo-church';

  -- Insert 10 sample people
  INSERT INTO people (organization_id, first_name, last_name, email, phone_number, member_status)
  SELECT
    org_id,
    'Person ' || i,
    'Last' || i,
    'person' || i || '@demochurch.com',
    '+1555000' || LPAD(i::text, 4, '0'),
    'member'
  FROM generate_series(1, 10) i;

  -- Create 3 sample groups
  INSERT INTO groups (organization_id, name, description) VALUES
    (org_id, 'First Timers', 'New visitors to our church'),
    (org_id, 'Youth Ministry', 'Ages 13-18'),
    (org_id, 'Prayer Team', 'Weekly prayer meeting attendees');
END $$;
```

Run in Supabase SQL Editor.

### 6.2 Create Documentation

**File:** `README.md`

```markdown
# ChurchConnect V1

Clean, focused church management platform for member engagement.

## Features

✅ Member Directory with CSV import
✅ Group Management with member assignments
✅ SMS Broadcasting to individuals or groups
✅ AI-Powered Calling via Vapi integration

## Quick Start

1. Clone and install:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Add your Supabase credentials
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

## Tech Stack

- React 18.3 + TypeScript 5.5
- Vite 5.4
- Supabase (PostgreSQL + Edge Functions)
- shadcn/ui + Tailwind CSS
- TanStack Query + Zustand
- Twilio (SMS) + Vapi (AI Calls)

## Database Schema

13 tables across 5 categories:
- Core: organizations, organization_members, people
- Groups: groups, group_members
- Communications: communication_campaigns, campaign_recipients, communication_templates
- Calling: calling_scripts, calling_campaigns, call_attempts, vapi_call_logs
- Tracking: attendance_tracking, follow_up_messages

## Environment Variables

Required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional (for SMS/Calling):
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `VAPI_API_KEY`
- `VAPI_PHONE_NUMBER_ID`
- `VAPI_WEBHOOK_SECRET`

## File Structure

- `src/components/` - React components (UI, auth, features)
- `src/pages/` - Route pages
- `src/stores/` - Zustand state management
- `src/integrations/supabase/` - Supabase client & types
- `supabase/migrations/` - Database schema
- `supabase/functions/` - Edge functions (SMS, Calls, Webhooks)

## Known Limitations (V1)

- No email functionality
- No events management
- No giving/donations
- Settings require Supabase dashboard configuration
```

### 6.3 Demo Script

**Demo Flow:**

1. **Login** (show existing demo account)
2. **Dashboard** (show member count overview)
3. **People:**
   - Add person manually
   - Upload CSV with 5 people
   - Show validation error handling
   - Edit person details
4. **Groups:**
   - Create new group "Welcome Team"
   - Add 3 members
   - Show member count update
5. **SMS:**
   - Compose message: "Hi {Name}, welcome to Demo Church!"
   - Send to "Welcome Team" group
   - Show campaign tracking

---

## Critical Files Reference

### Must Extract Exactly:

1. **`/workspaces/divine-connect-frontend/src/components/people/CSVUpload.tsx`**
   → 427 lines, production CSV parsing with validation

2. **`/workspaces/divine-connect-frontend/src/components/groups/GroupManager.tsx`**
   → 368 lines, complete group CRUD with member management

3. **`/workspaces/divine-connect-frontend/supabase/functions/send-sms/index.ts`**
   → 223 lines, Twilio SMS integration with campaign tracking

4. **`/workspaces/divine-connect-frontend/src/stores/authStore.ts`**
   → 259 lines, Zustand store for auth & organization state

5. **`/workspaces/divine-connect-frontend/supabase/migrations/20240320000000_initial_schema.sql`**
   → 127 lines, organizations table foundation

### Key Migrations to Extract:

- `20240321000002_people_schema.sql` - People table
- `20240321000003_groups_schema.sql` - Groups & group_members
- `20250615120006_communications_hub_schema.sql` - Communications tables
- `20250615120007_calling_system_schema.sql` - Calling system
- `20250624000000_vapi_and_escalations_schema.sql` - VAPI logs

---

## Verification Checklist

### Phase 1: Setup
- [ ] `npm run dev` starts without errors
- [ ] Tailwind CSS works
- [ ] shadcn components render

### Phase 2: Database
- [ ] 13 tables created in Supabase
- [ ] All RLS policies enabled
- [ ] Can insert test organization
- [ ] Can insert test person

### Phase 3: Backend
- [ ] 3 edge functions deployed
- [ ] send-sms function accepts POST request
- [ ] send-group-call function accepts POST request
- [ ] vapi-webhook function accepts webhook

### Phase 4: Frontend
- [ ] Login page renders
- [ ] Dashboard shows after login
- [ ] CSVUpload component works
- [ ] GroupManager component works
- [ ] authStore loads organization

### Phase 5: Integration
- [ ] CSV upload creates people records
- [ ] Groups CRUD works
- [ ] SMS sends via function
- [ ] Campaign tracking creates records

### Phase 6: Demo
- [ ] Sample data loaded
- [ ] README complete
- [ ] All features work in demo flow
- [ ] File count under 50 (excluding node_modules)

---

## Risk Mitigation

### Risk: Missing communication_automation_settings table
**Solution:** Modify send-sms and send-group-call functions to use env vars only (lines 43-49)

### Risk: RLS blocking queries
**Solution:** Ensure user exists in organization_members table with correct organization_id

### Risk: Type errors from generated types
**Solution:** Run `supabase gen types typescript` or use `any` temporarily

### Risk: Scope creep (>50 files)
**Priority order:** Auth → People → Groups → SMS → AI Calls
Drop AI Calls if over limit.

---

## Success Criteria

✅ Repository created at `/workspaces/churchconnect-v1`
✅ Under 50 files total
✅ 5 core features working: Members CRUD, CSV Import, Groups, SMS, AI Calls
✅ Database has 13 tables with proper RLS
✅ 3 Supabase functions deployed and working
✅ Customer can complete full demo workflow
✅ No errors in console
✅ Code extracted as-is from production codebase

**Target Delivery: Day 7** ✓
