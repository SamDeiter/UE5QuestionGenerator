# AI Critique Improvement Feature - Implementation Plan

**Session ID:** afc34660-925b-41bf-b3ae-923545676776
**Date:** 2025-12-16
**Status:** Foundation Complete, Awaiting Integration

---

## 📋 Context Summary

### What We're Building

An AI critique improvement system that:

1. Shows side-by-side comparison of original vs AI-improved questions
2. Automatically adds missing tags during critique
3. Allows users to review and apply improvements with visual diffs
4. Maintains strict two-step verification (Verify → Accept)

### What's Already Done ✅

- ✅ Created `ImprovementModal.jsx` - Side-by-side comparison component
- ✅ Created `diffUtils.js` - Text diff highlighting utilities  
- ✅ Added modal state to `QuestionItem.jsx`
- ✅ Committed to git (commit 7bb5bd4)
- ✅ Fixed trim button (uses TARGET_PER_CATEGORY = 40)
- ✅ Fixed reject dropdown positioning
- ✅ All questionGeneration integration tests passing (9/9)

---

## 🎯 Required User Workflow (Non-Negotiable)

```
Path A - Without AI Improvements:
1. Click "Verify" shield → Sets humanVerified = true
2. Click "Accept" → Changes status to "accepted"

Path B - With AI Improvements:
1. Click "Critique" → AI analyzes question
2. Badge appears: "⚡ +12 pts available"
3. Click badge → Modal opens showing side-by-side
4. Review comparison → Click "Apply Improvement"
5. Click "Verify" shield → Sets humanVerified = true  
6. Click "Accept" → Changes status to "accepted"
```

**Critical Rules:**

- ✅ Two separate steps REQUIRED (Verify → Accept)
- ✅ NO auto-accept, even after applying improvements
- ✅ Human must verify the final version before accepting
- ✅ AI improvements are optional suggestions only

---

## 🚧 What Needs to Be Done

### Phase 1: Integrate ImprovementModal into QuestionItem

**File:** `src/components/QuestionItem.jsx`

**Task 1.1** - Add improvement badge button (after QuestionActions, around line 106):

```jsx
{/* AI Improvement Badge */}
{q.suggestedRewrite && (
  <button
    onClick={() => setShowImprovementModal(true)}
    className="px-3 py-2 rounded-lg font-bold text-sm bg-green-600/20 text-green-300 hover:bg-green-600/30 border-2 border-green-500/50 hover:border-green-400 transition-all flex items-center gap-2 animate-pulse hover:animate-none"
    title="AI improvement available"
  >
    <Icon name="sparkles" size={16} />
    <span>+{(q.suggestedRewrite.critiqueScore || 0) - (q.critiqueScore || 0)} pts</span>
  </button>
)}
```

**Task 1.2** - Add modal rendering (at end of component, before closing div, around line 190):

```jsx
{/* AI Improvement Modal */}
{showImprovementModal && q.suggestedRewrite && (
  <ImprovementModal
    originalQuestion={q}
    improvedQuestion={{...q, ...q.suggestedRewrite}}
    onApply={async (improved) => {
      // Apply improvements to question
      await onUpdateQuestion(q.id, {
        question: improved.question,
        options: improved.options,
        optionA: improved.optionA,
        optionB: improved.optionB,
        optionC: improved.optionC,
        optionD: improved.optionD,
        tags: improved.tags,
        critiqueScore: improved.critiqueScore,
        suggestedRewrite: null, // Clear suggestion after apply
      });
      setShowImprovementModal(false);
      if (showMessage) {
        showMessage("✅ Improvement applied! Now verify and accept.", 3000);
      }
    }}
    onDismiss={() => setShowImprovementModal(false)}
  />
)}
```

---

### Phase 2: Update Critique to Generate Tags

**File:** `src/hooks/useGeneration.js` or wherever `handleCritique` is defined

**Task 2.1** - Find the critique function (search for "handleCritique" or "onCritique")

**Task 2.2** - Add tag generation logic:

```javascript
import { generateTagsSecure as generateTagsForQuestion } from '../services/geminiSecure';

// Inside handleCritique function, after getting critique response:
let suggestedTags = q.tags || [];

// Generate tags if question has fewer than 3
if (suggestedTags.length < 3) {
  try {
    const newTags = await generateTagsForQuestion(apiKey, improvedQuestion);
    if (newTags && newTags.length > 0) {
      suggestedTags = [
        ...new Set([
          ...suggestedTags,
          ...newTags.map(t => t.replace(/^#/, ''))
        ])
      ];
    }
  } catch (error) {
    console.error('Tag generation failed:', error);
  }
}

// Store in suggestedRewrite object
const suggestedRewrite = {
  question: improvedQuestionText,
  optionA: improvedOptionA,
  // ... other options
  tags: suggestedTags,
  critiqueScore: newScore,
};

// Update question with suggestedRewrite
onUpdateQuestion(q.id, { ...q, suggestedRewrite });
```

---

### Phase 3: Remove "Tag All Pending" Button

**Files to modify:**

- `src/hooks/useReviewActions.js` - Remove `handleAutoTagAll` from exports
- Find toolbar component (grep for "Tag All Pending") - Remove button

**Task 3.1** - Search for the button:

```bash
grep -r "Tag All Pending" src/
```

**Task 3.2** - Remove button from toolbar

**Task 3.3** - Update useReviewActions.js exports (around line 268):

```javascript
return {
  handleClearPending,
  handleBulkAcceptHighScores,
  handleBulkCritiqueAll,
  handleTrimExcess,
  // handleAutoTagAll, ← REMOVE THIS LINE
};
```

---

### Phase 4: Testing Checklist

- [ ] Badge appears when critique creates improvements
- [ ] Badge shows correct point delta
- [ ] Modal opens with side-by-side comparison
- [ ] Text diffs are highlighted (red=removed, green=added)
- [ ] New tags are shown in green
- [ ] "Apply Improvement" button works
- [ ] Question is updated correctly after apply
- [ ] Badge disappears after apply
- [ ] Verify button still works
- [ ] Accept only works after verify
- [ ] Flow works with and without improvements

---

## 📂 Key Files Reference

```
src/
├── components/
│   ├── QuestionItem.jsx ← Add badge & modal rendering
│   ├── ImprovementModal.jsx ✅ Already created
│   └── Icon.jsx ← Already exists
├── hooks/
│   ├── useGeneration.js ← Add tag generation to critique
│   └── useReviewActions.js ← Remove handleAutoTagAll
├── utils/
│   └── diffUtils.js ✅ Already created
└── services/
    └── geminiSecure.js ← Has generateTagsSecure function
```

---

## 🎨 suggestedRewrite Object Structure

```javascript
{
  question: "Improved question text",
  optionA: "Improved option A",
  optionB: "Improved option B",
  optionC: "Improved option C",
  optionD: "Improved option D",
  tags: ["Tag1", "Tag2", "Tag3"], // Merged with existing
  critiqueScore: 85, // New score after improvements
  improvements: [ // Optional: list of what changed
    "Better wording",
    "Added 2 missing tags",
    "More scenario-based"
  ]
}
```

---

## 🚀 Deployment Steps (After Implementation)

1. Test locally with `npm run dev`
2. Commit: `git commit -m "feat: AI critique with side-by-side improvements and auto-tagging"`
3. Push: `git push origin main`
4. Deploy: `npm run deploy`
5. Test on GitHub Pages

---

## 💡 Tips for Next Session

1. Start by viewing the files already created:
   - `src/components/ImprovementModal.jsx`
   - `src/utils/diffUtils.js`

2. Search for handleCritique to find where critique logic lives:

   ```bash
   grep -r "handleCritique" src/
   ```

3. Test the modal in isolation first before integrating critique logic

4. Remember: The modal is already built, just needs to be wired up!

---

## 🐛 Known Issues to Watch For

- Import errors if Icon component path is wrong
- Badge might not show if suggestedRewrite structure is wrong
- Modal z-index needs to be high enough (z-50)
- Diff highlighting might fail if text is not a string
- Tags need # prefix removed before storing

---

**Current Git Branch:** main
**Last Commit:** 7bb5bd4 "wip: start AI improvement modal implementation"
**Session Status:** Ready for integration - foundation complete

**Next Command to Run:**

```bash
cd "C:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator"
code src/components/QuestionItem.jsx
# Start with Phase 1.1 - Add improvement badge
```
