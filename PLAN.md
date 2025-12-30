# Implementation Plan: Question Count Discrepancy & Deployment

## 1. Objective

Finalize the fix for the 368/247 question count discrepancy and deploy the updated application to GitHub Pages.

## 2. Technical Analysis

- **Root Cause**: 121 questions in the "Look Dev" discipline possessed non-standard status strings (likely "deleted" or "Success/Error" from legacy imports/logs).
- **Solution Strategy**:
  - Expose the "Other" status category in the UI to resolve the "All" total discrepancy.
  - Implement diagnostic logging to identify exact status values in the console.
  - Deploy to GitHub Pages (`npm run deploy`).

## 3. Tasks

### Phase A: Core Implementation (ALREADY COMPLETED)

- [x] Update `src/utils/questionFilters.js` to support `filterMode: 'other'`.
- [x] Update `src/hooks/useFiltering.js` to calculate `other` counts and add diagnostics.
- [x] Update `src/components/FilterButton.jsx` with 'Other' styling (Indigo, help-circle icon).
- [x] Update `src/components/ContextToolbar.jsx` to render the 'Other' pill.
- [x] Update `src/hooks/useQuestionManager.js` to track `otherCount`.

### Phase B: Verification & Review (MANDATORY)

- [ ] **Security Review**: Verify that the new 'other' filter doesn't expose sensitive or private data inadvertently.
- [ ] **Quality Review**: Check that the 'All' pill still accurately represents the total unique question count.
- [ ] **Accessibility Review**: Ensure the new 'Other' pill has correct ARIA labels or focus management.

### Phase C: Deployment

- [ ] Execute `npm run build` to verify the production bundle.
- [ ] Execute `npm run deploy` to push to GitHub Pages.

## 4. Risk Assessment

- **Quota Impact**: Questions with "Other" status are currently counted towards generation quotas in `quotaEnforcement.js`. This is preserved as it prevents over-generation when "Ghost" questions exist.
- **Deduplication**: The "All" count continues to use the deduplicated `unifiedQuestions` list, ensuring exactly one card per `uniqueId`.

## 5. Next Steps for Next Session

- Document findings in `NEXT_SESSION.md`.
- Monitor error logs after deployment.
