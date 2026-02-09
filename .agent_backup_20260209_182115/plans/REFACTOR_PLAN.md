# Refactor Plan: Simplify Question State Management

**Goal**: Unify question data views to ensure consistent dashboard metrics and simplify state management in `useQuestionManager.js`.
**Target File**: `src/hooks/useQuestionManager.js`
**Objective**: Fix inconsistent "Approved/Pending" counts between the Sidebar (Stats) and the Question List.

## Problem Analysis

Currently, `useQuestionManager.js` maintains three separate state arrays:

1. `questions` (Current Session)
2. `historicalQuestions` (Local History)
3. `databaseQuestions` (Loaded from Firestore)

These are merged into `allQuestionsMap` for "Global Quota" checks (`approvedCounts`), BUT the individual counters exposed to the UI (`approvedCount`, `pendingCount`, `rejectedCount`) are derived from `allItems`, which **only includes** `questions` and `historicalQuestions`.

**Result**:

* **Sidebar Progress**: Reflects `questions + historical + database` (via `approvedCounts`).
* **Sidebar Labels / List View**: Reflects `questions + historical` (via `approvedCount` / `questions` array).
* **Disconnect**: The user sees a progress bar showing "50 Generated", but the list only shows "20" (Session), leading to confusion about "missing" questions.

## Proposed Solution: Unified Data View

We will refactor `useQuestionManager.js` to expose a single, unified source of truth: `unifiedQuestions`.

### 1. Create `unifiedQuestions` Memo

Flatten `allQuestionsMap` into a single, sorted array that contains **all known questions** (Session + History + Loaded Database).

```javascript
// Flatten and sort all questions
const unifiedQuestions = useMemo(() => {
  const all = [];
  allQuestionsMap.forEach((variants) => {
    // Use the first variant or English version as the canonical entry
    // (Or include all variants if the list supports it. For now, canonical is safer)
    const canonical = variants.find(v => (v.language || 'English') === 'English') || variants[0];
    if (canonical) all.push(canonical);
  });
  
  // Sort by date (newest first)
  return all.sort((a, b) => 
    new Date(b.created || b.dateAdded || 0) - new Date(a.created || a.dateAdded || 0)
  );
}, [allQuestionsMap]);
```

### 2. Update Metrics to use `unifiedQuestions`

Update `approvedCount`, `rejectedCount`, and `pendingCount` to derive their values from `unifiedQuestions` (or `allQuestionsMap` directly) instead of `allItems`.

```javascript
const approvedCount = useMemo(
  () => unifiedQuestions.filter((q) => q.status === "accepted").length,
  [unifiedQuestions]
);
// ... same for others
```

### 3. Expose `unifiedQuestions`

Return `unifiedQuestions` from the hook so UI components (`QuestionList`, `Sidebar`) can use it if they want to show "All Questions".

## Implementation Steps

1. **Modify `useQuestionManager.js`**:
    * Implement `unifiedQuestions` useMemo.
    * Refactor count memos to use `unifiedQuestions`.
    * Expose `unifiedQuestions` in the return object.
2. **Verify Sidebar**:
    * Ensure `Sidebar.jsx` (via `App.jsx`) uses the correct props. (Currently it uses `approvedCounts` which is already correct-ish, but now `approvedCount` (total) will match).
3. **Clean Up**:
    * Remove `allItems` if it's no longer used, or keep it strictly for "Local Session" logic if needed.

## Risk Assessment

* **Low Risk**: This is primarily a "View" change. Data persistence logic (`saveQuestionToFirestore`) is dependent on the individual `questions` arrays, which we are **not** changing.
* **Benefit**: Immediate consistency between "Progress Bars" and "Count Labels".

## Future Work (Out of Scope)

* **Global Metadata Sync**: To track "Total Questions in DB" (including those not loaded), we would need a separate Firestore query (`count()` aggregation) or a metadata document. This is not part of this refactor but is noted.
