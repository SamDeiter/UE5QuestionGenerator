# Task List: Post-Fix Triage and Audit of "Other" Statuses

## Phase 1: Investigation & Analysis 🔍

- [x] Review `src/services/googleSheets.js` for status import logic.
- [x] Review `src/utils/questionHelpers.js` for data normalization/parsing.
- [x] Check `src/hooks/useFiltering.js` to see where diagnostic logs are being output.
- [x] Identify the source of "Success", "Error", and "deleted" statuses.

## Phase 2: Implementation of Cleanup/Audit Tools 🛠️

- [x] Create a script (or update one) to bulk-identify and list "Other" status questions in the database.
- [x] Propose a plan for bulk-deletion or correction of these orphans.
- [x] Add in-app Repair Status tool to Admin panel.

## Phase 3: Prevention & Hardening 🛡️

- [x] Update import logic to reject or warn on non-standard statuses (normalizeStatus).
- [ ] Update deduplication logic if necessary.

## Phase 4: Site Loading Speed Optimization ⚡

- [x] Enable Firestore IndexedDB persistence for instant local caching.
- [x] Implement paginated/lazy fetching for the initial questions load.
- [x] Refactor `App.jsx` to load all questions in single request (fixed batch loading bug).
- [ ] Optimize `useFiltering` and derived data hooks for large datasets.
- [ ] Audit bundle size and lazy loading of remaining heavy components.

## Phase 5: Analytics Hardening 📊

- [x] Cap review durations at 1 hour maximum.
- [x] Detect and convert millisecond durations to seconds.
- [x] Normalize duplicated reviewer names (e.g., "Sam DeiterSam Deiter" → "Sam Deiter").

## Phase 6: Final Verification ✅

- [ ] **RUN REPAIR TOOL** - Go to Admin → Data Maintenance → "Repair Statuses & Timestamps" to fix Other statuses.
- [ ] Run Lighthouse audit to verify performance improvements.
- [ ] Run deduplication check.
- [ ] Verify filtered counts match expectations (no more "Other" category).
- [ ] Update `NEXT_SESSION.md` for the next handover.
