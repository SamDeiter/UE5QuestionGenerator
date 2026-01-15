# Task List: Post-Fix Triage and Audit of "Other" Statuses

## Phase 1: Investigation & Analysis 🔍

- [ ] Review `src/services/googleSheets.js` for status import logic.
- [ ] Review `src/utils/questionHelpers.js` for data normalization/parsing.
- [ ] Check `src/hooks/useFiltering.js` to see where diagnostic logs are being output.
- [ ] Identify the source of "Success", "Error", and "deleted" statuses.

## Phase 2: Implementation of Cleanup/Audit Tools 🛠️

- [ ] Create a script (or update one) to bulk-identify and list "Other" status questions in the database.
- [ ] Propose a plan for bulk-deletion or correction of these orphans.

## Phase 3: Prevention & Hardening 🛡️

- [ ] Update import logic to reject or warn on non-standard statuses.
- [ ] Update deduplication logic if necessary.

- [x] Phase 4: Site Loading Speed Optimization ⚡
- [x] Enable Firestore IndexedDB persistence for instant local caching.
- [x] Implement paginated/lazy fetching for the initial questions load.
- [x] Refactor `App.jsx` to defer non-critical data fetching until needed (Background fetch).
- [ ] Optimize `useFiltering` and derived data hooks for large datasets.
- [ ] Audit bundle size and lazy loading of remaining heavy components.

## Phase 5: Final Verification ✅

- [ ] Run Lighthouse audit to verify performance improvements.
- [ ] Run deduplication check.
- [ ] Verify filtered counts match expectations.
- [ ] Update `NEXT_SESSION.md` for the next handover.
