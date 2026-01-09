# ESLint Full Cleanup Implementation Plan

**Date:** 2026-01-09
**Total Issues:** 1428 (51 errors, 1377 warnings)
**Estimated Time:** 3-4 hours

## Phase 1: Critical Errors (Priority 1) - 51 Errors

### 1.1 Unused Variables (5 errors)

- [ ] `functions/index.js:1` - Remove unused `_functions`
- [ ] `functions/ai/generateQuestions.js:2` - Remove unused `_admin`
- [ ] `functions/invites/consumeInvite.js:3,6` - Remove unused `_crypto`, `_isAdminUser`
- [ ] `functions/invites/validateInvite.js:3,6` - Remove unused `_crypto`, `_isAdminUser`

### 1.2 Dangerous Regex Patterns (13 errors) - `sonarjs/slow-regex`

These regex patterns are vulnerable to catastrophic backtracking:

- [ ] `functions/ai/generateCritique.js:358`
- [ ] `functions/invites/consumeInvite.js:356`
- [ ] `functions/invites/createInvite.js:356,800`
- [ ] `functions/invites/revokeInvite.js:356,799`
- [ ] `functions/invites/validateInvite.js:356`
- [ ] `functions/migrations/importAIScores.js:355,800`
- [ ] `functions/migrations/migrateTranslations.js:355,800`
- [ ] `functions/users/changeUserRole.js:355,800`
- [ ] `functions/users/listRegisteredUsers.js:355,800`
- [ ] `functions/users/revokeUserAccess.js:355,800`
- [ ] `functions/users/setupInitialAdmin.js:355,800`

### 1.3 Nested Ternaries (3 errors) - `sonarjs/no-nested-conditional`

- [ ] `functions/email/sendReviewerInvites.js:125`
- [ ] `src/components/AnalyticsDashboard.jsx:613`
- [ ] `src/components/PromptPlayground.jsx:199`

### 1.4 Deeply Nested Functions (9 errors) - `sonarjs/no-nested-functions`

- [ ] `src/__tests__/translation.integration.test.jsx` (7 instances)
- [ ] `src/components/AnalyticsDashboard.jsx:562`
- [ ] `src/components/ContextToolbar.jsx:296`
- [ ] `src/components/OmniWatchdog.jsx:195`

### 1.5 Dead Store (1 error) - `sonarjs/no-dead-store`

- [ ] `src/__tests__/questionGeneration.integration.test.jsx:111`

### 1.6 Pseudo-Random (1 error) - `sonarjs/pseudo-random`

- [ ] `src/components/NameEntryModal.jsx:18` - Use crypto.getRandomValues

## Phase 2: Constants Extraction (Priority 2)

### 2.1 Create Constants Files

- [ ] `src/constants/timeouts.js` - Toast durations, delays, intervals
- [ ] `src/constants/limits.js` - Batch sizes, pagination, max lengths
- [ ] `src/constants/thresholds.js` - Quality scores, percentages
- [ ] `functions/constants/security.js` - Salt rounds, token lengths, rate limits

### 2.2 Common Magic Numbers to Extract

- **Timeouts**: 500, 1000, 2000, 3000, 5000, 10000 ms
- **Limits**: 5, 10, 100, 500 (batch sizes, max items)
- **Crypto**: 16, 8 (salt rounds, key lengths)
- **Percentages**: 70, 50, 100
- **Dates**: 7, 30 (expiry days)

## Phase 3: Function Refactoring (Priority 3)

### 3.1 Large Functions (>100 lines)

Strategy: Extract sub-functions or accept exceptions for complex UI components

**Backend (Functions):**

- Most Cloud Functions have a common wrapper pattern causing inflated line counts
- Consider extracting wrapper to a reusable decorator

**Frontend (Components):**

- Large components like `App.jsx`, `Header.jsx`, `AdminPanel.jsx` are acceptable
- Consider splitting only if logically separable

### 3.2 High Complexity Functions

- Refactor functions with complexity >20 by extracting conditional logic
- Use early returns to reduce nesting

## Phase 4: Code Quality Improvements (Priority 4)

### 4.1 Unused Variables Cleanup

- [ ] `src/components/Admin/UserList.jsx` - `successCount`, `failCount`
- [ ] `src/components/QuestionItem.jsx` - `onDelete`
- [ ] `src/components/InviteSignUp.jsx` - `GoogleIcon`
- [ ] `src/__tests__/questionGeneration.integration.test.jsx` - `mockSetShowAdvancedConfig`

### 4.2 Unused ESLint Directives

- Remove unnecessary `eslint-disable` comments

## Execution Order

1. ✅ **Phase 1.1-1.6**: Fix all 51 errors (30 min)
2. ✅ **Phase 2**: Create and apply constants (45 min)
3. ✅ **Phase 3**: Refactor or accept large functions (60 min)
4. ✅ **Phase 4**: Final cleanup (30 min)
5. ✅ **Verification**: Run full lint and test suite (15 min)

## Success Criteria

- **Errors**: 0 (from 51)
- **Warnings**: <500 (from 1377) - aiming for 65% reduction
- **Tests**: All 332 tests still passing
- **No Regressions**: Application behavior unchanged
