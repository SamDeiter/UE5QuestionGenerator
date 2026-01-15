# Implementation Plan: "Other" Status Triage and Loading Speed Optimization

## Objective

1. Identify the origin of 121 "Other" status questions (e.g., "deleted", "Success", "Error") and implement measures to triage and prevent them.
2. Improve site loading speed by optimizing data fetching and enabling local persistence.

## Proposed Changes

### 1. Investigation of Import Logic

- **File**: `src/services/googleSheets.js`
- **Action**: Analyze how status is mapped during import. Look for potential column mismatch or script artifacts.
- **File**: `Code.gs` (Google Apps Script)
- **Action**: Check if any automation in the sheet itself is writing "Success" or "Error" into the status column.

### 2. Enhancing Diagnostic Logs

- **File**: `src/hooks/useFiltering.js`
- **Action**: Ensure that non-standard statuses are logged with their `uniqueId` to facilitate manual triage.

### 3. Cleanup Script

- **File**: `scripts/cleanup_other_statuses.py` (New)
- **Action**: A Python script using Firebase Admin SDK (if available) or service account to list and potentially bulk-delete these records if they are confirmed as orphans.

### 4. Import Hardening

- **File**: `src/utils/questionHelpers.js`
- **Action**: Add a strict status validation/normalization step during parsing.

### 5. Site Loading Speed Optimization

- **File**: `src/services/firebaseSave.js` or `src/services/firebaseAuth.js`
- **Action**: Enable Firestore IndexedDB persistence to cache data locally.
- **File**: `src/App.jsx`
- **Action**: Modify the auto-load logic to fetch questions incrementally or defer the full fetch if not in Database/Analytics mode.
- **File**: `src/services/firebaseQueries.js`
- **Action**: Implement paginated fetching (`getQuestionsPaginated`) for the initial load.
- **File**: `src/hooks/useFiltering.js`
- **Action**: Further optimize `useMemo` hooks to avoid expensive recalculations of the entire dataset when only config changes.

## Risk Assessment

- **Risk**: Accidentally deleting valid questions that were incorrectly tagged.
- **Mitigation**: Always perform a 'dry run' list first and present the findings to the user before deletion.
- **Risk**: Breaking existing imports if status mapping is fragile.
- **Mitigation**: Ensure normalization handles "Success" by mapping it to "accepted" (if that's what it means) or "pending".
- **Risk**: Pagination might cause temporary data inconsistency (e.g., total counts not matching visible items).
- **Mitigation**: Ensure summary counts (metadata) are fetched separately or derived from the full local cache if persistence is enabled.

## Verification Plan

- **Performance**: Run Lighthouse before and after the fix.
- **Automated**: Run unit tests on `questionHelpers.js`.
- **Manual**: Use the "Other" filter in the app (if running) or via the cleanup script to verify the counts.
