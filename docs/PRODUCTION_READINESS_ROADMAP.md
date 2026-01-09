# Production Readiness Roadmap: Reviewer Question Review System

**Current Version**: 2.2.10+  
**Last Updated**: January 9, 2026  
**Status**: ✅ **ALL CRITICAL ITEMS COMPLETE**

---

## 🎉 Roadmap Complete

> **All concurrent editing protection has been implemented.** The critical gaps identified below have been resolved. This document is now historical reference.

**Completed Features:**

- ✅ Six-Agent Architecture (Session, Lock, Load, SaveGuard, ConflictResolver, Audit)
- ✅ useEditLock Hook (413 lines)
- ✅ ConflictModal Component (277 lines)
- ✅ Firestore Security Rules with version control
- ✅ SCORM 1.2 Export

---

## ✅ Already Production-Ready (Implemented)

### 1. **Authentication & Authorization** ✅

- ✅ Firebase Authentication (Google OAuth)
- ✅ Role-based access control (Admin, Reviewer)
- ✅ Invite-only registration system
- ✅ Email invite automation via SendGrid
- ✅ Permissions enforcement in UI (tabs hidden for reviewers)

**Status**: **READY**

### 2. **Core Review Workflow** ✅

- ✅ Review Mode UI with Critique, Accept, Reject
- ✅ AI-powered critique system (7-model fallback)
- ✅ Rejection reason tracking
- ✅ Database View for browsing questions
- ✅ Analytics dashboard
- ✅ Multi-language support (10+ languages)
- ✅ Question editing UI

**Status**: **READY**

### 3. **Data Persistence** ✅

- ✅ Cloud Firestore backend
- ✅ Real-time sync
- ✅ Audit logging (reviewer activity tracking)

**Status**: **READY**

### 4. **Security** ✅

- ✅ API keys secured via Firebase Cloud Functions
- ✅ XSS prevention (DOMPurify)
- ✅ Input validation
- ✅ Environment variable management (`.env`)
- ✅ No sensitive data in git

**Status**: **READY**

### 5. **Documentation** ✅

- ✅ Reviewer Guide (`REVIEWER_GUIDE.md`)
- ✅ Email invite template (`REVIEWER_INVITE_EMAIL.md`)
- ✅ Scoring rubric (`SCORING_RUBRIC.md`)
- ✅ Analytics documentation (`REVIEWER_ANALYTICS_SUMMARY.md`)

**Status**: **READY**

---

## ⚠️ Critical Gaps: Concurrent Editing Protection (NOT Implemented)

### **Risk**: Silent Data Overwrites

**Scenario**:

1. **Reviewer Alice** opens Question #42 at 2:00 PM (version 5).
2. **Reviewer Bob** opens Question #42 at 2:01 PM (version 5).
3. Alice critiques and accepts the question at 2:05 PM (saved as version 6).
4. Bob (still viewing version 5) rejects the question at 2:06 PM.
5. **Bob's rejection silently overwrites Alice's acceptance** ❌

**Current State**: Your Firestore writes do **NOT** use version checking or transactions.

**Impact**: High risk of data loss and reviewer frustration.

---

## 🚨 Priority 1: Implement Concurrent Editing Protection (REQUIRED)

**Timeline**: 2-3 days  
**Complexity**: Medium-High  
**Risk if skipped**: **Critical** - Data integrity failures

### Implementation Checklist

Using the design from `CONCURRENT_EDITING_DESIGN.md`:

#### Phase 1: Add Version Field to Questions (2 hours)

- [ ] Add `version: 1` to all existing questions in Firestore
  - Write a migration script to update all questions
- [ ] Update `src/utils/firebase.js` to include `version` in `addQuestion()`
- [ ] Ensure all new questions start with `version: 1`

#### Phase 2: Implement the Six Agents (8 hours)

Create new directory: `src/agents/`

- [ ] **Session Agent** (`src/agents/sessionAgent.js`)
  - Generates unique session ID per browser tab (UUID in `sessionStorage`)
  
- [ ] **Lock Agent** (`src/agents/lockAgent.js`)
  - `acquireLock(questionId)` - Try to acquire edit lock
  - `renewLock(questionId)` - Heartbeat every 20 seconds
  - `releaseLock(questionId)` - Delete lock on save/cancel
  
- [ ] **Load Agent** (`src/agents/loadAgent.js`)
  - `loadQuestion(questionId)` - Fetch question and record `baseVersion`
  
- [ ] **Save Guard Agent** (`src/agents/saveGuardAgent.js`)
  - `saveQuestion(questionId, updates, expectedVersion)` - Transaction-based save
  - Validates: lock ownership, version match, then writes
  
- [ ] **Conflict Resolver Agent** (`src/agents/conflictResolverAgent.js`)
  - `handleConflict()` - Show conflict modal
  - `overwriteServerChanges()` - Force overwrite option
  - `discardLocalChanges()` - Reload latest version
  
- [ ] **Audit Agent** (`src/agents/auditAgent.js`)
  - `logEvent(eventType, questionId, details)` - Write to `/audit-log`

#### Phase 3: Create Edit Lock Collection (1 hour)

- [ ] Create Firestore collection: `/edit-locks/{questionId}`
- [ ] Schema:

  ```javascript
  {
    sessionId: string,
    userId: string,
    userEmail: string,
    acquiredAt: timestamp,
    expiresAt: timestamp,  // acquiredAt + 60s
    lastHeartbeat: timestamp,
    lockVersion: number,
    isActive: boolean
  }
  ```

#### Phase 4: Update Review Mode UI (4 hours)

- [ ] **When user clicks "Edit" on a question**:
  1. Call `lockAgent.acquireLock(questionId)`
  2. If success: Show edit mode
  3. If fail: Show read-only mode with message: *"Being edited by [user@email.com]"*
  
- [ ] **Start heartbeat** when editing:

  ```javascript
  useEffect(() => {
    const heartbeat = setInterval(() => {
      lockAgent.renewLock(questionId);
    }, 20000); // 20 seconds
    return () => clearInterval(heartbeat);
  }, [isEditing]);
  ```
  
- [ ] **On Save**:
  1. Call `saveGuardAgent.saveQuestion(questionId, updates, baseVersion)`
  2. If success: Show toast, release lock
  3. If version conflict: Show Conflict Modal
  
- [ ] **On Cancel**:
  1. Call `lockAgent.releaseLock(questionId)`
  2. Discard changes

#### Phase 5: Add Conflict Resolution Modal (3 hours)

- [ ] Create `<ConflictModal />` component
- [ ] Show three options:
  - **Reload and Discard** (safe, recommended)
  - **Overwrite Server Changes** (dangerous, admin-only?)
  - **Manual Merge** (advanced)
- [ ] Implement each resolution path

#### Phase 6: Deploy Firestore Security Rules (1 hour)

- [ ] Copy rules from `CONCURRENT_EDITING_DESIGN.md` section 5
- [ ] Add version regression check:

  ```javascript
  function versionNotRegressing() {
    return request.resource.data.version > resource.data.version;
  }
  ```

- [ ] Deploy: `firebase deploy --only firestore:rules`

#### Phase 7: Testing (4 hours)

- [ ] **Unit tests** for each agent
- [ ] **Integration test**: Open two browser tabs, both edit same question
- [ ] **Lock expiration test**: Acquire lock, close tab, verify new tab can steal lock after 60s
- [ ] **Version conflict test**: Manually update question in Firestore, verify save is rejected

**Total Estimated Time**: **~24 hours** (3 days part-time)

---

## 🟡 Priority 2: Enhanced Monitoring & Observability (RECOMMENDED)

**Timeline**: 1 day  
**Complexity**: Low  
**Risk if skipped**: Medium - Harder to debug issues

### Checklist

- [ ] **Firestore Security Rules** for audit log
  - Prevent updates/deletes (immutable log)
  - Allow reads for admins only
  
- [ ] **Admin Panel: Lock Manager**
  - Show all active locks
  - Allow admin to force-release locks
  - Display lock expiration times
  
- [ ] **Admin Panel: Audit Log Viewer**
  - Filter by event type (lock_acquired, save_conflict, etc.)
  - Show last 100 events
  - Export to CSV
  
- [ ] **Error Tracking Integration** (Optional)
  - Add Sentry or similar for production error logging
  - Track version conflict rate
  
- [ ] **Performance Monitoring**
  - Firebase Performance Monitoring SDK
  - Track review workflow completion time

---

## 🟢 Priority 3: User Experience Improvements (NICE TO HAVE)

**Timeline**: 2 days  
**Complexity**: Medium  
**Risk if skipped**: Low - No data integrity risk

### Checklist

- [ ] **Real-Time Lock Status Notifications**
  - Use Firestore `onSnapshot()` to listen to `/edit-locks/{questionId}`
  - Show toast when lock becomes available: *"Question is now available for editing"*
  
- [ ] **Lock Queue System**
  - Allow reviewers to "request to edit" a locked question
  - Notify when it's their turn
  
- [ ] **Improved Conflict Modal UX**
  - Show side-by-side diff of local vs. server changes
  - Highlight changed fields
  
- [ ] **Session Recovery**
  - Store draft edits in `localStorage`
  - If tab crashes and user returns, show: *"You have unsaved changes. Restore?"*
  
- [ ] **Bulk Review Actions**
  - Allow reviewer to accept/reject multiple questions at once
  - Show lock status for each question in list view

---

## 📊 Testing & Validation Checklist

Before inviting reviewers:

### Manual QA

- [ ] **Single Reviewer Flow** (Baseline)
  - [ ] Reviewer can sign in with invite link
  - [ ] Reviewer sees only Review, Database, Analytics tabs
  - [ ] Reviewer can critique, accept, reject questions
  - [ ] All actions save to Firestore correctly
  
- [ ] **Concurrent Editing Flow** (Critical)
  - [ ] Open two browser tabs with different reviewers
  - [ ] Reviewer A acquires lock on Question #1
  - [ ] Reviewer B tries to edit Question #1 → sees "locked by A"
  - [ ] Reviewer A saves changes
  - [ ] Reviewer B can now acquire lock
  
- [ ] **Conflict Detection** (Critical)
  - [ ] Reviewer A loads Question #1 (version 5)
  - [ ] Admin manually updates Question #1 to version 6 in Firestore
  - [ ] Reviewer A tries to save → sees conflict modal
  - [ ] Reviewer A can reload or overwrite
  
- [ ] **Lock Expiration** (Important)
  - [ ] Reviewer acquires lock
  - [ ] Wait 60 seconds (or close tab)
  - [ ] Different reviewer can acquire lock
  - [ ] Lock is deleted from Firestore
  
- [ ] **Heartbeat Renewal** (Important)
  - [ ] Reviewer edits question for 3 minutes
  - [ ] Lock is renewed every 20 seconds
  - [ ] Lock does not expire during active editing

### Automated Tests

- [ ] Unit tests for all agent methods
- [ ] Integration test: Concurrent user simulation
- [ ] End-to-end test: Full review workflow

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Firestore Security Rules deployed
- [ ] Firebase Cloud Functions deployed (if updated)
- [ ] Version number incremented: `2.3.0` (semver: minor = new feature)
- [ ] `CHANGELOG.md` updated

### Deployment Steps

1. [ ] **Run build**:

   ```bash
   npm run build
   ```

2. [ ] **Test production build locally**:

   ```bash
   npm run preview
   ```

3. [ ] **Deploy to GitHub Pages**:

   ```bash
   npm run deploy
   ```

4. [ ] **Verify production deployment**:
   - [ ] Visit `https://samdeiter.github.io/UE5QuestionGenerator/`
   - [ ] Check version number in footer: `v2.3.0`
   - [ ] Test lock acquisition
   - [ ] Test conflict detection
   - [ ] Check browser console for errors

### Post-Deployment

- [ ] **Monitor Firestore**:
  - Watch for spike in `/edit-locks` documents
  - Check for error patterns in console logs
  
- [ ] **Send reviewer communication**:
  - Email all reviewers about new concurrent editing feature
  - Update `REVIEWER_GUIDE.md` with lock/conflict instructions
  
- [ ] **Monitor first 24 hours**:
  - Check audit log for `save_conflict` events
  - Respond to reviewer questions quickly

---

## 📦 Optional Enhancements (Future Backlog)

### 1. **Collaborative Editing (Advanced)**

- Implement Operational Transform (OT) or CRDTs
- Allow multiple reviewers to edit different fields simultaneously
- **Complexity**: Very High
- **Libraries**: ShareDB, Yjs

### 2. **Field-Level Locking**

- Lock individual fields instead of entire question
- Allows Reviewer A to edit tags while Reviewer B edits question text
- **Complexity**: High

### 3. **Review Assignment System**

- Assign specific questions to specific reviewers
- Track review completion rate per reviewer
- Send reminders for pending reviews
- **Complexity**: Medium

### 4. **Mobile Reviewer App**

- Create React Native mobile app for reviewing on-the-go
- **Complexity**: High

---

## 🎓 Training & Documentation Updates Needed

### Update `REVIEWER_GUIDE.md`

Add new sections:

- **Section 13: Understanding Edit Locks**
  - What locks are
  - Why you see "locked by another user"
  - How long locks last (60 seconds)
  
- **Section 14: Handling Conflicts**
  - What version conflicts mean
  - When to reload vs. overwrite
  - Best practices to avoid conflicts
  
- **FAQ Updates**:
  - Q: Why can't I edit this question?
  - Q: What does "version conflict" mean?
  - Q: I closed my tab by accident, did I lose my changes?

### Create New Troubleshooting Guide

`docs/TROUBLESHOOTING.md`:

- Common lock issues
- How to report a stuck lock
- What to do if heartbeat fails

---

## 📋 Summary: What You Need Right Now

### To Launch With Single Reviewer (TODAY)

✅ **You're ready!** Deploy as-is. No changes needed.

### To Launch With 2-3 Concurrent Reviewers (3 DAYS)

🚨 **Implement Priority 1** (Concurrent Editing Protection)

- Add version field to questions
- Implement the 6 agents
- Create edit lock collection
- Update Review Mode UI
- Deploy Firestore Security Rules
- Test with 2 browser tabs

### To Launch With 10+ Concurrent Reviewers (1 WEEK)

🟡 **Add Priority 2** (Monitoring & Observability)

- Admin lock manager
- Audit log viewer
- Error tracking
- Performance monitoring

---

## 🎯 Recommended Immediate Action Plan

### This Week (Dec 18-20)

**Day 1 (Thursday)**:

- [ ] Add `version` field to all questions (migration script)
- [ ] Implement Session Agent
- [ ] Implement Lock Agent (acquire/renew/release)

**Day 2 (Friday)**:

- [ ] Implement Load Agent
- [ ] Implement Save Guard Agent
- [ ] Create `/edit-locks` collection schema

**Day 3 (Saturday)**:

- [ ] Update Review Mode UI (lock acquisition on edit)
- [ ] Add heartbeat interval
- [ ] Create Conflict Modal component
- [ ] Deploy Firestore Security Rules

**Day 4 (Sunday)**:

- [ ] Testing: Two-tab concurrent editing
- [ ] Testing: Version conflict detection
- [ ] Testing: Lock expiration
- [ ] Fix any bugs found

**Day 5 (Monday)**:

- [ ] Deploy to production
- [ ] Invite first 2-3 beta reviewers
- [ ] Monitor for 24 hours
- [ ] Collect feedback

---

## ✅ Production Launch Criteria

You can confidently launch when:

1. ✅ **Version control implemented** - All saves check expected version
2. ✅ **Edit locks working** - Users cannot overwrite each other's edits
3. ✅ **Conflict modal shows** - Users see clear options when conflicts occur
4. ✅ **Security rules deployed** - Firestore rules prevent version regression
5. ✅ **Two-tab test passes** - Concurrent editing works in multiple tabs
6. ✅ **Lock expiration works** - Closed tabs don't permanently block editing
7. ✅ **Documentation updated** - Reviewer guide explains new features
8. ✅ **At least 1 successful test review** - Real reviewer completes full workflow

---

## 📞 Need Help?

If you want me to implement any of these priorities, just ask! I can:

- Write migration scripts for adding version fields
- Implement all 6 agents
- Create the Conflict Modal UI
- Write comprehensive tests
- Update documentation

**Next Step**: Would you like me to start implementing Priority 1 (Concurrent Editing Protection)?
