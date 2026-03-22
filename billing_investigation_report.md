# Billing & Minutes System Investigation Report

## 🚨 Critical Findings

### 1. **Major Synchronization Bug (Blocker Risk)**
There is a critical disconnect between the **Billing UI** and the **Call Blocking Logic**.
- **Billing Settings UI** reads from the `organizations` table (Correctly shows upgraded limits).
- **Call Blocking Logic** (`send-group-call`, `auto-call-trigger`) reads from the `minute_usage` table (Often has stale limits).

**Scenario:** A user hits their 60-minute limit. They upgrade to the Growth plan (500 mins).
- ✅ **UI:** Shows "60 / 500 minutes used".
- ❌ **Backend:** `send-group-call` checks `minute_usage`, which still says `minutes_included: 60`. **The user is still blocked despite paying.**

### 2. **Duplicate Data Sources**
Minutes are tracked in two places with independent update logic:
- `organizations` table: Updated by `vapi-webhook` and `stripe-webhook`. **(Source of Truth for Billing)**
- `minute_usage` table: Updated by `vapi-webhook` only. **(Used for Analytics & Enforcement)**

### 3. **Missing "Reset" Logic**
When `stripe-webhook` processes a successful payment (`invoice.payment_succeeded`), it resets `organizations.minutes_used` to 0. **It does NOT reset or create a new `minute_usage` record.**
- This means `minute_usage` might keep accumulating or fail to roll over correctly depending on how `vapi-webhook` handles the new billing period date.

---

## 🛠 Actionable Recommendations

### Phase 1: Fix the Blocker (High Priority)
1.  **Update Blocking Logic:** Modify `send-group-call` and `auto-call-trigger` to fetch `minutes_included` from the `organizations` table (the source of truth), NOT `minute_usage`.
    - *Keep fetching `minutes_used` from `minute_usage` if we want per-period tracking, OR validly use `organizations.minutes_used` if we trust the reset logic.*
    - **Best Fix:** Trust `organizations` table for **Current Status** (Limit & Used). Use `minute_usage` **only** for historical analytics.

### Phase 2: Unify Minute Tracking
1.  **Refactor `vapi-webhook`:**
    - Ensure it updates `minute_usage` with the *current* `minutes_included` from the `organizations` table, not a default or stale value.
2.  **Refactor `stripe-webhook`:**
    - When a plan changes, update the current billing period's `minute_usage` record to reflect the new `minutes_included`.

### Phase 3: UI Improvements
1.  **Billing Settings:** The current UI is actually correct (reading from `organizations`), but ensures the backend logic matches this reality.

---

## Technical Details for Implementation

**1. `middleware/check-minutes.ts` (New Recommended Shared Helper)**
Instead of repeating logic in `send-group-call` and `auto-call-trigger`, create a shared helper:
```typescript
export async function checkMinuteLimits(supabase, orgId) {
  const { data: org } = await supabase
    .from('organizations')
    .select('minutes_used, minutes_included, subscription_status')
    .eq('id', orgId)
    .single();
    
  // Allow if unlimited or within limits
  // ...
}
```

**2. Database Impact**
- No schema changes required immediately.
- Data clean-up might be needed for `minute_usage` rows with incorrect `minutes_included`.
