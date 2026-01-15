# 📋 Critique & Verify Workflow - Current State & Questions

**Created:** 2026-01-15  
**Status:** 🔍 Under Review - Needs Clarification

---

## 🎯 Current Workflow (As Implemented)

### Review Pipeline Steps

The `ReviewProgressBar.jsx` shows these steps:

```
[Critique] → [Verify] → [Accept]
```

| Step | Trigger | What Happens |
|------|---------|--------------|
| **1. Critique** | Click "Critique" button | AI evaluates question, returns score 0-100, may suggest rewrite |
| **2. Verify** | Click "Verify Source" or open Epic Docs | Sets `humanVerified: true`, records who verified and when |
| **3. Accept** | Click "Accept" button | Sets `status: 'accepted'` - question goes into the approved pool |

---

## 🤔 Current Confusion Points

### Issue 1: What Does "Verify" Actually Check?

**Current behavior:**

- Clicking "Verify Source" opens the Epic Docs link (`sourceUrl`)
- Just opening the link marks `humanVerified: true`
- No actual confirmation that the human **read and checked** the content

**Questions:**

- Should there be a confirmation step after viewing docs?
- Should the user manually confirm "Yes, I verified this is correct"?

### Issue 2: Auto-Verification Trigger

**Current behavior (from `SourceContextCard.jsx` and `QuestionItem.jsx`):**

- `handleOpenDocs()` - Opens Epic Docs URL AND sets verified = true
- `handleOpenSearch()` - Opens Google Search AND sets verified = true

**Question:** Is this intentional? Just opening a link = verified?

### Issue 3: Relationship Between Critique and Verify

**Current flow:**

1. Critique runs → returns score and optional rewrite
2. If score < 70, "Apply Improvement" modal appears
3. User can apply improvement or dismiss
4. Verify step is independent (can be done before/after critique)

**Question:** Should Verify be locked until Critique is done? Or vice versa?

### Issue 4: Progress Bar Decoupling

**From recent sessions:** The "Verify Source" button was updated to NOT auto-advance to the next question.

**Current behavior:**

- Verify updates the progress bar locally
- But critique and verify are independent steps
- Accept requires BOTH critique and verify to be complete

---

## 🔧 Proposed Clarifications (For Discussion)

### Option A: Strict Pipeline

```
Must Critique (score ≥70) → Must Verify → Can Accept
```

- Pros: Consistent quality control
- Cons: Slow for trusted reviewers

### Option B: Flexible Pipeline

```
Critique (any score) → Verify (any time) → Accept (if both done)
```

- Pros: Faster workflow
- Cons: Might accept low-quality questions

### Option C: Verification Confirmation

```
Critique → Click "Verify" → Opens Docs → User clicks "Confirm Verified" → Accept enabled
```

- Pros: Actually confirms human review happened
- Cons: Extra click

---

## 📂 Relevant Files

| File | Purpose |
|------|---------|
| `src/components/ReviewProgressBar.jsx` | Shows the Critique → Verify → Accept pipeline |
| `src/components/QuestionItem.jsx` | Contains `handleOpenDocs()` and `handleOpenSearch()` |
| `src/components/QuestionItem/SourceContextCard.jsx` | Shows "Verify Source" buttons |
| `src/hooks/generation/useQuestionCritique.js` | Handles the AI critique logic |

---

## ✅ Next Session Action Items

- [ ] Decide: Should "opening docs" automatically mark as verified?
- [ ] Decide: Should there be a manual "Confirm Verified" button?
- [ ] Decide: Should critique score threshold block verification or acceptance?
- [ ] Update `ReviewProgressBar` based on decisions
- [ ] Update `SourceContextCard` based on decisions

---

## 🗂️ Related Context

- Critique Cloud Function was just fixed (defensive validation added)
- Version 2.2.99 deployed to GitHub Pages
- The "Verify Source" button no longer auto-advances to next question (per recent fix)
