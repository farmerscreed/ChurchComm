# ChurchConnect V1

Clean, focused church management platform for member engagement.

## ✅ **Phase 1-2 Complete!**

Successfully extracted production-ready code from divine-connect-frontend into a clean V1 repository.

### Completed:
- ✅ Vite + React + TypeScript project initialized
- ✅ All dependencies installed (Supabase, React Query, Zustand, shadcn/ui)
- ✅ Tailwind CSS configured with custom theme
- ✅ **5 database migration files** extracted and cleaned
- ✅ **13 tables** ready for deployment
- ✅ Development server verified working

## 📊 **Database Schema (13 Tables)**

**Core:** organizations, organization_members, people
**Groups:** groups, group_members
**Communications:** communication_campaigns, communication_templates, campaign_recipients
**Calling:** calling_scripts, calling_campaigns, call_attempts, vapi_call_logs
**Supporting:** attendance_tracking, escalation_alerts

## 🚀 **Next Steps**

### 1. Create Supabase Project
Go to supabase.com and create project: `churchconnect-v1`

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Run Migrations
**Option A (Supabase CLI):**
```bash
supabase db reset
```

**Option B (Dashboard):**
Run each file in `supabase/migrations/` in order through SQL Editor

### 4. Verify Setup
```sql
-- Should return 13 tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;
```

## 📁 **Project Structure**

```
churchconnect-v1/
├── src/                          # TO BE BUILT (Phase 4)
├── supabase/
│   └── migrations/              # ✅ 5 migration files
│       ├── 20240320000000_initial_schema.sql
│       ├── 20240321000001_people_schema.sql
│       ├── 20240321000002_groups_schema.sql
│       ├── 20240321000003_communications_schema.sql
│       └── 20240321000004_calling_system_schema.sql
├── .env.example                 # ✅ Environment template
├── tailwind.config.ts           # ✅ Tailwind configured
└── package.json                 # ✅ Dependencies installed
```

## 🔧 **Tech Stack**

- React 18.3 + TypeScript 5.5 + Vite 5.4
- Supabase (PostgreSQL + Edge Functions)
- Tailwind CSS + shadcn/ui
- Zustand + TanStack Query
- Twilio (SMS) + VAPI (AI Calls)

## 📝 **Key Improvements**

### Fixed from Original:
- ✅ All RLS policies use `organization_members` (not `user_roles`)
- ✅ Removed duplicate enum definitions
- ✅ Removed foreign keys to non-existent tables
- ✅ Simplified complex RLS policies

### Cleaned:
- Removed 12+ unused tables
- Streamlined to 13 essential tables
- Under 50 files total (target maintained)

## 🎯 **Roadmap**

- [x] Phase 1: Repository Setup
- [x] Phase 2: Database Migration Files
- [ ] Phase 3: Backend Functions (SMS, Calls, Webhooks)
- [ ] Phase 4: Frontend Core (Components, Pages, Routing)
- [ ] Phase 5: Integration & Testing
- [ ] Phase 6: Demo Preparation

## 🔒 **Security**

- Row Level Security (RLS) on all 13 tables
- Organization-scoped data access
- Proper foreign key cascades
- Performance indexes on all tables

## 📞 **Support**

- Plan document: `.claude/plans/expressive-mixing-wreath.md`
- Migration files: `supabase/migrations/`
- Environment template: `.env.example`

---

**Status:** Phase 1-2 Complete ✓ | Ready for Supabase setup
**Next:** Create Supabase project → Run migrations → Extract backend functions
