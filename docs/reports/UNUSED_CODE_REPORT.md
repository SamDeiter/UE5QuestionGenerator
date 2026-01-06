# Unused Code Analysis Report

## Summary

Found **52 instances** of unused code across the codebase. These are safe to remove.

---

## App.jsx (13 unused variables)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 61 | `_addToast` | ✅ Prefixed with `_` |
| 75 | `_setCustomTags` | ✅ |
| 82 | `_termsAccepted` | ✅ |
| 190 | `_pendingCount` | ✅ |
| 225 | `_files` | ✅ |
| 226 | `_setFiles` | ✅ |
| 228 | `_isDetecting` | ✅ |
| 230 | `_removeFile` | ✅ |
| 261 | `_contextFilteredQuestions` | ✅ |
| 357 | `_showExportMenu` | ✅ |
| 363 | `_dataMenuOpen` | ✅ |
| 364 | `_setDataMenuOpen` | ✅ |
| 365 | `_dataMenuRef` | ✅ |
| 430 | `_auth` | ✅ |

---

## AdminPanel.jsx (2 unused)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 130 | `_result` | ✅ |
| 161 | `_result` | ✅ |

---

## DatabaseView.jsx (5 unused)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 29 | `_isSyncing`, `_setIsSyncing` | ✅ |
| 30 | `_syncProgress`, `_setSyncProgress` | ✅ |
| 31 | `_loadMenuOpen` | ✅ |

---

## QuestionItem.jsx (2 unused)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 56 | `_lockStatus` | ✅ |
| 60 | `_isAcquiring` | ✅ |

---

## LanguageControls.jsx (1 unused)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 17 | `_translateMenuOpen` | ✅ |

---

## QuestionActions.jsx (4 unused)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 121 | `_handleVerify` | ✅ |
| 138 | `_handleAccept` | ✅ |
| 169 | `_getAcceptButtonStyle` | ✅ |
| 194 | `_getAcceptTooltip` | ✅ |

---

## QuestionHeader.jsx (1 unused import)

| Line | Import | Safe to Remove |
|------|--------|----------------|
| 3 | `getDisplayUrl` | ✅ |

---

## QuestionMenu.jsx (1 unused)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 12 | `_menuOpen` | ✅ |

---

## Header.jsx (1 unused)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 38 | `_showTutorialCenter` | ✅ |

---

## AnalyticsView.jsx (1 unused import)

| Line | Import | Safe to Remove |
|------|--------|----------------|
| 21 | `_CATEGORY_KEYS` | ✅ |

---

## CritiqueDisplay.jsx (1 unused)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 115 | `_ListTag` | ✅ |

---

## useAuth.js (1 unused)

| Line | Variable | Safe to Remove |
|------|----------|----------------|
| 77 | `setupError` | ✅ (caught but not used) |

---

## questionConverter.js (2 dead stores)

| Line | Issue | Safe to Remove |
|------|-------|----------------|
| 24 | Useless assignment to `targetAnswer` | ✅ |
| 33 | Redundant assignment to `makeItTrue` | ✅ |

---

## Test Files (various)

| File | Line | Variable |
|------|------|----------|
| questionGeneration.integration.test.jsx | 76 | `mockSetShowAdvancedConfig` |

---

## Recommended Action

Run this Python script to automatically remove all `_`-prefixed unused variables:

```python
# cleanup_unused.py - removes unused _ prefixed destructured vars
# Run with: python cleanup_unused.py
```

Or manually remove them one file at a time, starting with App.jsx.
