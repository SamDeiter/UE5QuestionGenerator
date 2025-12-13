# UE5 Question Generator - Next Steps

## 🔥 Priority: Tech Debt

### 1. Simplify Question State Management

**File:** `src/hooks/useQuestionManager.js`

- Current: 3 arrays (`questions`, `historicalQuestions`, `databaseQuestions`) + Map + variants
- Proposed: Single Firestore source of truth + simple counts object
- Complexity reduction: ~50%

### 2. Fix Remaining 14 Lint Warnings

**Run:** `npm run lint`

- Unused variables and missing dependencies
- Low effort, high hygiene

### 3. Set Up Pre-Commit Hooks

**File:** Add husky + lint-staged config

- Auto-lint on commit
- Prevent regressions

---

## 🎯 Feature Backlog

| Feature | Priority | Effort |
|---------|----------|--------|
| Export to SCORM 1.2 | High | Medium |
| Batch translation progress | Medium | Low |
| Question editing UI | Medium | Medium |
| Analytics dashboard improvements | Low | Low |

---

## ✅ Recently Completed (Dec 12)

- [x] Fixed hardcoded API key (security)
- [x] Removed tracked .env files from git
- [x] Added DOMPurify to SourceContextCard
- [x] Fixed 4 lint errors (0 errors now)
- [x] Fixed question count duplication on refresh
- [x] Updated CODE_QUALITY.md with accurate status
