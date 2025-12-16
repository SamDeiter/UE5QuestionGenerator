# UE5 Question Generator - Next Steps

## 🔥 Priority: Tech Debt

### 1. Simplify Question State Management

**File:** `src/hooks/useQuestionManager.js`

- Current: 3 arrays (`questions`, `historicalQuestions`, `databaseQuestions`) + Map + variants
- Proposed: Single Firestore source of truth + simple counts object
- Complexity reduction: ~50%

---

## 🎯 Feature Backlog

| Feature | Priority | Effort |
|---------|----------|--------|
| Export to SCORM 1.2 | High | Medium |
| Batch translation progress | Medium | Low |
| Question editing UI | Medium | Medium |
| Analytics dashboard improvements | Low | Low |

---

## ✅ Recently Completed (Dec 16)

- [x] **Fixed all 14 ESLint warnings** - 100% code hygiene achievement
  - Removed unused imports (getAnalytics, getSecureItem)
  - Fixed React Hook dependency arrays
  - Prefixed intentionally unused parameters
- [x] **Set up pre-commit hooks** with husky + lint-staged
  - Auto-lints all staged files before commit
  - Prevents regression of code quality issues

## ✅ Previously Completed (Dec 12)

- [x] Fixed hardcoded API key (security)
- [x] Removed tracked .env files from git
- [x] Added DOMPurify to SourceContextCard
- [x] Fixed 4 lint errors (0 errors now)
- [x] Fixed question count duplication on refresh
- [x] Updated CODE_QUALITY.md with accurate status
