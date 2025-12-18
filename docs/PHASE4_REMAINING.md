# 🚀 Phase 4 UI Integration - Remaining Tasks

**Current Status**: 75% Complete  
**Date**: December 18, 2025 @ 4:00 PM

---

## ✅ **Completed (Today)**

1. ✅ **`useEditLock` Hook** (`src/hooks/useEditLock.js`)
   - Auto-acquire lock on edit start
   - Heartbeat renewal every 20 seconds
   - Auto-release on unmount
   - Lock status tracking

2. ✅ **`ConflictModal` Component** (`src/components/ConflictModal.jsx`)
   - 3 resolution options (Discard, Overwrite, View Diff)
   - Side-by-side change comparison
   - Styled with Tailwind

3. ✅ **Agent Initialization** (`src/App.jsx`)
   - Agents initialized after user authentication
   - Firestore instance passed to agents

---

## ⬜ **Remaining Work (2-3 hours)**

### Task 1: Update `QuestionItem.jsx` to Show Lock Status

**File**: `src/components/QuestionItem.jsx`

**Changes Needed**:

1. Import `useEditLock` hook
2. Call hook with question ID, user info, and `isEditing` state
3. Show lock banner when `isLocked`:

   ```jsx
   {isLocked && (
     <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 mb-4">
       <Icon name="lock" />
       <span>Locked by {lockedBy?.userEmail}</span>
     </div>
   )}
   ```

4. Disable edit buttons when locked by another user

**Estimated Time**: 30 minutes

---

### Task 2: Update `useQuestionManager.js` to Use Save Guard

**File**: `src/hooks/useQuestionManager.js`

**Changes Needed**:

1. Import agents: `import { getAgents } from '../agents'`
2. Track `baseVersion` for each question in state
3. Replace direct Firestore `updateDoc()` calls with:

   ```javascript
   const { saveGuardAgent } = getAgents();
   const result = await saveGuardAgent.saveQuestion(
     questionId,
     updates,
     baseVersion,
     userId,
     userEmail
   );
   
   if (!result.success) {
     if (result.errorType === 'VERSION_CONFLICT') {
       // Show conflict modal
       setConflictData({
         serverQuestion: ...,
         serverVersion: ...,
         localChanges: updates,
         expectedVersion: baseVersion
       });
       setShowConflictModal(true);
     }
   }
   ```

4. Add conflict modal state management
5. Pass `onResolve` handler to ConflictModal

**Estimated Time**: 1-1.5 hours

---

### Task 3: Update `handleUpdateStatus` (Accept/Reject)

**File**: Likely in `useQuestionManager.js` or `useReviewActions.js`

**Changes Needed**:

1. Replace direct Firestore writes with:

   ```javascript
   const { saveGuardAgent } = getAgents();
   const result = await saveGuardAgent.saveQuestionStatus(
     questionId,
     status, // 'accepted' | 'rejected'
     baseVersion,
     userId,
     userEmail,
     { rejectionReason, reviewedBy, reviewedAt } // additional data
   );
   ```

2. Handle version conflicts during status changes

**Estimated Time**: 30 minutes

---

### Task 4: Add ConflictModal to Global Modals

**File**: `src/components/GlobalModals.jsx` (or wherever modals are managed)

**Changes Needed**:

1. Import `ConflictModal`
2. Add conflict modal state to modal visibility object
3. Render ConflictModal with conflict data and resolve handler

**Estimated Time**: 15 minutes

---

### Task 5: Manual Testing

**Two-Tab Concurrent Editing Test**:

1. Open two browser tabs (different sessions via incognito)
2. Sign in as two different reviewers
3. Both open the same question
4. Reviewer A clicks "Edit"
5. **Verify**: Reviewer B sees "Locked by <reviewer.a@example.com>"
6. Reviewer A saves changes
7. **Verify**: Lock is released, Reviewer B can now edit

**Version Conflict Test**:

1. Reviewer A loads Question #42 (version 5)
2. Admin manually updates Question #42 to version 6 in Firestore console
3. Reviewer A tries to save
4. **Verify**: Conflict modal appears with 3 options
5. Reviewer A clicks "Reload" → Question reloads at version 6

**Estimated Time**: 30 minutes

---

## 📊 **Overall Phase 4 Progress**

| Task | Status | Time |
|------|--------|------|
| `useEditLock` hook | ✅ Done | ~1h |
| `ConflictModal` component | ✅ Done | ~1h |
| Agent initialization | ✅ Done | ~15m |
| Update `QuestionItem` | ⬜ TODO | ~30m |
| Update `useQuestionManager` | ⬜ TODO | ~1.5h |
| Update `handleUpdateStatus` | ⬜ TODO | ~30m |
| Add to GlobalModals | ⬜ TODO | ~15m |
| Manual testing | ⬜ TODO | ~30m |

**Total**: 75% Complete (3.25h done, 3.5h remaining)

---

## 🎯 **Quick Start Guide for Next Session**

### Step 1: Find QuestionItem Component

```bash
# Search for QuestionItem.jsx
find src/components -name "QuestionItem.jsx"
```

### Step 2: Add useEditLock Integration

See Task 1 above for specific code changes.

### Step 3: Find useQuestionManager Hook

```bash
# Search for useQuestionManager.js
find src/hooks -name "useQuestionManager.js"
```

### Step 4: Replace Firestore Writes

See Task 2 above for specific code changes.

### Step 5: Test

Open two browser tabs and follow manual testing steps above.

---

## 📚 **Key Files to Modify**

- `src/components/QuestionItem.jsx` - Show lock status
- `src/hooks/useQuestionManager.js` - Use Save Guard Agent
- `src/hooks/useReviewActions.js` - Update status changes (if separate)
- `src/components/GlobalModals.jsx` - Add ConflictModal

---

## 🚨 **Important Notes**

1. **Don't delete old Firestore write code yet** - Keep it as fallback until testing is complete
2. **Test with real database** - Don't test with production data
3. **Run migration script first** - All questions need `version: 1`
4. **Deploy Firestore rules** - Security rules must be updated

---

**Last Updated**: December 18, 2025 @ 4:00 PM  
**Next Update**: After Phase 4 completion
