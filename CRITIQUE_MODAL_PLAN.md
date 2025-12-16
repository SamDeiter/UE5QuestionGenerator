# Unified Critique Modal Implementation Plan

## 🎯 **Objective**

Create ONE comprehensive modal that appears when user clicks "Critique" button, showing:

1. AI Critique feedback (score + detailed review)
2. Side-by-side comparison (Original vs Improved) - IF improvements exist
3. Human-in-loop approval workflow

## 🔄 **User Workflow**

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: Click "Critique" Button                         │
│ → Modal Opens                                           │
│   ┌────────────────────────────────────────────┐       │
│   │ 🤖 AI CRITIQUE                             │       │
│   │ Score: 85/100                              │       │
│   │ "Good question, but could be clearer..."  │       │
│   │                                            │       │
│   │ ⚡ SUGGESTED IMPROVEMENT                   │       │
│   │ Why: "Improved clarity and precision"     │       │
│   │                                            │       │
│   │ ┌──────────┐  ┌──────────┐               │       │
│   │ │ Original │  │ Improved │               │       │
│   │ │  (gray)  │  │ (green)  │               │       │
│   │ └──────────┘  └──────────┘               │       │
│   │                                            │       │
│   │ [Keep Original] [Apply Improvements] ←──  │       │
│   │                    HUMAN DECISION 1       │       │
│   └────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 2: IF "Apply Improvements" clicked                │
│ → Modal closes, question updated                        │
│ → User sees updated question card                       │
│                                                         │
│   [🛡️ Verify] ← HUMAN DECISION 2                       │
│   (Must click to enable Accept)                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Step 3: Click "Verify" button                          │
│ → Shield icon changes, Accept button enabled            │
│                                                         │
│   [✅ Accept] ← HUMAN DECISION 3                        │
│   (Final approval)                                      │
└─────────────────────────────────────────────────────────┘
```

## 🏗️ **Implementation Tasks**

### **Task 1: Update Modal to Show Critique + Comparison**

- **File**: `src/components/ImprovementModal.jsx`
- **Changes**:
  - Add `critiqueText` and `critiqueScore` props
  - Show critique feedback at top (always)
  - Show side-by-side comparison (only if `changesExplanation` exists)
  - Two buttons:
    - "Keep Original" → Close modal, no changes
    - "Apply Improvements" → Update question, close modal (only show if improvements exist)

### **Task 2: Update QuestionItem to Pass Critique Data**

- **File**: `src/components/QuestionItem.jsx`
- **Changes**:
  - Pass `critiqueText={q.critique}` to modal
  - Pass `critiqueScore={q.critiqueScore}` to modal
  - Modal opens when badge clicked OR when critique completes

### **Task 3: Auto-Open Modal After Critique**

- **File**: `src/hooks/useGeneration.js`
- **Changes**:
  - When `handleCritique` completes, set a flag to auto-open modal
  - OR: Make the badge auto-click after critique completes

### **Task 4: Ensure Human-in-Loop**

- **Verify existing workflow**:
  - ✅ Modal button: "Apply Improvements" (HUMAN DECISION 1)
  - ✅ Card button: "Verify" (HUMAN DECISION 2)
  - ✅ Card button: "Accept" (HUMAN DECISION 3)
- **Three separate human clicks required** ✅

## 📋 **Modal Content Structure**

```
┌───────────────────────────────────────────────────────┐
│ 🤖 AI Critique                      Score: 85/100     │
├───────────────────────────────────────────────────────┤
│ [AI Critique Feedback Text - Always Shown]           │
│ "The question is good but could be more precise..."   │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│ ⚡ Suggested Improvement                              │
├───────────────────────────────────────────────────────┤
│ 💡 Why: "Improved clarity and precision"             │
│                                                       │
│ ┌─────────────────────┬─────────────────────┐       │
│ │ 📄 Original (85)    │ ✅ Improved (90)    │       │
│ ├─────────────────────┼─────────────────────┤       │
│ │ Question text...    │ Improved text...    │       │
│ │ A) Option A         │ A) Better option A  │       │
│ │ B) Option B         │ B) Better option B  │       │
│ │ C) Option C         │ C) Better option C  │       │
│ │ D) Option D         │ D) Better option D  │       │
│ │ #tag1 #tag2         │ #tag1 #tag2 #tag3   │       │
│ └─────────────────────┴─────────────────────┘       │
└───────────────────────────────────────────────────────┘

[Keep Original]  [Apply Improvements]
```

## ✅ **Acceptance Criteria**

1. ✅ Modal shows critique feedback (score + text) **always**
2. ✅ Modal shows side-by-side comparison **only if improvements exist**
3. ✅ "Apply Improvements" button **only appears if improvements exist**
4. ✅ Three human decisions required:
   - Decision 1: "Apply Improvements" in modal
   - Decision 2: "Verify" on card
   - Decision 3: "Accept" on card
5. ✅ Modal closes after "Keep Original" or "Apply Improvements"
6. ✅ Question card shows updated content after "Apply Improvements"
7. ✅ NO auto-accept anywhere in the flow

## 🔍 **Testing Checklist**

- [ ] Click "Critique" → Modal opens showing feedback
- [ ] Modal shows score (colored: green ≥90, yellow ≥70, red <70)
- [ ] Modal shows critique text
- [ ] IF improvements: Side-by-side shown
- [ ] IF improvements: "Apply Improvements" button shown
- [ ] IF no improvements: Only "Close" button shown
- [ ] Click "Apply Improvements" → Question updates, modal closes
- [ ] Click "Verify" → Shield changes, Accept enabled
- [ ] Click "Accept" → Status changes to "accepted"
- [ ] Workflow requires 3 separate human clicks ✅
