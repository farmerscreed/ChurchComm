# Bug Fixes Complete

- BUG-03 STATUS: FIXED — `stripe-webhook` `customer.subscription.updated` handler now reads the `tier` from subscription metadata and updates `organizations.minutes_included` using the `TIER_MINUTES` map, so paying users are immediately throttled at their correct plan ceiling after any plan change.

- BUG-04 STATUS: FIXED — `EventTriggers` component (`/automations/triggers`) hidden in three places: route wrapped in `{false && ...}` in `src/App.tsx`, nav item commented out in `src/components/layout/Sidebar.tsx`, and feature card filtered from the overview grid in `src/pages/automations/AutomationsOverview.tsx`. Code preserved for re-enable when the `group_join` backend processor is built.

- WEEK 1 STATUS: COMPLETE — all 4 PRD bugs resolved, 6 security vulnerabilities patched, codebase committed and ready for Phase 0 Week 2 (GUARDIAN build)
