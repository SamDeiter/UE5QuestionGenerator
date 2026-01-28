# Firebase Hardening Implementation Plan

**Created:** 2026-01-28
**Status:** PENDING APPROVAL
**Estimated Time:** 3-4 hours across 3 phases

---

## Overview

This plan addresses all security, reliability, and performance issues identified in the Firebase audit. Issues are grouped into phases by dependency and risk level.

---

## Phase 1: Critical Security Fixes (P0) ⏱️ ~45 min

These must be fixed first - they represent active vulnerabilities or data integrity risks.

### 1.1 Fix Race Condition in `consumeInvite.js`

**File:** `functions/invites/consumeInvite.js`
**Risk:** Two users can consume the last seat of a limited invite simultaneously

**Changes:**

- Wrap lines 38-153 in a Firestore transaction
- Move all invite validation, update, and user registration into atomic operation
- Add explicit locking on invite document during consumption

**Test Plan:**

- Simulate concurrent consumption with Cloud Functions emulator
- Verify maxUses enforcement

---

### 1.2 Fix Version Increment Rule

**File:** `config/firestore/firestore.rules`
**Risk:** Client can skip versions (5 → 999999), breaking audit trail

**Changes:**

```diff
- function versionNotRegressing() {
-   return !resource.data.keys().hasAny(['version']) || 
-          request.resource.data.version > resource.data.version;
- }
+ function versionIsIncremented() {
+   return !resource.data.keys().hasAny(['version']) || 
+          request.resource.data.version == resource.data.version + 1;
+ }
```

- Update all references to use `versionIsIncremented()`

**Test Plan:**

- Write Firebase Rules unit test to verify version increment enforcement
- Test that version skip is rejected

---

### 1.3 Add Field Validation to apiUsage Collection

**File:** `config/firestore/firestore.rules`
**Risk:** Users can spam with arbitrary data

**Changes:**

```javascript
match /apiUsage/{docId} {
  allow create: if isSignedIn()
    && request.resource.data.keys().hasAll(['userId', 'timestamp', 'type'])
    && request.resource.data.userId == request.auth.uid
    && request.resource.data.type in ['generation', 'critique'];
}
```

**Test Plan:**

- Verify legitimate API usage logging still works
- Verify malformed payloads are rejected

---

## Phase 2: Performance & Cost Optimization (P1) ⏱️ ~90 min

These reduce operational costs and improve scalability.

### 2.1 Add Custom Claims for Role Checks

**Files:**

- `functions/invites/consumeInvite.js`
- `functions/users/changeUserRole.js`
- `config/firestore/firestore.rules`

**Problem:** Every rule evaluation does 2-4 document reads for role checking
**Solution:** Store role in Firebase Auth custom claims, eliminating reads

**Changes:**

**A) Update consumeInvite.js:**

```javascript
// After creating registeredUsers entry, add:
await admin.auth().setCustomUserClaims(userId, { 
  role: invite.role || 'reviewer',
  tools: grantedTools 
});
```

**B) Update changeUserRole.js:**

```javascript
// After updating registeredUsers role, sync claims:
await admin.auth().setCustomUserClaims(userId, { role: newRole });
```

**C) Update firestore.rules:**

```javascript
// Simplified role checks (no document reads!)
function isAdmin() {
  return request.auth.token.role == 'admin' 
    || request.auth.token.email == 'sam.deiter@epicgames.com';
}

function isReviewer() {
  return request.auth.token.role == 'reviewer' || isAdmin();
}
```

**Backward Compatibility:**

- Keep fallback to `registeredUsers` for existing users until they re-authenticate
- Add migration function to backfill claims for all existing users

**Test Plan:**

- New user registration sets claims
- Existing user role change updates claims
- Rules work with claims-based auth

---

### 2.2 Create Composite Indexes

**File:** `config/firestore/firestore.indexes.json` (new file)

**Changes:**
Create file with indexes for common query patterns:

- `questions` by `status` + `firestoreUpdatedAt`
- `questions` by `creatorId` + `firestoreUpdatedAt`
- `apiUsage` by `userId` + `timestamp`

**Deployment:**

```bash
firebase deploy --only firestore:indexes
```

**Test Plan:**

- Verify queries don't throw "index required" errors
- Check Firebase Console for index build status

---

### 2.3 Optimize Rate Limiting (Replace Unbounded Query)

**File:** `functions/utils/rateLimit.js`
**Problem:** Query scans O(n) documents where n = user's request history
**Solution:** Use counter document with sliding window

**Changes:**
Replace scan-based rate limiting with counter-based:

```javascript
async function checkRateLimit(userId, type = "generation") {
  const db = admin.firestore();
  const counterRef = db.collection("rateLimits").doc(`${userId}_${type}`);
  const WINDOW_MS = 60 * 1000;
  const LIMITS = { generation: 10, critique: 20 };
  const limit = LIMITS[type] || 10;
  const now = Date.now();

  return db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    const data = doc.exists ? doc.data() : { windowStart: now, count: 0 };
    
    // Reset window if expired
    if (now - data.windowStart > WINDOW_MS) {
      t.set(counterRef, { windowStart: now, count: 1 });
      return { allowed: true };
    }
    
    if (data.count >= limit) {
      return { allowed: false, message: `Rate limit: ${limit}/${type}/min` };
    }
    
    t.update(counterRef, { count: admin.firestore.FieldValue.increment(1) });
    return { allowed: true };
  });
}
```

**Add Firestore rule:**

```javascript
match /rateLimits/{docId} {
  allow read, write: if false; // Cloud Functions only
}
```

**Test Plan:**

- Verify rate limiting still works
- Verify counter resets after 60 seconds

---

### 2.4 Restrict Reviewer Field Access

**File:** `config/firestore/firestore.rules`
**Problem:** Reviewers can modify question content (security risk)
**Solution:** Split allowed fields into content vs review categories

**Changes:**

```javascript
// Reviewer override: Can update REVIEW fields only (not content)
(isReviewer()
 && request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly([
      // Version and timestamps
      'version', 'updatedAt', 'firestoreUpdatedAt', 'modifiedAt',
      // Scoring fields
      'aiScore', 'scoredAt', 'scoreSource', 
      // Status and rejection fields
      'status', 'rejectionReason', 'rejectionCategory', 'rejectionNotes', 
      'rejectedAt', 'rejectedBy', 'acceptedAt', 'acceptedBy',
      // Review tracking fields
      'reviewedBy', 'reviewedAt', 'reviewCompletedAt', 
      'reviewerName', 'reviewDuration', 'reviewStartedAt',
      // Critique fields (AI-generated, not content)
      'critique', 'critiqueScore', 'suggestedRewrite', 'improvedScore',
      'critiqueAttempts', 'previousCritiqueScore',
      // Human verification fields
      'humanVerified', 'humanVerifiedBy', 'humanVerifiedAt',
      // Kick back fields
      'kickedBackAt', 'kickedBackBy', 'kickedBackReason',
      // Tags and difficulty
      'tags', 'difficulty',
      // Backfill metadata
      '_backfilledHumanVerified', '_backfilledAt', 'tagsBackfilledAt',
      // Notes
      'notes'
    ]))
```

**REMOVED from reviewer access:**

- `question`, `options`, `correct`, `correctLetter` (content fields)
- `improvementsApplied`, `rewriteChanges` (content modification)
- `originalVersion`, `versionSource`, `lastEditedBy`, `lastEditedAt`

**Impact Assessment:**

- Reviewers can still accept/reject
- Reviewers can still run critique (AI suggestions)
- Reviewers CANNOT apply rewrites or edit content directly
- Admins can do everything

**Test Plan:**

- Verify reviewer can accept/reject
- Verify reviewer cannot change question text
- Verify admin can change question text

---

## Phase 3: Operational Improvements (P2-P3) ⏱️ ~60 min

These improve long-term maintainability.

### 3.1 Add Audit Log TTL (Scheduled Cleanup)

**File:** `functions/maintenance/cleanupAuditLogs.js` (new file)

**Changes:**
Create scheduled Cloud Function to delete audit logs older than 90 days:

```javascript
exports.cleanupAuditLogs = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const snapshot = await db.collection("audit-log")
      .where("timestamp", "<", cutoff)
      .limit(500) // Batch to avoid timeout
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    
    console.log(`Cleaned up ${snapshot.size} old audit log entries`);
  });
```

**Test Plan:**

- Run manually via Firebase Console
- Verify old logs are deleted

---

### 3.2 Add Backfill Cloud Function for Custom Claims

**File:** `functions/migrations/backfillCustomClaims.js` (new file)

**Purpose:** One-time migration to set custom claims for existing users

**Changes:**

```javascript
exports.backfillCustomClaims = functions.https.onCall(async (data, context) => {
  // Admin only
  if (!context.auth?.token?.role === 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  
  const users = await db.collection("registeredUsers").get();
  let updated = 0;
  
  for (const doc of users.docs) {
    const { role, tools } = doc.data();
    await admin.auth().setCustomUserClaims(doc.id, { role, tools });
    updated++;
  }
  
  return { success: true, updated };
});
```

**Test Plan:**

- Run once from Admin Panel
- Verify users have claims after re-login

---

### 3.3 Add Training Data Rate Limiting

**File:** `config/firestore/firestore.rules`
**Problem:** Unbounded writes to training_data collection

**Changes:**

```javascript
match /training_data/{docId} {
  allow read: if isAdmin();
  allow create: if isSignedIn() && (isAdmin() || isReviewer())
    && request.resource.data.keys().hasAll(['questionId', 'original', 'corrected', 'createdBy', 'createdAt'])
    && request.resource.data.createdBy == request.auth.token.email;
}
```

Note: True rate limiting would require a Cloud Function wrapper.

---

## Deployment Checklist

### Pre-Deployment

- [ ] All changes committed to feature branch
- [ ] Manual testing in emulator complete
- [ ] Security rules validated locally

### Deployment Order

1. **Deploy Cloud Functions first** (custom claims, rate limiting)

   ```bash
   firebase deploy --only functions
   ```

2. **Run backfill migration** (one-time)
   - Call `backfillCustomClaims` from Admin Panel

3. **Deploy Firestore indexes**

   ```bash
   firebase deploy --only firestore:indexes
   ```

4. **Deploy Firestore rules**

   ```bash
   firebase deploy --only firestore:rules
   ```

### Post-Deployment Verification

- [ ] New user registration works
- [ ] Existing users can still edit (after token refresh)
- [ ] Rate limiting functions correctly
- [ ] Reviewer restrictions enforced
- [ ] No "index required" errors in console

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Custom claims migration | Medium - Existing users lose access until re-login | Keep fallback rule for 30 days |
| Version increment strictness | Low - May break if version skipped | Monitor logs, can revert rules quickly |
| Reviewer field restrictions | Medium - May break "Apply Rewrite" for reviewers | Communicate change to team, verify workflow |
| Rate limit refactor | Low - Same behavior, different implementation | Test in emulator first |

---

## Rollback Plan

Each phase can be rolled back independently:

1. **Rules:** `firebase deploy --only firestore:rules` with previous version
2. **Functions:** `firebase deploy --only functions` with previous version  
3. **Indexes:** Cannot be removed, but don't break anything

---

## Approval Required

Please review this plan and confirm:

1. ✅ Accept all changes as proposed, OR
2. 🔄 Modify specific items (tell me which), OR
3. ❌ Reject and discuss alternatives

Once approved, I will implement Phase 1 first, then Phase 2, then Phase 3.
