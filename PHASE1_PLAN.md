# Phase 1: Unused Code Removal — Plan

## Scan Results

- **38 unused files** in `src/`
- **83 unused exports** across used files
- **0 dynamic imports** found for any flagged file

## Batch 1: Safe Deletes (Confirmed Dead — No References)

### Components (15 files)

| File | Reason |
|------|--------|
| `AdminInviteManager.jsx` | Never imported |
| `CritiqueDisplay.jsx` | Only self-references, no imports |
| `CritiqueModal.jsx` | Never imported |
| `DeleteConfirmModal.jsx` | Never imported |
| `DiffText.jsx` | Never imported |
| `DraftRestorationBanner.jsx` | Never imported |
| `LoadingProgressModal.jsx` | Never imported |
| `LowScoreWarningModal.jsx` | Never imported |
| `MainContent.jsx` | Never imported |
| `ModalWrapper.jsx` | Never imported |
| `OmniWatchdog.jsx` | Never imported |
| `QuestionVariationCarousel.jsx` | Never imported |
| `TagManager.jsx` | Never imported |
| `TutorialCenter.jsx` | Never imported |
| `UnsavedChangesDialog.jsx` | Never imported |
| `layout/AppLayout.jsx` | Never imported |

### Sidebar Components (3 files)

| File | Reason |
|------|--------|
| `sidebar/BatchSizeControl.jsx` | Never imported |
| `sidebar/CustomRules.jsx` | Never imported |
| `sidebar/ProgressStats.jsx` | Never imported |

### Hooks (7 files)

| File | Reason |
|------|--------|
| `hooks/admin/useLazyLoad.js` | Never imported |
| `hooks/generation/utils/questionConverter.js` | Never imported |
| `hooks/useAuthCleanup.js` | Never imported |
| `hooks/useAutoSave.js` | Never imported |
| `hooks/useProgressTracker.js` | Never imported |
| `hooks/useQuestionHandlers.js` | Never imported |
| `hooks/useRealtimeQuestions.js` | Never imported |

### Services (3 files)

| File | Reason |
|------|--------|
| `services/firestore/index.js` | Never imported |
| `services/portkey.js` | Was refactored, no longer imported |
| `services/portkeySecure.js` | Was refactored, no longer imported |

### Utils (7 files)

| File | Reason |
|------|--------|
| `utils/allowedFields.generated.js` | Never imported |
| `utils/bulkDeleteDeleted.js` | Never imported |
| `utils/importScores.js` | Never imported |
| `utils/lazyLoader.js` | Never imported |
| `utils/perfLogger.js` | Never imported |
| `utils/queryRateLimiter.js` | Never imported |

### Types (1 file)

| File | Reason |
|------|--------|
| `types/question.js` | Never imported |

## Batch 2: Keep (Test Utilities)

| File | Reason |
|------|--------|
| `test/testUtils.jsx` | Used by test files |
| `testUtils/authHarness.js` | Used by test files |

## Batch 3: Unused Exports (Phase 1b — after safe deletes)

- 83 unused exports across files that ARE still used
- Lower priority — remove individual functions/constants that are never called
- Will tackle after Batch 1 is verified

## Execution Plan

1. Move all Batch 1 files to `src/_deprecated/` (not delete — safety net)
2. Run `npm run build` to verify no breakage
3. Run `npx vitest run` to verify tests still pass
4. If green: commit and push
5. After 1 week confidence period: delete `src/_deprecated/`
