# KeepFlock IDOR Audit Report
Date: 2026-03-20

---

## CONFIRMED FIXED

### BUG-01: send-sms — Missing auth / org membership check
- **File:** `supabase/functions/send-sms/index.ts`
- **Fix evidence (lines 24–73):** The function now requires a valid `Authorization` header, resolves it to a real user via `supabaseAdmin.auth.getUser(token)`, and then verifies membership in the requested `organizationId` by querying `organization_members` for `(organization_id = organizationId AND user_id = user.id)`. A missing or invalid token returns HTTP 401; a mismatch returns HTTP 403.

### BUG-02: send-group-call — Missing auth / org membership check
- **File:** `supabase/functions/send-group-call/index.ts`
- **Fix evidence (lines 27–93):** Same pattern as send-sms. The function checks for the `Authorization` header (returns 401 if absent), calls `auth.getUser(token)`, and then verifies `organization_members` for `(organization_id = organizationId AND user_id = user.id)` before processing any call logic. The org check gates all downstream data access.

---

## CONFIRMED OPEN

### OPEN-01: send-sms — group query has no organization_id filter (cross-org data leak)
- **File:** `supabase/functions/send-sms/index.ts`, **line 128–144**
- **Vulnerable pattern:**
  ```ts
  const { data: members, error: membersError } = await supabaseAdmin
    .from('group_members')
    .select(`people!inner (id, first_name, last_name, phone_number)`)
    .eq('group_id', recipientId)   // <-- only filters by group_id, NOT organization_id
  ```
  The function confirms the caller belongs to `organizationId`, but when `recipientType === 'group'`, it fetches members of any `group_id` supplied by the caller — including groups belonging to other organizations. A malicious user can pass a `groupId` from a different church and get back all phone numbers of that group's people.
- **Required fix:** Add `.eq('organization_id', organizationId)` to the `group_members` query (or join through `groups` to verify `groups.organization_id = organizationId` before fetching members).

### OPEN-02: send-group-call — group query has no organization_id filter (same cross-org leak)
- **File:** `supabase/functions/send-group-call/index.ts`, **line 208–226**
- **Vulnerable pattern:**
  ```ts
  const { data: members, error: membersError } = await supabaseAdmin
    .from('group_members')
    .select(`people!inner (id, first_name, last_name, phone_number, created_at)`)
    .eq('group_id', groupId)   // <-- only filters by group_id, NOT organization_id
  ```
  Identical issue to OPEN-01. An authenticated user who belongs to org A can supply a `groupId` from org B and initiate AI phone calls to every member of that foreign group at org B's expense.
- **Required fix:** Add `.eq('organization_id', organizationId)` to the `group_members` query, or verify `groups.organization_id = organizationId` before fetching.

### OPEN-03: send-group-call — call_scripts query has no organization_id filter
- **File:** `supabase/functions/send-group-call/index.ts`, **line 180–188**
- **Vulnerable pattern:**
  ```ts
  const { data: script, error: scriptError } = await supabaseAdmin
    .from('call_scripts')
    .select('*')
    .eq('id', scriptId)   // <-- only filters by script UUID, no org check
  ```
  A caller can supply a `scriptId` belonging to another organization. The function will use that foreign script for the call without any ownership verification.
- **Required fix:** Add `.eq('organization_id', organizationId)` to the `call_scripts` query.

### OPEN-04: generate-script — No authentication whatsoever
- **File:** `supabase/functions/generate-script/index.ts`
- **Vulnerable pattern:** The entire function is unauthenticated. It accepts `organization_id` from the request body and immediately uses it without validating the caller's identity or org membership. Any anonymous caller on the internet can:
  1. Generate AI scripts charged to an arbitrary organization (exhausting their 10/day rate limit or consuming API credits).
  2. Read back the generated script content.
- **Required fix:** Add JWT authentication (`auth.getUser`) and verify the caller is a member of `organization_id` before processing.

### OPEN-05: send-invite — No authentication whatsoever
- **File:** `supabase/functions/send-invite/index.ts`
- **Vulnerable pattern:** The function accepts `organizationId` from the request body and proceeds to create invitation records and send invitation emails/SMS without verifying the caller's identity. Any unauthenticated party can invite arbitrary email addresses or phone numbers to any organization.
- **Required fix:** Add JWT authentication and verify the caller is an admin/pastor member of `organizationId` before creating invitations.

### OPEN-06: MemberProfilePanel — member_memories and call_attempts queries filtered only by person_id
- **File:** `src/components/people/MemberProfilePanel.tsx`, **lines 205–218 and 228–242**
- **Vulnerable pattern:**
  ```ts
  supabase.from('member_memories').select('*').eq('person_id', person.id)
  supabase.from('call_attempts').select('*').eq('person_id', person.id)
  ```
  These client-side queries use the authenticated user's Supabase JWT (not service role), so RLS is enforced. The RLS policies on both tables gate access by `organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())`. However, neither client query passes an `organization_id` filter — correctness depends entirely on the RLS policies being accurate and having no gaps. This is low-risk given RLS coverage (see below) but worth noting as defense-in-depth is missing at the application layer.

### OPEN-07: PersonDialog — people delete has no organization_id guard at application layer
- **File:** `src/components/people/PersonDialog.tsx`, **line 304–307**
- **Vulnerable pattern:**
  ```ts
  supabase.from('people').delete().eq('id', person.id)
  ```
  No `.eq('organization_id', currentOrganization.id)` is added. This is guarded by RLS (policy: "Users can delete people in their organization"), but a compromised or XSS-injected client could pass a person.id from another org. Reliance on RLS alone is acceptable but the defense-in-depth layer is absent.

---

## RLS COVERAGE

| Table | RLS Enabled | Policies Present |
|---|---|---|
| organizations | YES | YES |
| organization_members | YES | YES |
| people | YES | YES (SELECT/INSERT/UPDATE/DELETE by org) |
| groups | YES | YES |
| group_members | YES | YES |
| call_attempts | YES | YES (campaign-scoped + org-scoped via migration 20240325000001) |
| calling_campaigns | YES | YES |
| calling_scripts | YES | YES |
| vapi_call_logs | YES | YES |
| escalation_alerts | YES | YES |
| messaging_campaigns | YES | YES (renamed from communication_campaigns; policies recreated in migration 20240324000001) |
| campaign_recipients | YES | YES |
| communication_campaigns | YES | YES (original table, superseded) |
| communication_templates | YES | YES |
| profiles | YES | YES |
| invitations | YES | YES |
| notification_preferences | YES | YES |
| minute_usage | YES | YES |
| audience_segments | YES | YES |
| auto_triggers | YES | YES |
| auto_trigger_executions | YES | YES (service role only) |
| automations | YES | YES |
| automation_executions | YES | YES |
| scheduled_messages | YES | YES |
| member_memories | YES | YES |
| church_memories | YES | YES |
| script_generations | YES | YES (service role insert only) |
| attendance_tracking | YES | YES |
| follow_up_messages | YES | YES |
| campaign_summaries | YES | YES |

- **Total tables with RLS enabled:** 29 (all application tables found in migrations)
- **Tables without RLS:** None found. All tables created in migrations have `ENABLE ROW LEVEL SECURITY` statements.
- **Assessment:** RLS coverage is **adequate** — every data table has RLS enabled with org-scoped policies. The critical gap is that the edge functions using `SUPABASE_SERVICE_ROLE_KEY` bypass RLS entirely, which is why the OPEN vulnerabilities above exist at the function layer even though RLS would protect direct client queries.

---

## VAPI-WEBHOOK FAILS-OPEN

- **Status: OPEN**
- **Evidence (lines 301–310 of `supabase/functions/vapi-webhook/index.ts`):**
  ```ts
  const vapiWebhookSecret = Deno.env.get('VAPI_WEBHOOK_SECRET')
  if (vapiWebhookSecret) {
    const incomingSecret = req.headers.get('x-vapi-secret') || ''
    if (incomingSecret !== vapiWebhookSecret) {
      console.warn('Warning: x-vapi-secret header mismatch — allowing request but logging for review')
    }
  } else {
    console.warn('VAPI_WEBHOOK_SECRET not configured — accepting webhook without secret validation')
  }
  ```
  The secret mismatch check only logs a warning — it does **not** return a 401/403 and does **not** abort processing. Execution continues unconditionally after the if-block. This means:
  1. If `VAPI_WEBHOOK_SECRET` is not configured, all requests are accepted with no validation.
  2. If `VAPI_WEBHOOK_SECRET` is configured, a request with a wrong or missing secret is still accepted (just logged).
  An attacker can POST a crafted webhook payload to trigger minute-usage credits, insert fake call transcripts, create escalation alerts, or store malicious member memories for any organization by supplying a known or guessable `organization_id` in the payload metadata.

---

## VERDICT

| ID | Description | Status |
|---|---|---|
| BUG-01 | IDOR in send-sms (no auth check) | **FIXED** — JWT auth + org membership check added |
| BUG-02 | IDOR in send-group-call (no auth check) | **FIXED** — JWT auth + org membership check added |
| BUG-02b | IDOR in send-group-call: group members not org-filtered | **OPEN** — OPEN-02 above |
| BUG-01b | IDOR in send-sms: group members not org-filtered | **OPEN** — OPEN-01 above |
| BUG-03 | Billing sync | Not audited here — separate task |
| BUG-04 | Ghost feature | Not audited here — separate task |
| VAPI-WEBHOOK fails-open | Secret mismatch does not block requests | **OPEN** |
| generate-script unauthenticated | No JWT or org check | **OPEN** (new finding) |
| send-invite unauthenticated | No JWT or org check | **OPEN** (new finding) |
| call_scripts not org-filtered in send-group-call | IDOR on scriptId | **OPEN** (new finding) |
