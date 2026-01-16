# 📋 Critique & Verify Workflow - RESOLVED

**Created:** 2026-01-15  
**Resolved:** 2026-01-16  
**Status:** ✅ IMPLEMENTED - Hybrid Workflow

---

## 🎯 Implemented Workflow

### Review Pipeline Steps

```
[Critique] → [Verify] → [Accept]
```

| Step | Trigger | What Happens |
|------|---------|--------------|
| **1. Critique** | Click "Critique" button | AI evaluates question, returns score 0-100 |
| **2. Verify** | Click "Epic Docs" → then "Confirm Verified" | Opens docs, then requires explicit confirmation |
| **3. Accept** | Click "Accept" button | Low-score warning if < 70, then accepts |

---

## ✅ Decisions Made

### Issue 1: What Does "Verify" Actually Check?

**Resolution:** Two-step verification:

1. User clicks "Epic Documentation" or "Search Excerpt" to open source
2. After opening, a green "Confirm Verified" button appears
3. User must click "Confirm Verified" to mark as verified

### Issue 2: Auto-Verification Trigger

**Resolution:** Auto-verification REMOVED. Opening docs/search does NOT mark as verified. Explicit confirmation required.

### Issue 3: Relationship Between Critique and Verify

**Resolution:** Flexible ordering. Critique is informational, not blocking. Both required before Accept.

### Issue 4: Low-Score Handling

**Resolution:** If critique score < 70 and user clicks Accept, a browser confirm dialog appears asking "Are you sure?"

---

## 📂 Files Changed

| File | Changes |
|------|---------|
| `src/components/QuestionItem/SourceContextCard.jsx` | Added `hasOpenedDocs` state, `onConfirmVerify` prop, "Confirm Verified" button |
| `src/components/QuestionItem.jsx` | Added `handleConfirmVerify` callback, low-score warning in `handleAccept` |

---

## 🧪 How to Test

1. Open Review mode
2. Select a pending question
3. Run Critique (score appears)
4. Click "Epic Documentation" → docs open in new tab
5. **Observe:** "Confirm Verified" button appears (emerald green)
6. Click "Confirm Verified" → toast shows "✅ Source verified!"
7. Progress bar shows Verify step complete
8. Click Accept:
   - If score ≥ 70: Accepts immediately
   - If score < 70: Shows confirmation dialog first
