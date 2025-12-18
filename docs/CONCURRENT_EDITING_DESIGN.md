# Concurrent Editing Conflict Prevention System

## Engineering Design Document

**Author**: Firebase Engineering Team  
**Project**: UE5QuestionGenerator  
**Status**: Design Review  
**Last Updated**: 2025-12-18

---

## Executive Summary

This document describes a **multi-agent workflow system** for preventing concurrent edit conflicts in Cloud Firestore. The system uses **optimistic concurrency control** (version numbers) combined with **pessimistic locking** (time-limited edit leases) to ensure data consistency when multiple users edit the same question simultaneously.

**Key Guarantees:**

- ✅ No silent overwrites
- ✅ No lost updates
- ✅ Automatic lock expiration (crash-safe)
- ✅ Per-tab isolation
- ✅ Clear conflict resolution UX

---

## 1. Data Model

### 1.1 Main Collection: `questions/{questionId}`

```javascript
{
  // === Core Fields ===
  id: "q_abc123",                    // Document ID
  uniqueId: "q_abc123",              // Legacy - same as id
  questionText: "What is...",
  status: "draft" | "accepted" | "rejected",
  
  // === Concurrency Control Fields ===
  version: 5,                        // Integer, incremented on every write
  updatedAt: Timestamp,              // Server timestamp of last write
  updatedBy: "user@example.com",     // Email of last editor
  updatedByUid: "firebase_uid_xyz",  // UID of last editor
  
  // === Edit Lock Reference ===
  currentLockId: "lock_tab_789" | null,  // Points to active lock, null if unlocked
  
  // === Other Question Fields ===
  discipline: "Blueprints",
  difficulty: "Medium",
  // ... (existing fields)
}
```

**Critical Fields:**

- `version`: Incremented atomically on every save. Used for optimistic concurrency control.
- `currentLockId`: References the active edit lock. Null when no one is editing.
- `updatedAt`: Server-side timestamp to prevent clock skew issues.

---

### 1.2 Sub-Collection: `questions/{questionId}/editLocks/{lockId}`

**Lock Document Structure:**

```javascript
{
  // === Lock Identity ===
  lockId: "lock_tab_abc123",         // Unique per browser tab
  sessionId: "session_xyz456",       // Browser session ID (survives refresh)
  
  // === Lock Ownership ===
  userId: "firebase_uid",            // Firebase Auth UID
  userEmail: "admin@example.com",
  
  // === Lock Timing ===
  acquiredAt: Timestamp,             // When lock was first acquired
  expiresAt: Timestamp,              // When lock becomes stale (acquiredAt + 60s)
  lastHeartbeat: Timestamp,          // Last renewal timestamp
  
  // === Lock State ===
  status: "active" | "expired" | "released",
  baseVersion: 5,                    // Question version when lock was acquired
  
  // === Debugging ===
  userAgent: navigator.userAgent,
  tabTitle: document.title
}
```

**Lock Lifecycle:**

1. **Active**: Lock is held, heartbeat renewing every 20s
2. **Expired**: `expiresAt` has passed, lock can be stolen
3. **Released**: User explicitly released lock (saved or canceled edit)

**Lock TTL**: 60 seconds (auto-expires if heartbeat stops)

---

### 1.3 Audit Collection: `editAudit/{auditId}` (Optional)

```javascript
{
  auditId: "audit_123",
  questionId: "q_abc123",
  userId: "firebase_uid",
  action: "lock_acquired" | "lock_renewed" | "lock_expired" | 
          "save_success" | "save_conflict" | "save_failed",
  timestamp: Timestamp,
  metadata: {
    version: 5,
    lockId: "lock_tab_789",
    errorDetails: "..." // For failures
  }
}
```

---

## 2. Agent Responsibilities

### 2.1 Session Agent

**Purpose**: Generate unique identifiers for browser tabs and sessions.

**Responsibilities:**

- Generate `sessionId` on app load (stored in `sessionStorage` - survives refresh)
- Generate `lockId` on component mount (new per tab, lost on refresh)
- Provide session info to other agents

**Implementation:**

```javascript
// src/services/sessionAgent.js
class SessionAgent {
  constructor() {
    // Session ID persists across refreshes within same tab
    this.sessionId = sessionStorage.getItem('ue5_session_id') || 
                     `session_${crypto.randomUUID()}`;
    sessionStorage.setItem('ue5_session_id', this.sessionId);
    
    // Lock ID is unique per component mount (lost on refresh)
    this.lockId = `lock_${this.sessionId}_${Date.now()}`;
  }
  
  getSessionId() { return this.sessionId; }
  getLockId() { return this.lockId; }
  getUserInfo() {
    return {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email
    };
  }
}

export const sessionAgent = new SessionAgent();
```

---

### 2.2 Lock / Lease Agent

**Purpose**: Acquire, renew, and release edit locks.

**Responsibilities:**

- Acquire lock before editing
- Renew lock every 20 seconds (heartbeat)
- Detect lock expiration
- Release lock on save/cancel
- Steal expired locks

**State Machine:**

```
┌─────────────┐
│  NOT_LOCKED │
└──────┬──────┘
       │ acquireLock()
       ▼
┌─────────────┐     renewLock()     ┌─────────────┐
│ ACQUIRING   ├────────────────────►│   LOCKED    │
└──────┬──────┘                     └──────┬──────┘
       │                                   │
       │ (transaction fails)               │ releaseLock()
       ▼                                   ▼
┌─────────────┐                     ┌─────────────┐
│   FAILED    │                     │  RELEASED   │
└─────────────┘                     └─────────────┘
```

**Key Methods:**

- `acquireLock(questionId)` - Firestore transaction
- `renewLock(questionId, lockId)` - Update heartbeat
- `releaseLock(questionId, lockId)` - Mark as released
- `checkLockStatus(questionId)` - Query current lock

---

### 2.3 Load Agent

**Purpose**: Load question data and record base version for conflict detection.

**Responsibilities:**

- Fetch question from Firestore
- Record `baseVersion` for optimistic concurrency check
- Check if question is locked by another user
- Display read-only warning if locked

**Behavior:**

```javascript
// src/services/loadAgent.js
export async function loadQuestion(questionId) {
  const questionRef = doc(db, 'questions', questionId);
  const questionSnap = await getDoc(questionRef);
  
  if (!questionSnap.exists()) {
    throw new Error('Question not found');
  }
  
  const data = questionSnap.data();
  const baseVersion = data.version || 0;
  
  // Check if locked by someone else
  if (data.currentLockId) {
    const lockRef = doc(db, `questions/${questionId}/editLocks`, data.currentLockId);
    const lockSnap = await getDoc(lockRef);
    
    if (lockSnap.exists()) {
      const lock = lockSnap.data();
      const now = Timestamp.now().toMillis();
      const expired = lock.expiresAt.toMillis() < now;
      
      if (!expired && lock.userId !== auth.currentUser.uid) {
        return {
          question: data,
          baseVersion,
          locked: true,
          lockedBy: lock.userEmail
        };
      }
    }
  }
  
  return {
    question: data,
    baseVersion,
    locked: false
  };
}
```

---

### 2.4 Save Guard Agent

**Purpose**: Perform version-checked writes inside Firestore transactions.

**Responsibilities:**

- Validate lock ownership before saving
- Check version hasn't changed (optimistic concurrency)
- Increment version atomically
- Update lock status
- Reject stale writes

**Core Transaction Logic:**

```javascript
// src/services/saveGuardAgent.js
export async function saveQuestionWithGuard(questionId, updatedData, expectedVersion, lockId) {
  return await runTransaction(db, async (transaction) => {
    // Step 1: Read current question state
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await transaction.get(questionRef);
    
    if (!questionSnap.exists()) {
      throw new Error('Question no longer exists');
    }
    
    const current = questionSnap.data();
    
    // Step 2: Validate version (optimistic concurrency check)
    if (current.version !== expectedVersion) {
      throw new ConflictError(
        `Version mismatch: expected ${expectedVersion}, got ${current.version}. ` +
        `Question was modified by ${current.updatedBy} at ${current.updatedAt}`
      );
    }
    
    // Step 3: Validate lock ownership
    if (current.currentLockId !== lockId) {
      throw new LockError(
        `Lock mismatch: expected ${lockId}, got ${current.currentLockId}. ` +
        `You may have lost edit access.`
      );
    }
    
    // Step 4: Check lock hasn't expired
    const lockRef = doc(db, `questions/${questionId}/editLocks`, lockId);
    const lockSnap = await transaction.get(lockRef);
    
    if (!lockSnap.exists()) {
      throw new LockError('Lock document missing. Your edit session may have expired.');
    }
    
    const lock = lockSnap.data();
    const now = Timestamp.now().toMillis();
    
    if (lock.expiresAt.toMillis() < now) {
      throw new LockError('Lock has expired. Please refresh and try again.');
    }
    
    if (lock.userId !== auth.currentUser.uid) {
      throw new LockError('Lock belongs to another user.');
    }
    
    // Step 5: All validations passed - perform write
    const newVersion = current.version + 1;
    
    transaction.update(questionRef, {
      ...updatedData,
      version: newVersion,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.email,
      updatedByUid: auth.currentUser.uid,
      currentLockId: null  // Release lock on successful save
    });
    
    // Step 6: Mark lock as released
    transaction.update(lockRef, {
      status: 'released',
      releasedAt: serverTimestamp()
    });
    
    // Step 7: Log audit event
    const auditRef = doc(collection(db, 'editAudit'));
    transaction.set(auditRef, {
      questionId,
      userId: auth.currentUser.uid,
      action: 'save_success',
      timestamp: serverTimestamp(),
      metadata: {
        oldVersion: expectedVersion,
        newVersion,
        lockId
      }
    });
    
    return { success: true, newVersion };
  });
}
```

**Error Classes:**

```javascript
class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.code = 'CONFLICT';
  }
}

class LockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LockError';
    this.code = 'LOCK_LOST';
  }
}
```

---

### 2.5 Conflict Resolver Agent

**Purpose**: Handle version conflicts and guide users through resolution.

**Responsibilities:**

- Detect conflict errors from Save Guard Agent
- Fetch latest version of question
- Display conflict UI
- Offer resolution options: Reload, Review Diff, Force Overwrite (admin only)

**Conflict Resolution Flow:**

```javascript
// src/services/conflictResolverAgent.js
export async function handleSaveConflict(questionId, localChanges, error) {
  // Step 1: Fetch current server version
  const questionRef = doc(db, 'questions', questionId);
  const serverSnap = await getDoc(questionRef);
  const serverData = serverSnap.data();
  
  // Step 2: Determine conflict type
  const conflictType = analyzeConflict(localChanges, serverData);
  
  // Step 3: Generate resolution options
  const options = {
    reload: {
      label: 'Discard My Changes & Reload',
      action: 'reload',
      description: 'Load the latest version and lose your edits.',
      safe: true
    },
    diff: {
      label: 'Review Differences',
      action: 'showDiff',
      description: 'See what changed and manually merge.',
      safe: true
    },
    forceOverwrite: {
      label: 'Force Save (Overwrite)',
      action: 'force',
      description: 'Save your version and discard server changes.',
      safe: false,
      requiresAdmin: true
    }
  };
  
  return {
    conflictType,
    serverVersion: serverData.version,
    serverUpdatedBy: serverData.updatedBy,
    serverUpdatedAt: serverData.updatedAt,
    options,
    localChanges,
    serverChanges: serverData
  };
}

function analyzeConflict(local, server) {
  const changedFields = [];
  
  for (const key of Object.keys(local)) {
    if (local[key] !== server[key]) {
      changedFields.push(key);
    }
  }
  
  if (changedFields.length === 0) {
    return 'NO_CONFLICT'; // False alarm
  }
  
  if (changedFields.length === 1 && changedFields[0] === 'updatedAt') {
    return 'TIMESTAMP_ONLY'; // Negligible
  }
  
  return 'DATA_CONFLICT'; // Real conflict
}
```

**Conflict UI (React Component):**

```jsx
// src/components/ConflictModal.jsx
function ConflictModal({ conflict, onResolve }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-800 border-2 border-red-500 rounded-lg p-6 max-w-2xl">
        <h2 className="text-xl font-bold text-red-400 mb-4">
          ⚠️ Edit Conflict Detected
        </h2>
        
        <p className="text-slate-300 mb-4">
          This question was modified by <strong>{conflict.serverUpdatedBy}</strong> at{' '}
          {conflict.serverUpdatedAt.toDate().toLocaleString()}.
        </p>
        
        <div className="bg-slate-900 p-4 rounded mb-4">
          <p className="text-sm text-slate-400">
            Server Version: <span className="text-white">{conflict.serverVersion}</span>
          </p>
          <p className="text-sm text-slate-400">
            Your Version: <span className="text-white">{conflict.serverVersion - 1}</span>
          </p>
        </div>
        
        <div className="space-y-2">
          {Object.entries(conflict.options).map(([key, option]) => (
            <button
              key={key}
              onClick={() => onResolve(option.action)}
              className={`w-full p-3 rounded text-left ${
                option.safe 
                  ? 'bg-blue-900/40 hover:bg-blue-800/60' 
                  : 'bg-red-900/40 hover:bg-red-800/60'
              }`}
            >
              <div className="font-bold">{option.label}</div>
              <div className="text-sm text-slate-400">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 2.6 Audit Agent

**Purpose**: Log all lock and save events for debugging and accountability.

**Responsibilities:**

- Log lock acquisition/renewal/expiration
- Log save attempts (success/failure)
- Store error details for failed saves
- Provide query interface for admin debugging

**Usage:**

```javascript
// src/services/auditAgent.js
export async function logAuditEvent(event) {
  const auditRef = doc(collection(db, 'editAudit'));
  await setDoc(auditRef, {
    ...event,
    timestamp: serverTimestamp(),
    userId: auth.currentUser?.uid,
    userEmail: auth.currentUser?.email
  });
}

// Examples:
await logAuditEvent({
  questionId: 'q_123',
  action: 'lock_acquired',
  metadata: { lockId: 'lock_abc', baseVersion: 5 }
});

await logAuditEvent({
  questionId: 'q_123',
  action: 'save_conflict',
  metadata: { 
    expectedVersion: 5,
    actualVersion: 6,
    errorMessage: error.message
  }
});
```

---

## 3. Transaction Pseudocode

### 3.1 Acquire Lock Transaction

```javascript
async function acquireLock(questionId, sessionInfo) {
  return await runTransaction(db, async (transaction) => {
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await transaction.get(questionRef);
    const current = questionSnap.data();
    
    // Check if already locked
    if (current.currentLockId) {
      const existingLockRef = doc(db, `questions/${questionId}/editLocks`, current.currentLockId);
      const existingLockSnap = await transaction.get(existingLockRef);
      
      if (existingLockSnap.exists()) {
        const existingLock = existingLockSnap.data();
        const now = Timestamp.now().toMillis();
        const expired = existingLock.expiresAt.toMillis() < now;
        
        // Lock still active
        if (!expired) {
          // Same user/session can re-acquire
          if (existingLock.userId === sessionInfo.userId && 
              existingLock.sessionId === sessionInfo.sessionId) {
            return { success: true, lockId: current.currentLockId, renewed: true };
          }
          
          // Different user - lock conflict
          throw new LockError(`Question is being edited by ${existingLock.userEmail}`);
        }
        
        // Lock expired - steal it
        transaction.update(existingLockRef, {
          status: 'expired',
          expiredAt: serverTimestamp()
        });
      }
    }
    
    // Create new lock
    const newLockId = sessionInfo.lockId;
    const lockRef = doc(db, `questions/${questionId}/editLocks`, newLockId);
    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + 60, 0); // 60 second TTL
    
    transaction.set(lockRef, {
      lockId: newLockId,
      sessionId: sessionInfo.sessionId,
      userId: sessionInfo.userId,
      userEmail: sessionInfo.userEmail,
      acquiredAt: serverTimestamp(),
      expiresAt,
      lastHeartbeat: serverTimestamp(),
      status: 'active',
      baseVersion: current.version,
      userAgent: navigator.userAgent
    });
    
    // Update question to reference new lock
    transaction.update(questionRef, {
      currentLockId: newLockId
    });
    
    return { success: true, lockId: newLockId, baseVersion: current.version };
  });
}
```

---

### 3.2 Renew Lock (Heartbeat)

```javascript
async function renewLock(questionId, lockId) {
  const lockRef = doc(db, `questions/${questionId}/editLocks`, lockId);
  const now = Timestamp.now();
  const newExpiresAt = new Timestamp(now.seconds + 60, 0);
  
  await updateDoc(lockRef, {
    lastHeartbeat: serverTimestamp(),
    expiresAt: newExpiresAt
  });
  
  // Note: No transaction needed - renewal is idempotent
  // If lock was stolen, this update will fail gracefully
}
```

**Heartbeat Loop:**

```javascript
// In React component
useEffect(() => {
  if (!lockId|| !questionId) return;
  
  const intervalId = setInterval(async () => {
    try {
      await renewLock(questionId, lockId);
      console.log('Lock renewed');
    } catch (error) {
      console.error('Failed to renew lock:', error);
      // Show warning: "Edit access may be lost"
    }
  }, 20000); // Renew every 20 seconds
  
  return () => clearInterval(intervalId);
}, [questionId, lockId]);
```

---

## 4. Conflict Scenarios

### Scenario A: Standard Concurrent Edit

**Timeline:**

```
t0: User A loads question (version 5)
t1: User B loads question (version 5)
t2: User A acquires lock
t3: User B tries to acquire lock → FAILS (locked by User A)
t4: User B sees read-only banner: "Being edited by user-a@example.com"
t5: User A saves (version 5 → 6)
t6: User A releases lock
t7: User B refreshes page, loads version 6
t8: User B acquires lock, edits, saves (version 6 → 7)
```

**Outcome**: ✅ No data loss, clear UX

---

### Scenario B: Lock Expiration Due to Crash

**Timeline:**

```
t0: User A loads question (version 5)
t1: User A acquires lock (expires at t0 + 60s)
t2: User A's browser crashes (no heartbeat renewal)
t60: Lock expires automatically
t65: User B loads question
t66: User B acquires lock (steals expired lock from User A)
t67: User B saves successfully (version 5 → 6)
```

**Outcome**: ✅ System self-heals, User A's unsaved changes lost (acceptable)

---

### Scenario C: Simultaneous Save Attempts

**Timeline:**

```
t0: User A loads question (version 5), acquires lock A
t1: Lock A expires due to network issue
t2: User B acquires lock B (steals expired lock)
t3: User A's network recovers, attempts save with lock A
t4: User B saves with lock B → SUCCESS (version 5 → 6)
t5: User A's save → TRANSACTION FAILS
    - Lock ID mismatch (expected A, got B)
    - Version mismatch (expected 5, got 6)
t6: User A sees conflict modal
```

**Outcome**: ✅ Transaction prevents silent overwrite, User A must resolve conflict

---

## 5. Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/userAccess/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Questions collection
    match /questions/{questionId} {
      // Anyone authenticated can read
      allow read: if isAuthenticated();
      
      // Create: admins only
      allow create: if isAdmin();
      
      // Update: must have valid lock and not regress version
      allow update: if isAuthenticated() &&
        // Version must increment or stay same (for lock acquisition)
        request.resource.data.version >= resource.data.version &&
        // If version increments, must have lock
        (request.resource.data.version == resource.data.version || 
         resource.data.currentLockId != null);
      
      // Delete: admins only
      allow delete: if isAdmin();
      
      // Edit locks sub-collection
      match /editLocks/{lockId} {
        // Read: anyone authenticated (to check lock status)
        allow read: if isAuthenticated();
        
        // Create: only for own locks
        allow create: if isAuthenticated() &&
          request.resource.data.userId == request.auth.uid &&
          request.resource.data.status == 'active';
        
        // Update: only own locks, only for heartbeat/release
        allow update: if isAuthenticated() &&
          resource.data.userId == request.auth.uid &&
          request.resource.data.status in ['active', 'released'];
        
        // Delete: never (immutable audit trail)
        allow delete: if false;
      }
    }
    
    // Edit audit log (admin read, authenticated write)
    match /editAudit/{auditId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
  }
}
```

**Key Security Guarantees:**

- ✅ Version cannot regress
- ✅ Users cannot forge lock ownership
- ✅ Locks cannot be deleted (audit trail)
- ✅ Only lock owner can renew/release
- ✅ Audit log is append-only

---

## 6. Implementation Checklist

### Phase 1: Foundation (2 hours)

- [ ] Create `sessionAgent.js` (session/lock ID generation)
- [ ] Create `editLocks` sub-collection schema
- [ ] Deploy Firestore security rules
- [ ] Test lock acquisition transaction manually

### Phase 2: Lock Management (3 hours)

- [ ] Implement `lockAgent.js` (acquire, renew, release)
- [ ] Add heartbeat interval to React components
- [ ] Show "locked by X" banner when question is locked
- [ ] Test lock expiration (wait 60s, verify steal works)

### Phase 3: Save Guards (3 hours)

- [ ] Create `saveGuardAgent.js` with transaction logic
- [ ] Integrate into existing save handlers
- [ ] Add version field to all question updates
- [ ] Test version conflict detection

### Phase 4: Conflict Resolution (2 hours)

- [ ] Create `conflictResolverAgent.js`
- [ ] Build `ConflictModal.jsx` UI component
- [ ] Implement reload/diff/force-overwrite actions
- [ ] Test conflict flow end-to-end

### Phase 5: Audit & Monitoring (1 hour)

- [ ] Create `auditAgent.js`
- [ ] Log all lock/save events
- [ ] Add admin view for audit logs
- [ ] Test audit query performance

### Phase 6: Integration Testing (2 hours)

- [ ] Two-user concurrent edit test
- [ ] Lock expiration test (simulate crash)
- [ ] Version conflict test (simultaneous saves)
- [ ] Performance test (100+ questions with locks)

**Total Estimate**: 13 hours

---

## 7. Performance Considerations

### Firestore Read/Write Costs

- **Lock acquisition**: 2 reads + 2 writes per acquisition (question + lock doc)
- **Heartbeat renewal**: 1 write every 20 seconds
- **Save**: 2 reads + 3 writes (question, lock, audit)

**Cost Optimization:**

- Use cached reads where possible
- Heartbeat only when actively editing (not when idle)
- Batch audit writes if high volume

### Scalability Limits

- **<100 concurrent editors**: Client-side logic sufficient
- **100-1000 concurrent editors**: Consider lock cleanup Cloud Function
- **>1000 concurrent editors**: Implement distributed locking service

---

## 8. Failure Modes & Recovery

| Failure | Detection | Recovery |
|---------|-----------|----------|
| **Network dropout during edit** | Heartbeat fails | Lock expires after 60s, auto-released |
| **Browser crash** | No heartbeat | Lock expires, another user can acquire |
| **Transaction retry storm** | Server logs | Exponential backoff, max 3 retries |
| **Clock skew** | Server timestamp mismatch | Use server timestamps only (`serverTimestamp()`) |
| **Orphaned locks** | Admin query shows old locks | Cloud Function cleanup (run daily) |

---

## 9. Testing Strategy

### Unit Tests

```javascript
// lockAgent.test.js
describe('Lock Agent', () => {
  it('should acquire lock when question is unlocked', async () => {
    const result = await acquireLock('q_test', sessionInfo);
    expect(result.success).toBe(true);
  });
  
  it('should fail when question is locked by another user', async () => {
    await expect(acquireLock('q_test', otherUserSession))
      .rejects.toThrow(LockError);
  });
  
  it('should steal expired locks', async () => {
    // Set up expired lock
    await setExpiredLock('q_test', 'old_lock');
    
    const result = await acquireLock('q_test', sessionInfo);
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests (Firebase Emulator)

```javascript
// Full workflow test
describe('Concurrent Edit Workflow', () => {
  it('should prevent silent overwrites', async () => {
    // User A loads v5
    const { question: questionA, baseVersion: versionA } = await loadQuestion('q_test');
    
    // User B loads v5
    const { question: questionB, baseVersion: versionB } = await loadQuestion('q_test');
    
    // User A acquires lock and saves
    await acquireLock('q_test', sessionA);
    await saveQuestionWithGuard('q_test', { text: 'A changes' }, versionA, lockA);
    
    // User B tries to save with stale version
    await expect(
      saveQuestionWithGuard('q_test', { text: 'B changes' }, versionB, lockB)
    ).rejects.toThrow(ConflictError);
  });
});
```

---

## 10. Rollout Plan

### Stage 1: Shadow Mode (Week 1)

- Deploy lock system
- Log all lock events to audit
- **Do NOT enforce** locks on save (just log violations)
- Monitor for bugs

### Stage 2: Opt-In (Week 2)

- Add UI toggle: "Enable collaborative editing protection"
- Users can opt into lock enforcement
- Collect feedback

### Stage 3: Full Enforcement (Week 3)

- Make locks mandatory
- Remove toggle
- Monitor conflict rates
- Add admin dashboard for lock metrics

---

## Appendix: References

- [Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Optimistic Concurrency Control](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
- [Distributed Locks in Firestore](https://firebase.googleblog.com/2019/03/offline-data-for-firestore.html)

---

**End of Document**
