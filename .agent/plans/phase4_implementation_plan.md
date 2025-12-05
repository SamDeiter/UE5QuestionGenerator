# Phase 4 Implementation Plan - UPDATED
## UE5 Question Generator - Remaining Priorities

**Status:** Planning Phase  
**Date:** December 4, 2024  
**Completed:** Priority 1 - User-Created Tags ✅

---

## ⚠️ PRIORITY 0: Fix Tutorial (URGENT)
**Goal:** Fix broken tutorial steps  
**Estimated Time:** 0.5-1 hour  
**Status:** Identified issues

### Issues Found
Based on testing, the following tutorial steps are broken:

1. **Step 2 (Discipline):** Highlight is offset, tooltip partially off-screen
2. **Step 3 (Upload):** Highlight missing, tooltip far from target
3. **Step 4 (Settings):** Highlight missing, tooltip partially off-screen
4. **Step 5 (Generate):** Highlight missing, tooltip partially off-screen
5. **Step 6 (Review):** Highlight missing, tooltip partially off-screen

### Root Cause
- Spotlight/highlight effect not working correctly for most steps
- Tooltip positioning needs adjustment for elements near screen edges
- Some `data-tour` attributes may be missing or incorrect

### Tasks

#### 0.1 Fix Spotlight/Highlight (0.25 hours)
**File:** `src/components/TutorialOverlay.jsx`

**Issues:**
- Spotlight calculation may be incorrect
- Z-index conflicts
- Target element detection failing

**Fix:**
```javascript
// Ensure spotlight correctly calculates element position
const getElementPosition = (selector) => {
  const element = document.querySelector(selector);
  if (!element) return null;
  
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height
  };
};
```

#### 0.2 Fix Tooltip Positioning (0.25 hours)
**File:** `src/components/TutorialOverlay.jsx`

**Issues:**
- Tooltips going off-screen
- Need boundary detection

**Fix:**
```javascript
// Add boundary checking to keep tooltips on screen
const adjustTooltipPosition = (position, tooltipRect, targetRect) => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  // If tooltip would go off right edge, flip to left
  if (position === 'right' && targetRect.right + tooltipRect.width > viewport.width) {
    return 'left';
  }
  
  // If tooltip would go off left edge, flip to right
  if (position === 'left' && targetRect.left - tooltipRect.width < 0) {
    return 'right';
  }
  
  // Similar checks for top/bottom
  return position;
};
```

#### 0.3 Verify data-tour Attributes (0.25 hours)
**Files:** Various components

**Check:**
- `[data-tour="discipline-selector"]` - GenerationSettings.jsx
- `[data-tour="open-settings"]` - Sidebar.jsx
- `[data-tour="generation-settings"]` - Sidebar.jsx
- `[data-tour="generate-button"]` - ActionFooter.jsx
- `[data-tour="review-area"]` - App.jsx

**Ensure all attributes exist and are on correct elements**

#### 0.4 Test All Steps (0.25 hours)
- Manually test each tutorial step
- Verify spotlight appears
- Verify tooltip is on-screen
- Verify "Next" button works
- Test on different screen sizes

#### 0.5 Improve Tutorial Content (0.25 hours)
**File:** `src/utils/tutorialSteps.js`

**User Feedback:** "It also needs to explain the review and database a little better"

**Changes:**
- Add new step explaining Review Mode workflow
- Add new step explaining Database View purpose
- Add new step showing complete workflow (Create → Review → Database → Export)
- Update existing steps to mention:
  - Custom tags feature
  - English-only generation
  - Translation only for accepted questions

**New Steps to Add:**
```javascript
{
  id: 'review-mode',
  title: 'Review Mode - Quality Control',
  content: 'Switch to Review Mode to carefully evaluate each question. Accept good questions, reject bad ones, or use AI Critique to get improvement suggestions. Only accepted questions can be translated.',
  target: null,
  position: 'center'
},
{
  id: 'database-view',
  title: 'Database View - Your Question Bank',
  content: 'The Database View shows all your accepted questions stored in Firestore. This is your permanent question bank that syncs across devices. You can export, translate, or "kick back" questions to Review Mode.',
  target: null,
  position: 'center'
},
{
  id: 'workflow',
  title: 'The Complete Workflow',
  content: '1️⃣ Generate in Create Mode → 2️⃣ Review & Accept/Reject → 3️⃣ Questions auto-save to Database → 4️⃣ Translate accepted English questions → 5️⃣ Export to Sheets/CSV',
  target: null,
  position: 'center'
}
```

**Total Tutorial Steps:** 9 (was 6)

---

## Priority 2: Enhanced Critique System
**Goal:** Make AI critiques more actionable with auto-fix capabilities  
**Estimated Time:** 3-4 hours

### Current State
- ✅ Critique generates score and feedback
- ✅ Critique generates suggested rewrite
- ✅ "Apply Changes" button exists
- ❌ No diff viewer to show changes
- ❌ No undo/redo functionality
- ❌ No acceptance rate tracking

### Tasks

#### 2.1 Implement Diff Viewer (1.5 hours)
**File:** `src/components/DiffViewer.jsx` (new)

**Requirements:**
- Show side-by-side comparison of original vs suggested
- Highlight changed fields (question text, options, answer)
- Color coding: red for removed, green for added
- Compact view for mobile

**Implementation:**
```javascript
// DiffViewer.jsx
- Compare original question vs suggestedRewrite
- Highlight differences in:
  - Question text
  - Options A/B/C/D
  - Correct answer
  - Source excerpt (if changed)
- Use diff algorithm (e.g., diff-match-patch library)
```

**Integration:**
- Update `CritiqueDisplay.jsx` to show DiffViewer when suggestedRewrite exists
- Add toggle between "Preview" and "Diff" view

#### 2.2 Add Undo/Redo System (1 hour)
**File:** `src/hooks/useQuestionHistory.js` (new)

**Requirements:**
- Track question edit history per question
- Support undo/redo for applied critiques
- Limit history to last 10 changes per question
- Clear history when question is deleted

**Implementation:**
```javascript
// useQuestionHistory.js
const useQuestionHistory = (questionId) => {
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  
  const addToHistory = (questionState) => { /* ... */ };
  const undo = () => { /* ... */ };
  const redo = () => { /* ... */ };
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  
  return { undo, redo, canUndo, canRedo, addToHistory };
};
```

**Integration:**
- Add undo/redo buttons to QuestionItem
- Store history in component state (not persisted)
- Show "Undo" button after applying critique

#### 2.3 Track Critique Acceptance Rate (0.5 hours)
**File:** `src/utils/analyticsStore.js`

**Requirements:**
- Track when critique is generated
- Track when suggested rewrite is applied
- Track when suggested rewrite is rejected
- Calculate acceptance rate per discipline

**Metrics to Track:**
```javascript
{
  critiqueGenerated: number,
  critiqueApplied: number,
  critiqueRejected: number,
  acceptanceRate: number, // (applied / generated) * 100
  byDiscipline: {
    [discipline]: {
      generated: number,
      applied: number,
      rejected: number
    }
  }
}
```

**Integration:**
- Update `handleCritique` to log generation
- Update "Apply Changes" handler to log acceptance
- Add to Analytics Dashboard

---

## Priority 3: Import Questions to Database
**Goal:** Allow users to import questions from Create mode directly to the database  
**Estimated Time:** 2-3 hours

### Current State
- ❌ No import functionality from Create mode
- ✅ Database view exists
- ✅ Firestore save/load works

### Tasks

#### 3.1 Add Import UI (1 hour)
**Files:** 
- `src/components/ImportToDbModal.jsx` (new)
- `src/App.jsx` (update)

**Requirements:**
- Bulk select questions in Create mode
- "Import to Database" button in bulk action bar
- Confirmation modal showing:
  - Number of questions to import
  - Filter options (only accepted, only pending, all)
  - Option to auto-accept on import
- Progress indicator for large imports

**UI Flow:**
```
1. User selects questions in Create mode
2. Clicks "Import to Database" button
3. Modal appears with options:
   - [ ] Only import accepted questions
   - [ ] Auto-accept pending questions on import
   - [ ] Include translations
4. User confirms
5. Progress bar shows import status
6. Success message with count
```

#### 3.2 Implement Import Logic (1 hour)
**File:** `src/hooks/useQuestionManager.js`

**Requirements:**
- Copy selected questions to database
- Preserve all metadata (critique, score, etc.)
- Handle duplicates (skip or update)
- Batch save to Firestore (max 500 at a time)

**Implementation:**
```javascript
const handleImportToDatabase = async (questionIds, options) => {
  const questionsToImport = questions.filter(q => 
    questionIds.includes(q.id) && 
    (options.onlyAccepted ? q.status === 'accepted' : true)
  );
  
  // Auto-accept if option selected
  if (options.autoAccept) {
    questionsToImport.forEach(q => q.status = 'accepted');
  }
  
  // Save to Firestore in batches
  for (let i = 0; i < questionsToImport.length; i += 500) {
    const batch = questionsToImport.slice(i, i + 500);
    await Promise.all(batch.map(q => saveQuestionToFirestore(q)));
  }
  
  // Update database view
  setDatabaseQuestions(prev => [...prev, ...questionsToImport]);
};
```

#### 3.3 Update Database View (0.5 hours)
**File:** `src/components/DatabaseView.jsx`

**Requirements:**
- Refresh after import
- Show import timestamp
- Add filter for "Recently Imported"

---

## Priority 4: Remove Language from Generation Settings
**Goal:** Only allow translation on accepted English questions  
**Estimated Time:** 1-2 hours

### Current State
- ❌ Language selector in GenerationSettings
- ❌ Can generate questions in any language
- ✅ Translation feature exists

### User Requirement
> "We have to get rid of language in the generation settings and only have translation available on questions we know are good in English"

### Tasks

#### 4.1 Remove Language from Generation (0.5 hours)
**Files:**
- `src/components/sidebar/GenerationSettings.jsx`
- `src/utils/constants.js`

**Changes:**
- Remove language dropdown from GenerationSettings
- Set default language to 'English' for all generation
- Update DEFAULT_CONFIG to remove language field
- Update prompt builder to always use English

**Code Changes:**
```javascript
// GenerationSettings.jsx
// REMOVE:
<div className="space-y-1">
  <label>Language</label>
  <select name="language" ...>
    <option>English</option>
    <option>Chinese (Simplified)</option>
    ...
  </select>
</div>

// constants.js
export const DEFAULT_CONFIG = {
  apiKey: '',
  sheetUrl: '',
  creatorName: '',
  reviewerName: '',
  discipline: 'Technical Art',
  difficulty: 'Easy MC',
  // language: 'English' // REMOVED - always English
};
```

#### 4.2 Restrict Translation to Accepted Questions (0.5 hours)
**Files:**
- `src/components/QuestionItem/LanguageControls.jsx`
- `src/hooks/useGeneration.js`

**Requirements:**
- Only show translate button if:
  - Question status is 'accepted'
  - Question language is 'English'
  - Question has valid source URL
- Update bulk translate to only process accepted English questions

**Code Changes:**
```javascript
// LanguageControls.jsx
const canTranslate = q.status === 'accepted' && 
                     q.language === 'English' && 
                     q.sourceUrl && 
                     !q.invalidUrl;

if (!canTranslate) {
  return null; // Don't show translate controls
}
```

#### 4.3 Update UI Messages (0.5 hours)
**Files:**
- `src/components/Sidebar.jsx`
- `src/components/ActionFooter.jsx`

**Changes:**
- Update "Bulk Translate" button tooltip
- Add message: "Only accepted English questions can be translated"
- Update tutorial steps to reflect new workflow

---

## Priority 5: API Key Security (Future)
**Goal:** Move API keys server-side for production use  
**Estimated Time:** 5-7 hours  
**Status:** Deferred to Phase 5

### Overview
This is a larger architectural change that should be done after the above priorities.

### High-Level Tasks
1. Create Firebase Cloud Function for question generation
2. Update frontend to call Cloud Function instead of direct API
3. Implement rate limiting per user
4. Add API key rotation mechanism
5. Update Firestore security rules

**Note:** This will be planned in detail once Priorities 0-4 are complete.

---

## Implementation Order

### **UPDATED Recommended Sequence:**
1. **Priority 0** (Fix Tutorial) - URGENT, 0.5-1 hour
2. **Priority 4** (Remove Language) - Quick fix, prevents bad workflow, 1-2 hours
3. **Priority 2** (Enhanced Critique) - High user value, 3-4 hours
4. **Priority 3** (Import to Database) - Nice to have, 2-3 hours
5. **Priority 5** (API Security) - Phase 5

**Total Time for Priorities 0-4: ~7-10 hours**

---

## Testing Checklist

### Priority 0 (Tutorial)
- [ ] All tutorial steps show correct spotlight
- [ ] All tooltips stay on screen
- [ ] All data-tour attributes exist
- [ ] Tutorial works on mobile/tablet
- [ ] "Next" and "Previous" buttons work

### Priority 2 (Critique)
- [ ] Diff viewer shows correct changes
- [ ] Undo/redo works correctly
- [ ] Acceptance rate tracked in analytics
- [ ] No performance issues with large diffs

### Priority 3 (Import)
- [ ] Import modal shows correct count
- [ ] Duplicate handling works
- [ ] Progress bar updates correctly
- [ ] Database view refreshes after import

### Priority 4 (Language)
- [ ] Language removed from generation settings
- [ ] All generated questions are English
- [ ] Translate button only shows on accepted English questions
- [ ] Bulk translate filters correctly

---

## Success Metrics

### Priority 0
- Tutorial completion rate > 80%
- Zero off-screen tooltips
- All steps have working highlights

### Priority 2
- Critique acceptance rate > 60%
- Users apply at least 1 suggested rewrite per session
- Undo feature used at least once per 10 critiques

### Priority 3
- Users import at least 50% of accepted questions to database
- Import time < 5 seconds for 100 questions
- Zero duplicate questions after import

### Priority 4
- 100% of generated questions are English
- Translation only available on accepted questions
- No user confusion about language workflow

---

## Dependencies

### External Libraries Needed
- **Priority 0:** None
- **Priority 2:** `diff-match-patch` or `react-diff-viewer` for diff display
- **Priority 3:** None (use existing Firestore)
- **Priority 4:** None

### Firestore Schema Changes
- **Priority 0:** None
- **Priority 2:** Add `critiqueStats` to analytics collection
- **Priority 3:** None (use existing questions collection)
- **Priority 4:** None

---

## Rollback Plan

If any priority causes issues:

1. **Priority 0:** Disable tutorial button temporarily
2. **Priority 2:** Remove diff viewer, keep basic critique
3. **Priority 3:** Disable import button, revert to manual copy
4. **Priority 4:** Re-add language selector with warning message

---

## Next Steps

1. **User Review:** Review this UPDATED plan and approve sequence
2. **Start with Priority 0:** Fix tutorial (URGENT)
3. **Iterative Testing:** Test each feature before moving to next
4. **Git Commits:** Commit after each priority completion
5. **Documentation:** Update V1.6_CHECKLIST.md after each priority

---

**Ready to proceed?** Please confirm:
- Should I start with **Priority 0 (Fix Tutorial)** immediately?
- Any changes to the plan?
- Any additional requirements?
