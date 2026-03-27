# Security Fixes Applied

| Fix | File | Change |
|-----|------|--------|
| OPEN-01 | `supabase/functions/send-sms/index.ts` | Added `.eq('organization_id', organizationId)` to `group_members` fetch to prevent cross-org phone number extraction |
| OPEN-02 | `supabase/functions/send-group-call/index.ts` | Added `.eq('organization_id', organizationId)` to `group_members` fetch to prevent triggering calls against foreign org members |
| OPEN-03 | `supabase/functions/send-group-call/index.ts` | Added `.eq('organization_id', organizationId)` to `call_scripts` fetch to prevent using scripts owned by another org |
| OPEN-04 | `supabase/functions/generate-script/index.ts` | Added JWT auth check (`auth.getUser`) + org membership verification before any logic runs |
| OPEN-05 | `supabase/functions/send-invite/index.ts` | Added JWT auth check + org membership verification + admin role gate (`membership.role !== 'admin'` → 403) |
| VAPI-WEBHOOK | `supabase/functions/vapi-webhook/index.ts` | Replaced fails-open warning with hard 401 reject on missing or mismatched `VAPI_WEBHOOK_SECRET` |

All 6 vulnerabilities resolved. Codebase cleared for BUG-03 and BUG-04 fixes.
