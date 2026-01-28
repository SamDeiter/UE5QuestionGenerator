# 🔧 Unified Maintainability & Complexity Reduction Plan

**Document Version:** 1.1  
**Created:** 2026-01-28  
**Last Updated:** 2026-01-28  
**Status:** IN PROGRESS  

> **Philosophy:** Reduce cognitive complexity, not just lines of code. Stability over elegance. Every change must be provably behavior-preserving.

---

## 📊 Executive Summary

This plan consolidates two audit objectives into a single staged implementation:

1. **Maintainability Audit** – Readability, consistency, new-developer onboarding
2. **Complexity Reduction** – Safe refactoring of hotspots with behavior preservation

### Key Stats

| Metric | Current | Target |
|--------|---------|--------|
| ESLint Warnings | 858 | <100 |
| Functions >100 lines | 15+ | 0 |
| God Components (>500 lines) | 4 | 0 |
| Catch blocks with `(e)` only | 19+ | 0 (all with context) |
| Duplicate modals | 0 | ✅ (NOT duplicates - different purposes) |

---

## 🔥 Part 1: Complexity Hotspot Analysis (Ranked)

### 🚨 CRITICAL (High Risk, High Churn)

| Rank | File | Lines | Complexity Type(s) | Why Hard to Reason About |
|------|------|-------|-------------------|--------------------------|
| 1 | `App.jsx` | ~~986~~ **831** ✅ | **State, Control Flow, Temporal** | Reduced via hook extraction: useAgentLifecycle, useTokenUsage, useAutoLoad, useAuthRefresh |
| 2 | `useFiltering.js` | 558 | **State, Data Shape** | 14 state variables, 6 useEffect hooks with complex dependencies, hash-based stability detection |
| 3 | `QuestionItem.jsx` | ~~747~~ **566** ✅ | **Control Flow, Data Shape** | 20+ props, conditional rendering for 6 modes, inline handlers, lock logic nested |
| 4 | `firebaseQueries.js` | 718 | **Control Flow, Temporal** | 17 exported functions, mixed caching strategies, pagination + real-time overlap |
| 5 | `firebaseSave.js` | 687 | **Temporal, State** | Offline queue with localStorage persistence, retry logic, connection listeners |

### ⚠️ HIGH (Medium Risk)

| Rank | File | Lines | Complexity Type(s) | Why Hard to Reason About |
|------|------|-------|-------------------|--------------------------|
| 6 | `normalizeQuestion.js` | 488 | **Data Shape, Duplication** | Format conversion + normalization + parsing conflated |
| 7 | `useQuestionGenerator.js` | 582 | **Temporal, Control Flow** | Multi-step async generation with auto-critique, quota enforcement |
| 8 | `ContextToolbar.jsx` | 561 | **Control Flow, Duplication** | Mode-specific branching for 6 app modes |
| 9 | `useAuth.js` | 328 | **Temporal, State** | Auth lifecycle, registration, compliance modals |
| 10 | `InviteSignUp.jsx` | 353 | **State, Control Flow** | 10 state variables, auth flow branching |

### 📋 MEDIUM (Lower Risk, Good ROI)

| Rank | File | Lines | Complexity Type(s) | Why Hard to Reason About |
|------|------|-------|-------------------|--------------------------|
| 11 | `useExport.js` | 400+ | **Temporal, Error Handling** | 4 catch blocks with minimal context |
| ~~12~~ | ~~`DeleteConfirmModal.jsx` + `DeleteConfirmationModal.jsx`~~ | N/A | **NOT DUPLICATES** | *Investigated and found different purposes: one requires typing "DELETE", other captures deletion reason* |
| 13 | Error handling across services | N/A | **Error Handling** | 19+ `} catch (e) {` blocks with inconsistent handling |

---

## 🎯 Part 2: Staged Refactor Plan

Each stage is **independently shippable** and must pass all existing tests.

---

### Stage 0 – No-Risk (Tooling & Rename)

**Goal:** Add guardrails, zero behavior change  
**Time Estimate:** 2-3 hours  
**Test Requirement:** Existing 891 tests pass

#### 0.1 Add Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true
}
```

**Files to modify:**

- Create `.prettierrc`
- Update `package.json` scripts:

  ```json
  "format": "prettier --write \"src/**/*.{js,jsx,json,css}\"",
  "format:check": "prettier --check \"src/**/*.{js,jsx,json,css}\""
  ```

- Update `.lintstagedrc` (if exists) or `lint-staged` in package.json

**Behavior Preserved:** ✅ Formatting only, AST unchanged

---

#### 0.2 Add Lint Gate to CI

**Files to modify:**

- `.github/workflows/deploy.yml`

**Change:**

```yaml
- name: Lint check
  run: npm run lint
```

**Behavior Preserved:** ✅ CI gate only, no runtime changes

---

#### 0.3 Consolidate Delete Confirmation Modals

**Analysis:**

- `DeleteConfirmModal.jsx` vs `DeleteConfirmationModal.jsx`
- Identify the more complete implementation
- Update all imports to use single component
- Delete duplicate

**Safety:**

- Grep for all imports before deletion
- Visual regression test (screenshot comparison)

**Behavior Preserved:** ✅ Same UI, same callback signatures

---

#### 0.4 Move Migration Scripts Out of Utils

**Actions:**

- Move `src/utils/migrate*.js` → `scripts/migrations/`
- These are one-time scripts, not runtime utilities

**Behavior Preserved:** ✅ Runtime code unchanged

---

### Stage 1 – Structural Clarity (Extract Helpers)

**Goal:** Reduce function sizes, extract pure helpers  
**Time Estimate:** 4-6 hours  
**Test Requirement:** Add characterization tests for modified functions

---

#### 1.1 Create Document Parser for Questions ✅ COMPLETE

**Problem:** `normalizeQuestion.js` conflates parsing, validation, and normalization.

**Refactor:**

```
src/data/
└── parsers/
    └── parseQuestion.js     # Raw Firestore doc → typed object (NEW)
src/utils/
    └── normalizeQuestion.js # Fills defaults, format conversion (EXISTING)
```

**Before (in normalizeQuestion.js):**

```javascript
// Lines 63-399: Massive function doing parsing AND normalization
normalizeQuestion(q, contextDefaults = {}) {
  // Implicit parsing of Firestore format
  // Format conversion  
  // Default filling
  // Field validation
}
```

**After:**

```javascript
// parseQuestion.js (NEW)
export function parseQuestion(firestoreDoc) {
  // Explicit parsing of Firestore format
  // Returns typed object with explicit undefined vs missing
}

// normalizeQuestion.js (SIMPLIFIED)
import { parseQuestion } from '../data/parsers/parseQuestion';
export function normalizeQuestion(parsed, contextDefaults = {}) {
  // Only fills defaults, assumes parsed input
}
```

**Invariant:** `normalizeQuestion(parseQuestion(doc))` === current `normalizeQuestion(doc)` for all test cases

**Test:** Add snapshot tests for 10 representative Firestore documents

---

#### 1.2 Extract `useFiltering` Sub-Hooks ✅ COMPLETE

**Problem:** 558 lines, 14 state variables, 6 useEffect hooks

**Refactor:**

```javascript
// useFiltering.js (AFTER)
export function useFiltering(params) {
  const filterState = useFilterState();           // searchTerm, filterMode, etc.
  const persistedNavigation = usePersistedReviewIndex(filterState);  // localStorage
  const contextFiltered = useContextFilteredQuestions(params, filterState);
  const uniqueFiltered = useUniqueFilteredQuestions(contextFiltered, params);
  
  return { ...filterState, ...persistedNavigation, ...contextFiltered, ...uniqueFiltered };
}
```

**Files:**

- `src/hooks/filtering/useFilterState.js` (NEW)
- `src/hooks/filtering/usePersistedReviewIndex.js` (NEW)  
- `src/hooks/filtering/useContextFilteredQuestions.js` (NEW)
- `src/hooks/filtering/useUniqueFilteredQuestions.js` (NEW)
- `src/hooks/useFiltering.js` (SIMPLIFIED - composition only)

**Invariant:** Return value shape identical  
**Test:** Existing tests + new unit tests for each sub-hook

---

#### 1.3 Standardize Error Handling Pattern ✅ COMPLETE

**Problem:** 19+ catch blocks with `(e)` only, inconsistent handling

**Migration Status (22 catch blocks migrated):**

- ✅ `cloudFunctions.js` - 5 catch blocks
- ✅ `firebase.js` - 1 catch block
- ✅ `firebaseSave.js` - 3 catch blocks
- ✅ `gemini.js` - 2 catch blocks
- ✅ `useExport.js` - 4 catch blocks
- ✅ `useQuestionGenerator.js` - 1 catch block
- ✅ `useQuestionTranslation.js` - 3 catch blocks
- ✅ `useQuestionCritique.js` - 2 catch blocks
- ✅ `reviewerAnalytics.js` - 4 catch blocks
- ℹ️ Remaining utility files use intentional simple logging

**Create `AppError` Class:** ✅ EXISTS

```javascript
// src/utils/AppError.js (NEW)
export class AppError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export function logError(error, additionalContext = {}) {
  const isAppError = error instanceof AppError;
  logger.error({
    message: error.message,
    code: isAppError ? error.code : 'UNKNOWN',
    context: isAppError ? { ...error.context, ...additionalContext } : additionalContext,
    stack: error.stack,
  });
}
```

**Migration Priority (by file):**

1. `firebaseSave.js` (3 catch blocks)
2. `firebaseQueries.js` (implicit)
3. `useExport.js` (4 catch blocks)
4. `gemini.js` (2 catch blocks)

**Before:**

```javascript
} catch (e) {
  logger.warn("Failed to load offline queue:", e);
}
```

**After:**

```javascript
} catch (e) {
  logError(e, { operation: 'loadOfflineQueue', queueLength: offlineQueue.length });
}
```

**Behavior Preserved:** ✅ Same error handling flow, better logging

---

### Stage 2 – Complexity Collapse (High-Value Refactors)

**Goal:** Break up God Components  
**Time Estimate:** 8-12 hours  
**Test Requirement:** Full regression suite + new component tests

---

#### 2.1 Decompose `QuestionItem.jsx` (747 → 566 lines) ✅ COMPLETE

**Problem:** Handles 6 app modes with conditional rendering throughout

**Strategy:** Extract mode-specific renderers and utility functions

**Accomplishments:**

- ✅ Created `src/hooks/useQuestionHandlers.js` - verification handlers extracted
- ✅ Created `src/utils/questionItemHelpers.js` - lock/status/difficulty style helpers
- ✅ Added verification data builders: `buildVerifyDocsData`, `buildVerifySearchData`, `buildRejectVerificationData`, `buildFlagUnverifiedData`
- ✅ Replaced inline verification handlers with streamlined versions using data builders
- ✅ Removed inline `getDiffBadgeColor` prop - now imported in QuestionHeader
- ✅ Added `colorblindMode` prop to QuestionHeader for accessibility
- ✅ **Result: 747 → 566 lines (24% reduction)**

**Files Modified:**

```
src/components/QuestionItem.jsx          # 747 → 566 lines (-24%)
src/components/QuestionItem/QuestionHeader.jsx  # Now imports getDiffBadgeColor
src/utils/questionItemHelpers.js         # +76 lines (verification data builders)
```

**Invariant:** Props interface unchanged  
**Test:** All 911 tests passing

---

#### 2.2 Decompose `ContextToolbar.jsx` (561 → 122 lines) ✅ COMPLETE

**Problem:** Mode-specific branching for 6 app modes

**Strategy:** Mode-specific toolbar components with component mapping

**Accomplishments:**

- ✅ Created `src/components/ContextToolbar/` directory structure
- ✅ Extracted `CreateModeToolbar.jsx` (117 lines)
- ✅ Extracted `ReviewModeToolbar.jsx` (253 lines) - largest toolbar
- ✅ Extracted `DatabaseModeToolbar.jsx` (103 lines)
- ✅ Extracted `TranslateModeToolbar.jsx` (30 lines)
- ✅ Created `MinimalToolbars.jsx` for Analytics/Test/Admin/Playground
- ✅ Created `SharedToolbarComponents.jsx` (SearchInput, ToolbarDivider, etc.)
- ✅ Main `index.jsx` is now 122 lines (78% reduction)
- ✅ Uses component mapping instead of conditional chains

**Files Structure:**

```
src/components/ContextToolbar/
├── index.jsx                    # Main orchestrator (122 lines)
├── CreateModeToolbar.jsx        # Generate mode (117 lines)
├── ReviewModeToolbar.jsx        # Review mode (253 lines)
├── DatabaseModeToolbar.jsx      # Database mode (103 lines)
├── TranslateModeToolbar.jsx     # Translate mode (30 lines)
├── MinimalToolbars.jsx          # Empty toolbars (30 lines)
└── SharedToolbarComponents.jsx  # Reusable components (130 lines)
```

**Invariant:** Same rendered output per mode ✅
**Test:** All 920 tests passing ✅

---

#### 2.3 Thin Out `App.jsx` (986 lines)

**Problem:** God Component with 25+ hooks

**Strategy:** Extract orchestration into feature-level hooks

**Current State:**

```javascript
// App.jsx - Lines 67-660 are ALL hook calls and effect setup
const App = () => {
  const { toasts, removeToast, showMessage } = useToast();
  const { user, authLoading, isAdmin, ... } = useAuth(showMessage);
  const { appMode, setAppMode, config, ... } = useAppConfig({ user });
  // ... 20+ more hook calls
  // ... 10+ useEffect for side effects
}
```

**After:**

```javascript
// App.jsx (THIN)
const App = () => {
  const orchestrator = useAppOrchestrator();  // Single hook that composes everything
  
  if (orchestrator.isLoading) return <LoadingSpinner />;
  if (!orchestrator.isAuthenticated) return <AuthFlow {...orchestrator.authProps} />;
  
  return (
    <AppShell {...orchestrator.shellProps}>
      <MainContent {...orchestrator.contentProps} />
    </AppShell>
  );
}
```

**Files:**

- `src/hooks/useAppOrchestrator.js` (NEW - composes existing hooks)
- `src/components/AppShell.jsx` (NEW - header, footer, modals)
- `src/components/AuthFlow.jsx` (NEW - sign-in, invite, registration)

**Invariant:** Same rendered output, same behavior  
**Test:** E2E tests for complete user flows

---

#### 2.4 Create Firestore Data Access Layer (DAL) ✅ COMPLETE

**Problem:** `firebaseQueries.js` (718 lines) + `firebaseSave.js` (687 lines) with mixed concerns

**Strategy:** Facade pattern over existing implementation

**Accomplishments:**

- ✅ Created `src/services/firestore/` directory structure
- ✅ `questionRepository.js` - Clean API wrapping existing CRUD functions
- ✅ `userRepository.js` - Custom tags and user preferences
- ✅ `cacheManager.js` - Centralized cache control
- ✅ `connectionMonitor.js` - Offline status tracking
- ✅ `index.js` - Unified re-exports with legacy compatibility

**Files Structure:**

```
src/services/firestore/
├── index.js                    # Re-exports + legacy compatibility
├── questionRepository.js       # CRUD for questions (152 lines)
├── userRepository.js           # User settings, custom tags (66 lines)
├── cacheManager.js             # Centralized caching (70 lines)
└── connectionMonitor.js        # Online/offline status (68 lines)
```

**Pattern:** Facade over existing implementation (no breaking changes)
**Invariant:** Same function signatures exported ✅
**Test:** All 920 tests passing ✅

---

## 🛡️ Part 3: Safety Net (Mandatory Before Each Stage)

### Pre-Stage Checklist

- [ ] All 891 existing tests pass
- [ ] Pre-push hook (`CriticalUI.regression.test.jsx`) passes
- [ ] Git branch created: `refactor/stage-X-description`
- [ ] Snapshot tests added for modified components

### Test Additions Per Stage

| Stage | Required Tests |
|-------|----------------|
| 0 | None (tooling only) |
| 1.1 | Snapshot tests for `parseQuestion` (10 edge cases) |
| 1.2 | Unit tests for each sub-hook (filter state, persistence) |
| 1.3 | Error logging integration test |
| 2.1 | Snapshot tests for `QuestionItem` modes |
| 2.2 | Visual regression for toolbar states |
| 2.3 | E2E for auth flow, mode switching |
| 2.4 | Firestore emulator integration tests |

---

## ⚠️ Part 4: Risk Assessment

### What Could Go Wrong

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking real-time sync | Medium | High | Firestore emulator tests + staging deploy |
| State management bugs after hook extraction | Medium | Medium | Characterization tests before extraction |
| Visual regression in components | Low | Medium | Screenshot comparison in CI |
| Performance regression from additional re-renders | Low | Low | React DevTools profiling before/after |

### Detection Strategy

1. **Immediate:** ESLint, TypeScript (if added), unit tests
2. **Pre-merge:** Full test suite, visual regression
3. **Post-deploy:** Error monitoring (Sentry/LogRocket recommended)

---

## ✅ Part 5: Final Checklist

### Stage 0 Completion ✅ COMPLETE (2026-01-28)

- [x] `.prettierrc` created and committed
- [x] `npm run format:check` runs (many files need formatting - will be fixed incrementally via lint-staged)
- [x] Lint gate added to CI (`format:check` + `lint` steps in deploy.yml)
- [x] ~~Duplicate modal removed~~ N/A - modals serve different purposes (DELETE typing vs reason capture)
- [x] Migration scripts moved to `scripts/migrations/`

### Stage 1 Completion (IN PROGRESS)

- [ ] `parseQuestion.js` created with tests
- [ ] `useFiltering` sub-hooks extracted
- [x] `AppError` class created (`src/utils/AppError.js`) - needs migration to catch blocks
- [x] All 891+ tests pass (verified after Stage 0)

### Stage 2 Completion

- [ ] `QuestionItem` decomposed
- [ ] `ContextToolbar` refactored to mode map
- [ ] `App.jsx` < 300 lines
- [ ] Firestore DAL created
- [ ] Full E2E suite passes

---

## 📋 Recommended Execution Order

1. **Stage 0** (Same day) – Low risk, immediate value
2. **Stage 1.3** (Error handling) – Cross-cutting, enables better debugging
3. **Stage 1.1** (parseQuestion) – Foundation for data integrity
4. **Stage 1.2** (useFiltering) – High churn area
5. **Stage 2.2** (ContextToolbar) – Lower risk decomposition
6. **Stage 2.1** (QuestionItem) – Higher complexity
7. **Stage 2.4** (Firestore DAL) – Core infrastructure
8. **Stage 2.3** (App.jsx) – Final cleanup

---

**Ready to proceed?** Approve this plan to begin Stage 0 implementation.
