# Database Migration Guide

## 🚀 Run Migrations in Supabase Dashboard

Since we don't have Supabase CLI in this environment, follow these steps:

### 1. Go to SQL Editor
- Open: https://supabase.com/dashboard/project/hxeqqgwcdnzxpwtsuuvv/sql
- Or: Dashboard → SQL Editor

### 2. Run Each Migration File in Order

**IMPORTANT: Run in this exact order!**

#### Migration 1: Initial Schema
Copy contents of `migrations/20240320000000_initial_schema.sql` and run

#### Migration 2: People Schema
Copy contents of `migrations/20240321000001_people_schema.sql` and run

#### Migration 3: Groups Schema
Copy contents of `migrations/20240321000002_groups_schema.sql` and run

#### Migration 4: Communications Schema
Copy contents of `migrations/20240321000003_communications_schema.sql` and run

#### Migration 5: Calling System Schema
Copy contents of `migrations/20240321000004_calling_system_schema.sql` and run

### 3. Verify Migrations

Run this in SQL Editor:
```sql
-- Should return 13 tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return 13 rows with rowsecurity = true
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public';
```

Expected tables:
1. organizations
2. organization_members
3. people
4. groups
5. group_members
6. communication_campaigns
7. communication_templates
8. campaign_recipients
9. calling_scripts
10. calling_campaigns
11. call_attempts
12. attendance_tracking
13. follow_up_messages
14. campaign_summaries
15. vapi_call_logs
16. escalation_alerts

(Note: Some migrations create multiple tables)

### 4. Test RLS Policies

```sql
-- Test organization access
INSERT INTO organizations (name, slug, email)
VALUES ('Test Church', 'test-church', 'test@church.com');

-- Verify RLS is working
SELECT * FROM organizations;
```

## ✅ Migration Checklist

- [ ] Ran migration 1 (Initial Schema)
- [ ] Ran migration 2 (People Schema)
- [ ] Ran migration 3 (Groups Schema)
- [ ] Ran migration 4 (Communications Schema)
- [ ] Ran migration 5 (Calling System Schema)
- [ ] Verified 13+ tables exist
- [ ] Verified RLS enabled on all tables
- [ ] Test organization insert works

## 🐛 Troubleshooting

**Error: "relation already exists"**
→ Table already created, safe to ignore

**Error: "type already exists"**
→ Enum already created, safe to ignore

**Error: "foreign key constraint"**
→ Check that previous migrations ran successfully

**Error: "function does not exist"**
→ Make sure migration 1 ran (creates update_updated_at_column)
