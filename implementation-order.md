# 📋 Implementation Order — ChurchComm V2

This is the master checklist of all tasks in execution order. Check off tasks as they're completed.

---

## Legend
- `[ ]` Not started
- `[/]` In progress
- `[x]` Complete

---

## Epic 1: Database & Data Model ✅ COMPLETE

- [x] 1.1 - Rename communication_campaigns → messaging_campaigns
- [x] 1.2 - Consolidate script tables
- [x] 1.3 - Add RBAC role: pastor
- [x] 1.4 - Add do_not_call flag to people
- [x] 1.5 - Add phone number fields to organizations
- [x] 1.6 - Add notification_preferences table
- [x] 1.7 - Add calling window configuration
- [x] 1.8 - Add minute_usage tracking
- [x] 1.9 - Add audience_segments table
- [x] 1.10 - Add auto_triggers table

---

## Epic 2: Automated Calling & Workflows

| Task | Description | Workflow | Status |
|------|-------------|----------|--------|
| 2.1a | auto-call-trigger scaffold + calling window | `/task-2.1a` | [x] |
| 2.1b | first_timer trigger logic | `/task-2.1b` | [x] |
| 2.1c | birthday + anniversary triggers | `/task-2.1c` | [x] |
| 2.1d | VAPI call execution | `/task-2.1d` | [x] |
| 2.2a | send-escalation-notification function | `/task-2.2a` | [x] |
| 2.2b | database trigger for escalation | `/task-2.2b` | [x] |
| 2.3 | minute usage tracking + overage prevention | `/task-2.3` | [x] |
| 2.4 | send-call-summary function | `/task-2.4` | [x] |

---

## Epic 3: Script Management & AI Builder

| Task | Description | Workflow | Status |
|------|-------------|----------|--------|
| 3.1a | template fields + gallery UI | `/task-3.1a` | [x] |
| 3.1b | integrate gallery into Settings | `/task-3.1b` | [x] |
| 3.2 | AI Script Builder with Claude | `/task-3.2` | [x] |
| 3.3 | variable substitution engine | `/task-3.3` | [x] |
| 3.4 | voice selection | `/task-3.4` | [x] |

---

## Epic 4: Multi-Tenancy, Onboarding & Billing

| Task | Description | Workflow | Status |
|------|-------------|----------|--------|
| 4.1a | onboarding wizard UI | `/task-4.1a` | [x] |
| 4.1b | wire onboarding to database | `/task-4.1b` | [x] |
| 4.2a | Stripe checkout/portal functions | `/task-4.2a` | [x] |
| 4.2b | Stripe webhook handler | `/task-4.2b` | [x] |
| 4.2c | subscription fields migration | `/task-4.2c` | [x] |
| 4.2d | PricingPage + Billing UI | `/task-4.2d` | [x] |
| 4.2e | read-only mode for lapsed subscriptions | `/task-4.2e` | [x] |
| 4.3 | phone number allocation | `/task-4.3` | [x] |
| 4.4 | invitation system updates | `/task-4.4` | [x] |

---

## Epic 5: Enhanced UI/UX

| Task | Description | Workflow | Status |
|------|-------------|----------|--------|
| 5.1a | Dashboard widget grid (minutes, campaigns, recent calls) | `/task-5.1a` | [x] |
| 5.1b | Dashboard widgets (escalation, success, upcoming) | `/task-5.1b` | [x] |
| 5.2a | Campaign Builder - type + script steps | `/task-5.2a` | [x] |
| 5.2b | Campaign Builder - audience + scheduling | `/task-5.2b` | [x] |
| 5.2c | Campaign Builder - review + launch | `/task-5.2c` | [x] |
| 5.3a | Settings: Calling Configuration tab | `/task-5.3a` | [x] |
| 5.3b | Settings: Notifications tab | `/task-5.3b` | [x] |
| 5.3c | Settings: Team tab + Voice section | `/task-5.3c` | [x] |
| 5.4 | SMS campaign support via Campaign Builder | `/task-5.4` | [x] |

---

## Epic 6: AI & Memory Enhancements

| Task | Description | Workflow | Status |
|------|-------------|----------|--------|
| 6.1 | member_memories table + matching function | `/task-6.1` | [x] |
| 6.2 | vapi-webhook memory creation | `/task-6.2` | [x] |
| 6.3a | church context admin UI | `/task-6.3a` | [x] |
| 6.3b | context injection into VAPI calls | `/task-6.3b` | [x] |

---

## Epic 7: Demo Mode & Guided Tour

| Task | Description | Workflow | Status |
|------|-------------|----------|--------|
| 7.1a | seed-demo-data function | `/task-7.1a` | [x] |
| 7.1b | is_demo flag + auto-clear behavior | `/task-7.1b` | [x] |
| 7.2 | guided tour implementation | `/task-7.2` | [x] |

---

## Summary

| Epic | Total Tasks | Completed | Remaining |
|------|-------------|-----------|-----------|
| Epic 1 | 10 | 10 | 0 |
| Epic 2 | 8 | 8 | 0 |
| Epic 3 | 5 | 5 | 0 |
| Epic 4 | 9 | 9 | 0 |
| Epic 5 | 9 | 9 | 0 |
| Epic 6 | 4 | 4 | 0 |
| Epic 7 | 3 | 3 | 0 |
| **TOTAL** | **48** | **48** | **0** |


---

## Recommended Session Groupings

For optimal context usage, group related tasks in single sessions:

### Session Plan
1. **Session 1:** Task 2.1a + 2.1b (auto-call-trigger foundation)
2. **Session 2:** Task 2.1c + 2.1d (triggers + VAPI execution)
3. **Session 3:** Task 2.2a + 2.2b (escalation notifications)
4. **Session 4:** Task 2.3 + 2.4 (usage tracking + summaries)
5. **Session 5:** Task 3.1a + 3.1b (script templates)
6. **Session 6:** Task 3.2 (AI Script Builder)
7. **Session 7:** Task 3.3 + 3.4 (variables + voice)
8. **Session 8:** Task 4.1a + 4.1b (onboarding)
9. **Session 9:** Task 4.2a + 4.2b (Stripe integration)
10. **Session 10:** Task 4.2c + 4.2d (subscription + pricing)
11. **Session 11:** Task 4.2e + 4.3 + 4.4 (read-only + phone + invites)
12. **Session 12:** Task 5.1a + 5.1b (Dashboard redesign)
13. **Session 13:** Task 5.2a + 5.2b (Campaign Builder pt 1)
14. **Session 14:** Task 5.2c (Campaign Builder pt 2)
15. **Session 15:** Task 5.3a + 5.3b + 5.3c (Settings enhancements)
16. **Session 16:** Task 5.4 (SMS campaigns)
17. **Session 17:** Task 6.1 + 6.2 (member memories)
18. **Session 18:** Task 6.3a + 6.3b (context injection)
19. **Session 19:** Task 7.1a + 7.1b (demo data)
20. **Session 20:** Task 7.2 (guided tour)

**Estimated total sessions: ~20**

---

**Last Updated:** 2026-01-24
