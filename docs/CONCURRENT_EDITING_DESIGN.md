# Cloud Firestore Concurrent Editing System

## Engineering Design Document v1.0

> **Author**: Senior Firebase Engineer  
> **Date**: 2025-12-18  
> **Status**: Design Proposal  
> **Objective**: Prevent silent overwrites and data loss in multi-user concurrent editing scenarios

---

## Executive Summary

This document defines a production-grade concurrent editing system for a web application backed by Cloud Firestore. The system prevents race conditions, silent overwrites, and lost updates when multiple users edit the same "question" document simultaneously.

**Core Guarantees:**

1. ✅ No silent overwrites – conflicts are detected and surfaced to users
2. ✅ No permanent locks – crashed tabs cannot block editing indefinitely
3. ✅ Atomic operations – all critical writes use Firestore transactions
4. ✅ Version control – optimistic concurrency control via version field
5. ✅ Time-limited leases – edit locks expire automatically

---

## 1. Data Model

### 1.1 Primary Collections

```
/questions/{questionId}
/edit-locks/{questionId}
/audit-log/{eventId}
```

### 1.2 Question Document Schema

**Path**: `/questions/{questionId}`

```javascript
{
  // Domain Data
  questionText: string,
  answerChoices: array<string>,
  correctAnswer: number,
  difficulty: string,
  discipline: string,
  tags: array<string>,
  
  // Concurrency Control (CRITICAL)
  version: number,              // Incremented on every save. MUST start at 1.
  updatedAt: timestamp,          // Server timestamp of last write
  updatedBy: string,             // UID of user who last saved
  
  // Metadata
  createdAt: timestamp,
  createdBy: string,
  status: string,                // "draft" | "reviewed" | "published"
  
  // Optional: Last Edit Info (for UI display)
  lastEditedBy: {
    uid: string,
    email: string,
    displayName: string
  }
}
```

**Key Fields:**

- `version`: The single source of truth for optimistic locking. MUST be checked on every write.
- `updatedAt`: Server-generated timestamp. Never set by client.
- `updatedBy`: UID of the user who performed the last successful save.

### 1.3 Edit Lock Document Schema

**Path**: `/edit-locks/{questionId}`

```javascript
{
  // Lock Ownership
  sessionId: string,             // Unique browser tab identifier (UUID)
  userId: string,                // Firebase Auth UID
  userEmail: string,             // For debugging/UI display
  
  // Lock Lifecycle
  acquiredAt: timestamp,          // When lock was first acquired
  expiresAt: timestamp,          // Absolute expiration time (acquiredAt + TTL)
  lastHeartbeat: timestamp,      // Last renewal timestamp
  
  // Lock Metadata
  lockVersion: number,           // Incremented on each renewal (for debugging)
  userAgent: string,             // Browser/OS info (optional, for debugging)
  
  // State
  isActive: boolean              // True if lock is valid and not expired
}
```

**Key Fields:**

- `sessionId`: UUID generated per browser tab. Stored in `sessionStorage`. Dies with tab close.
- `expiresAt`: Absolute timestamp. Lock is invalid if `now() > expiresAt`.
- `lastHeartbeat`: Updated every ~20s to prove the session is still alive.

**Lock TTL**: 60 seconds (configurable)  
**Heartbeat Interval**: 20 seconds (configurable)

### 1.4 Audit Log Document Schema

**Path**: `/audit-log/{eventId}`

```javascript
{
  eventType: string,             // "lock_acquired" | "lock_renewed" | "lock_expired" | "save_success" | "save_conflict" | "save_error"
  questionId: string,
  sessionId: string,
  userId: string,
  userEmail: string,
  timestamp: timestamp,
  details: object,               // Event-specific data (e.g., version numbers, error messages)
  severity: string               // "info" | "warning" | "error"
}
```

---

## 2. Agent Architecture

The system is composed of **six specialized agents**, each with a single responsibility:

### 2.1 Session Agent

**Responsibility**: Identify and manage the unique session ID for the current browser tab.

**Lifecycle**:

1. On app initialization, check `sessionStorage` for `EDIT_SESSION_ID`.
2. If not found, generate a UUID v4 and store it: `sessionStorage.setItem('EDIT_SESSION_ID', uuidv4())`.
3. Return the session ID for use by other agents.

**Key Behavior**:

- Session ID **MUST** be stored in `sessionStorage`, NOT `localStorage`.
- `sessionStorage` dies with the tab, ensuring crashed/closed tabs lose their session identity.
- Each browser tab gets a unique session ID.

**Implementation**:

```javascript
// sessionAgent.js
import { v4 as uuidv4 } from 'uuid';

export class SessionAgent {
  constructor() {
    this.sessionId = this._initSession();
  }

  _initSession() {
    const SESSION_KEY = 'EDIT_SESSION_ID';
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem(SESSION_KEY, sessionId);
      console.log('[SessionAgent] New session created:', sessionId);
    } else {
      console.log('[SessionAgent] Existing session restored:', sessionId);
    }
    
    return sessionId;
  }

  getSessionId() {
    return this.sessionId;
  }
}
```

---

### 2.2 Lock/Lease Agent

**Responsibility**: Acquire, renew, and release edit locks for a question.

**Core Operations**:

#### 2.2.1 Acquire Lock

**API**: `acquireLock(questionId, userId, userEmail) → Promise<{success: boolean, lock: object | null, error: string | null}>`

**Algorithm**:

1. Start a Firestore transaction.
2. Read `/edit-locks/{questionId}`.
3. **If no lock exists**:
   - Create a new lock document with `expiresAt = now + 60s`.
   - Return `{success: true, lock: <lockData>}`.
4. **If a lock exists**:
   - Check if `now() > lock.expiresAt`:
     - **Expired**: Overwrite with a new lock for this session.
     - **Active**: Check if `lock.sessionId === this.sessionId`:
       - **Same session**: Renew the lock (update `expiresAt`, `lastHeartbeat`).
       - **Different session**: Return `{success: false, error: "Locked by another user"}`.

**Transaction Code**:

```javascript
// lockAgent.js
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

export class LockAgent {
  constructor(db, sessionAgent) {
    this.db = db;
    this.sessionAgent = sessionAgent;
    this.LOCK_TTL_MS = 60000; // 60 seconds
  }

  async acquireLock(questionId, userId, userEmail) {
    const sessionId = this.sessionAgent.getSessionId();
    const lockRef = doc(this.db, 'edit-locks', questionId);

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        const lockSnap = await transaction.get(lockRef);
        const now = Date.now();
        const expiresAt = now + this.LOCK_TTL_MS;

        // Case 1: No lock exists
        if (!lockSnap.exists()) {
          const newLock = {
            sessionId,
            userId,
            userEmail,
            acquiredAt: serverTimestamp(),
            expiresAt: new Date(expiresAt),
            lastHeartbeat: serverTimestamp(),
            lockVersion: 1,
            isActive: true
          };
          transaction.set(lockRef, newLock);
          return { success: true, lock: newLock };
        }

        // Case 2: Lock exists
        const existingLock = lockSnap.data();
        const lockExpired = existingLock.expiresAt.toMillis() < now;

        // Case 2a: Lock expired - steal it
        if (lockExpired) {
          const newLock = {
            sessionId,
            userId,
            userEmail,
            acquiredAt: serverTimestamp(),
            expiresAt: new Date(expiresAt),
            lastHeartbeat: serverTimestamp(),
            lockVersion: 1,
            isActive: true
          };
          transaction.set(lockRef, newLock);
          return { success: true, lock: newLock, stolen: true };
        }

        // Case 2b: Lock active and owned by this session - renew it
        if (existingLock.sessionId === sessionId) {
          const renewedLock = {
            ...existingLock,
            expiresAt: new Date(expiresAt),
            lastHeartbeat: serverTimestamp(),
            lockVersion: (existingLock.lockVersion || 0) + 1
          };
          transaction.update(lockRef, renewedLock);
          return { success: true, lock: renewedLock, renewed: true };
        }

        // Case 2c: Lock active and owned by different session - reject
        return {
          success: false,
          error: `Question is being edited by ${existingLock.userEmail}`,
          lockedBy: existingLock
        };
      });

      return result;
    } catch (error) {
      console.error('[LockAgent] acquireLock failed:', error);
      return { success: false, error: error.message };
    }
  }

  async renewLock(questionId) {
    // Same logic as acquireLock, but only succeeds if sessionId matches
    return this.acquireLock(questionId, null, null); // Will renew if owned
  }

  async releaseLock(questionId) {
    const sessionId = this.sessionAgent.getSessionId();
    const lockRef = doc(this.db, 'edit-locks', questionId);

    try {
      await runTransaction(this.db, async (transaction) => {
        const lockSnap = await transaction.get(lockRef);
        
        if (!lockSnap.exists()) {
          return; // Already released
        }

        const lock = lockSnap.data();
        
        // Only release if we own it
        if (lock.sessionId === sessionId) {
          transaction.delete(lockRef);
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('[LockAgent] releaseLock failed:', error);
      return { success: false, error: error.message };
    }
  }
}
```

#### 2.2.2 Renew Lock (Heartbeat)

**API**: `renewLock(questionId) → Promise<{success: boolean}>`

**Algorithm**:

1. Every 20 seconds, call `renewLock()` to extend `expiresAt` and update `lastHeartbeat`.
2. Uses the same transaction logic as `acquireLock()`, but only succeeds if the session owns the lock.

**Implementation**:

```javascript
// In the editing component
useEffect(() => {
  if (!isEditing) return;

  const heartbeat = setInterval(async () => {
    const result = await lockAgent.renewLock(questionId);
    if (!result.success) {
      console.warn('[Heartbeat] Failed to renew lock. Switching to read-only.');
      setIsReadOnly(true);
    }
  }, 20000); // 20 seconds

  return () => clearInterval(heartbeat);
}, [isEditing, questionId]);
```

#### 2.2.3 Release Lock

**API**: `releaseLock(questionId) → Promise<{success: boolean}>`

**When to call**:

- User clicks "Cancel" or "Close"
- User navigates away from the question
- Component unmounts
- User successfully saves the question

**Algorithm**:

1. Start a transaction.
2. Read the lock document.
3. If `lock.sessionId === this.sessionId`, delete the lock.
4. Otherwise, do nothing (we don't own it).

---

### 2.3 Load Agent

**Responsibility**: Load a question from Firestore and record its base version.

**API**: `loadQuestion(questionId) → Promise<{question: object, baseVersion: number}>`

**Algorithm**:

1. Fetch `/questions/{questionId}` from Firestore.
2. Store the `version` field as `baseVersion` in component state.
3. Return the question data and base version.

**Key Behavior**:

- The `baseVersion` is the version **at the time of load**.
- This value is used later by the Save Guard Agent to detect conflicts.

**Implementation**:

```javascript
// loadAgent.js
import { doc, getDoc } from 'firebase/firestore';

export class LoadAgent {
  constructor(db) {
    this.db = db;
  }

  async loadQuestion(questionId) {
    try {
      const questionRef = doc(this.db, 'questions', questionId);
      const questionSnap = await getDoc(questionRef);

      if (!questionSnap.exists()) {
        return { success: false, error: 'Question not found' };
      }

      const question = { id: questionSnap.id, ...questionSnap.data() };
      const baseVersion = question.version || 1; // Default to 1 if missing

      console.log(`[LoadAgent] Loaded question version ${baseVersion}`);

      return { 
        success: true, 
        question, 
        baseVersion 
      };
    } catch (error) {
      console.error('[LoadAgent] loadQuestion failed:', error);
      return { success: false, error: error.message };
    }
  }
}
```

---

### 2.4 Save Guard Agent

**Responsibility**: Perform version-checked writes using Firestore transactions.

**API**: `saveQuestion(questionId, updates, expectedVersion) → Promise<{success: boolean, newVersion: number | null, error: string | null}>`

**Algorithm**:

1. Start a Firestore transaction.
2. **Lock Validation**:
   - Read `/edit-locks/{questionId}`.
   - Verify `lock.sessionId === this.sessionId`.
   - Verify `lock.expiresAt > now()`.
   - **If validation fails**: Abort with error `"No active lock"`.
3. **Version Validation**:
   - Read `/questions/{questionId}`.
   - Verify `question.version === expectedVersion`.
   - **If validation fails**: Abort with error `"Version conflict"`.
4. **Atomic Write**:
   - Update the question with:
     - User's changes (`updates`).
     - `version: expectedVersion + 1`.
     - `updatedAt: serverTimestamp()`.
     - `updatedBy: userId`.
   - **Commit transaction**.
5. **Post-Save Cleanup**:
   - Release the edit lock (call `lockAgent.releaseLock()`).
6. Return `{success: true, newVersion: expectedVersion + 1}`.

**Transaction Code**:

```javascript
// saveGuardAgent.js
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

export class SaveGuardAgent {
  constructor(db, sessionAgent, lockAgent) {
    this.db = db;
    this.sessionAgent = sessionAgent;
    this.lockAgent = lockAgent;
  }

  async saveQuestion(questionId, updates, expectedVersion, userId, userEmail) {
    const sessionId = this.sessionAgent.getSessionId();
    const questionRef = doc(this.db, 'questions', questionId);
    const lockRef = doc(this.db, 'edit-locks', questionId);

    try {
      const result = await runTransaction(this.db, async (transaction) => {
        // Step 1: Validate lock ownership
        const lockSnap = await transaction.get(lockRef);
        
        if (!lockSnap.exists()) {
          throw new Error('LOCK_MISSING: No active lock. Cannot save.');
        }

        const lock = lockSnap.data();
        const now = Date.now();

        if (lock.sessionId !== sessionId) {
          throw new Error(`LOCK_STOLEN: Question is locked by ${lock.userEmail}`);
        }

        if (lock.expiresAt.toMillis() < now) {
          throw new Error('LOCK_EXPIRED: Your edit lock has expired. Please reload.');
        }

        // Step 2: Validate version (optimistic concurrency control)
        const questionSnap = await transaction.get(questionRef);
        
        if (!questionSnap.exists()) {
          throw new Error('QUESTION_DELETED: Question no longer exists.');
        }

        const currentQuestion = questionSnap.data();
        const currentVersion = currentQuestion.version || 1;

        if (currentVersion !== expectedVersion) {
          throw new Error(
            `VERSION_CONFLICT: Expected version ${expectedVersion}, but current is ${currentVersion}. ` +
            `Another user has saved changes.`
          );
        }

        // Step 3: Atomic write with version increment
        const newVersion = currentVersion + 1;
        const savePayload = {
          ...updates,
          version: newVersion,
          updatedAt: serverTimestamp(),
          updatedBy: userId,
          lastEditedBy: {
            uid: userId,
            email: userEmail,
            displayName: userEmail.split('@')[0] // Or pull from Firebase Auth
          }
        };

        transaction.update(questionRef, savePayload);

        // Step 4: Delete the lock (save complete)
        transaction.delete(lockRef);

        return { success: true, newVersion };
      });

      console.log(`[SaveGuard] Save successful. New version: ${result.newVersion}`);
      return result;

    } catch (error) {
      console.error('[SaveGuard] Save failed:', error);

      // Parse error type
      const errorMessage = error.message || error.toString();
      
      if (errorMessage.includes('VERSION_CONFLICT')) {
        return { 
          success: false, 
          error: errorMessage, 
          errorType: 'VERSION_CONFLICT' 
        };
      }
      
      if (errorMessage.includes('LOCK_EXPIRED')) {
        return { 
          success: false, 
          error: errorMessage, 
          errorType: 'LOCK_EXPIRED' 
        };
      }
      
      if (errorMessage.includes('LOCK_STOLEN')) {
        return { 
          success: false, 
          error: errorMessage, 
          errorType: 'LOCK_STOLEN' 
        };
      }

      return { 
        success: false, 
        error: errorMessage, 
        errorType: 'UNKNOWN' 
      };
    }
  }
}
```

---

### 2.5 Conflict Resolver Agent

**Responsibility**: Handle version conflicts and guide the user through resolution.

**API**: `resolveConflict(localChanges, serverQuestion) → {action: string, mergedQuestion: object | null}`

**Scenarios**:

#### Scenario A: User saves, version matches ✅

- **Transaction succeeds**.
- UI shows success toast: *"Question saved successfully."*

#### Scenario B: User saves, version conflict detected ❌

- **Transaction aborts** with `VERSION_CONFLICT` error.
- Save Guard Agent returns `{success: false, errorType: 'VERSION_CONFLICT'}`.

**UI Response**:

1. Show modal: *"Conflict Detected: Another user has saved changes while you were editing."*
2. Display three options:
   - **Option 1: Reload and Discard Your Changes** (safest)
     - Fetch the latest version from Firestore.
     - Replace local state with server state.
     - Lose local edits.
   - **Option 2: Overwrite Server Changes** (dangerous)
     - Re-acquire the lock.
     - Fetch the latest version.
     - Save user's changes with `expectedVersion = latestVersion`.
     - **Warning**: This discards the other user's changes.
   - **Option 3: Manual Merge** (recommended for advanced users)
     - Show a diff view of local vs. server changes.
     - Let user manually merge fields.
     - Save the merged result.

**Implementation**:

```javascript
// conflictResolverAgent.js
export class ConflictResolverAgent {
  async handleConflict(questionId, localChanges, userId, userEmail) {
    // Step 1: Fetch the latest server version
    const loadResult = await this.loadAgent.loadQuestion(questionId);
    
    if (!loadResult.success) {
      return { 
        action: 'ERROR', 
        error: 'Cannot fetch latest version' 
      };
    }

    const serverQuestion = loadResult.question;
    const serverVersion = loadResult.baseVersion;

    // Step 2: Present conflict resolution options to user via UI
    // (This is a UI decision, not an agent decision)
    return {
      action: 'SHOW_CONFLICT_MODAL',
      serverQuestion,
      serverVersion,
      localChanges
    };
  }

  async overwriteServerChanges(questionId, localChanges, userId, userEmail) {
    // Step 1: Re-acquire lock
    const lockResult = await this.lockAgent.acquireLock(questionId, userId, userEmail);
    
    if (!lockResult.success) {
      return { 
        success: false, 
        error: 'Cannot acquire lock for overwrite' 
      };
    }

    // Step 2: Fetch latest version
    const loadResult = await this.loadAgent.loadQuestion(questionId);
    const latestVersion = loadResult.baseVersion;

    // Step 3: Save with latest version (forcing overwrite)
    return await this.saveGuardAgent.saveQuestion(
      questionId, 
      localChanges, 
      latestVersion, 
      userId, 
      userEmail
    );
  }

  async discardLocalChanges(questionId) {
    // Simply reload the question
    return await this.loadAgent.loadQuestion(questionId);
  }

  async manualMerge(questionId, mergedChanges, userId, userEmail) {
    // User has manually merged fields in the UI
    // Save the merged result
    const loadResult = await this.loadAgent.loadQuestion(questionId);
    const latestVersion = loadResult.baseVersion;

    return await this.saveGuardAgent.saveQuestion(
      questionId, 
      mergedChanges, 
      latestVersion, 
      userId, 
      userEmail
    );
  }
}
```

---

### 2.6 Audit Agent

**Responsibility**: Log all lock and save events for debugging and compliance.

**API**: `logEvent(eventType, questionId, details) → Promise<void>`

**Event Types**:

- `lock_acquired`
- `lock_renewed`
- `lock_expired`
- `lock_released`
- `save_success`
- `save_conflict`
- `save_error`

**Implementation**:

```javascript
// auditAgent.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export class AuditAgent {
  constructor(db, sessionAgent) {
    this.db = db;
    this.sessionAgent = sessionAgent;
  }

  async logEvent(eventType, questionId, userId, userEmail, details = {}) {
    const sessionId = this.sessionAgent.getSessionId();
    
    try {
      await addDoc(collection(this.db, 'audit-log'), {
        eventType,
        questionId,
        sessionId,
        userId,
        userEmail,
        timestamp: serverTimestamp(),
        details,
        severity: this._getSeverity(eventType)
      });
    } catch (error) {
      console.error('[AuditAgent] Failed to log event:', error);
      // Don't block operations if audit logging fails
    }
  }

  _getSeverity(eventType) {
    const severityMap = {
      lock_acquired: 'info',
      lock_renewed: 'info',
      lock_expired: 'warning',
      lock_released: 'info',
      save_success: 'info',
      save_conflict: 'warning',
      save_error: 'error'
    };
    return severityMap[eventType] || 'info';
  }
}
```

---

## 3. Complete Workflow: User Editing Journey

### 3.1 User Opens Question for Editing

**Step-by-Step**:

1. User clicks "Edit" button on a question.
2. **Session Agent** provides the unique `sessionId` for this tab.
3. **Lock Agent** attempts to acquire a lock:

   ```javascript
   const lockResult = await lockAgent.acquireLock(questionId, userId, userEmail);
   ```

4. **If lock acquired successfully**:
   - **Load Agent** fetches the question and records `baseVersion`.
   - UI switches to edit mode.
   - **Heartbeat** starts: Renew lock every 20 seconds.
   - **Audit Agent** logs `lock_acquired`.
5. **If lock fails** (question already locked):
   - UI shows read-only mode.
   - Display message: *"This question is being edited by [otherUser@example.com]"*.
   - **Audit Agent** logs `lock_acquisition_failed`.

### 3.2 User Edits Question

- User types in text fields, selects options, etc.
- **Local state** is updated in React/Vue/etc.
- **No writes to Firestore yet**.
- Heartbeat continues to renew lock every 20 seconds.

### 3.3 User Clicks "Save"

**Step-by-Step**:

1. User clicks "Save" button.
2. Component calls:

   ```javascript
   const saveResult = await saveGuardAgent.saveQuestion(
     questionId,
     localChanges,
     baseVersion, // Version from initial load
     userId,
     userEmail
   );
   ```

3. **Save Guard Agent** starts a transaction:
   - Validates lock ownership and expiration.
   - Validates version: `currentVersion === baseVersion`.
   - Writes updates with `version: baseVersion + 1`.
   - Deletes the lock.
4. **If transaction succeeds**:
   - UI shows success toast: *"Question saved successfully."*
   - Navigate away or switch to read-only mode.
   - **Audit Agent** logs `save_success`.
5. **If transaction fails** (version conflict):
   - **Conflict Resolver Agent** handles the conflict.
   - UI shows conflict modal with resolution options.
   - **Audit Agent** logs `save_conflict`.

### 3.4 User Cancels Editing

**Step-by-Step**:

1. User clicks "Cancel" button.
2. Component calls:

   ```javascript
   await lockAgent.releaseLock(questionId);
   ```

3. Lock is deleted.
4. UI switches to read-only mode.
5. **Audit Agent** logs `lock_released`.

### 3.5 User Closes Tab (Crash/Refresh)

**Step-by-Step**:

1. Browser tab closes.
2. `sessionStorage` is cleared.
3. **Lock remains in Firestore** but will expire after 60 seconds.
4. **No permanent lock** – other users can steal the lock after expiration.
5. **Audit Agent** cannot log (session is dead).

---

## 4. Concurrent User Scenario (The Race Condition Test)

### Scenario: Alice and Bob both open the same question

**Timeline**:

| Time | Alice (Session A) | Bob (Session B) | Firestore State |
|------|-------------------|-----------------|-----------------|
| T0   | Opens question Q1 | — | Lock: none, Version: 5 |
| T1   | Acquires lock | — | Lock: Session A, Version: 5 |
| T2   | Loads version 5, starts editing | Opens question Q1 | Lock: Session A, Version: 5 |
| T3   | — | Tries to acquire lock → **FAILS** | Lock: Session A, Version: 5 |
| T4   | — | UI switches to **read-only mode** | Lock: Session A, Version: 5 |
| T5   | Saves edits | — | Lock: deleted, Version: 6 |
| T6   | — | Sees stale data (version 5 in UI) | Lock: none, Version: 6 |
| T7   | — | Clicks "Edit" again | Lock: none, Version: 6 |
| T8   | — | Acquires lock → **SUCCESS** | Lock: Session B, Version: 6 |
| T9   | — | Loads version 6, starts editing | Lock: Session B, Version: 6 |

**Result**: ✅ No conflict. Alice saved first, Bob started editing after.

---

### Scenario: Alice and Bob both edit, Alice saves first, Bob tries to save with stale data

**Timeline**:

| Time | Alice (Session A) | Bob (Session B) | Firestore State |
|------|-------------------|-----------------|-----------------|
| T0   | Opens Q1 | Opens Q1 | Lock: none, Version: 5 |
| T1   | Acquires lock | Tries to acquire lock → **FAILS** (Alice has it) | Lock: Session A, Version: 5 |
| T2   | Loads version 5 | Goes to lunch, leaves tab open | Lock: Session A, Version: 5 |
| T5   | Saves → Version 6 | — | Lock: deleted, Version: 6 |
| T10  | — | Returns from lunch, clicks "Edit" | Lock: none, Version: 6 |
| T11  | — | Acquires lock → **SUCCESS** | Lock: Session B, Version: 6 |
| T12  | — | **BUT**: Bob's UI still shows version 5 data (never reloaded) | Lock: Session B, Version: 6 |
| T13  | — | Makes edits, clicks "Save" | Lock: Session B, Version: 6 |
| T14  | — | Save Guard validates: `expectedVersion = 5`, `currentVersion = 6` → **VERSION CONFLICT** | Lock: Session B, Version: 6 |
| T15  | — | Transaction aborts. Conflict modal appears. | Lock: Session B, Version: 6 |

**UI Response**:

```
⚠️ Conflict Detected

Another user (alice@example.com) has saved changes while you were editing.

Options:
1. [Reload and Discard My Changes] (Recommended)
2. [Overwrite Server Changes] (Warning: This will delete Alice's edits)
3. [Manual Merge] (Advanced)
```

**Result**: ✅ Bob's stale save is **rejected**. No silent overwrite.

---

## 5. Firebase Security Rules

### 5.1 Questions Collection

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function: User is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function: User is admin
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function: Version is not regressing
    function versionNotRegressing() {
      return !resource.data.keys().hasAny(['version']) || 
             request.resource.data.version > resource.data.version;
    }
    
    // Questions collection
    match /questions/{questionId} {
      // Read: All authenticated users
      allow read: if isAuthenticated();
      
      // Create: All authenticated users (sets version = 1)
      allow create: if isAuthenticated() && 
                       request.resource.data.version == 1 &&
                       request.resource.data.createdBy == request.auth.uid;
      
      // Update: Must be authenticated, version must increment, updatedBy must match auth
      allow update: if isAuthenticated() && 
                       versionNotRegressing() &&
                       request.resource.data.updatedBy == request.auth.uid;
      
      // Delete: Admins only
      allow delete: if isAdmin();
    }
    
    // Edit locks collection
    match /edit-locks/{questionId} {
      // Read: All authenticated users (to check lock status)
      allow read: if isAuthenticated();
      
      // Create/Update: Authenticated users (lock ownership checked in transaction logic)
      allow create, update: if isAuthenticated() &&
                               request.resource.data.userId == request.auth.uid;
      
      // Delete: Only the owner can delete their lock
      allow delete: if isAuthenticated() && 
                       resource.data.userId == request.auth.uid;
    }
    
    // Audit log collection
    match /audit-log/{eventId} {
      // Read: Admins only
      allow read: if isAdmin();
      
      // Create: All authenticated users (write-only logging)
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid;
      
      // No updates or deletes (immutable log)
      allow update, delete: if false;
    }
  }
}
```

### 5.2 Key Security Guarantees

1. **Version Regression Prevention**: The rule `versionNotRegressing()` ensures writes cannot decrease the version number.
2. **Authentication Required**: No anonymous reads or writes.
3. **Lock Ownership**: Users can only delete their own locks (verified via `userId == request.auth.uid`).
4. **Audit Immutability**: Audit logs cannot be updated or deleted after creation.
5. **Admin-Only Deletes**: Only admins can delete questions.

---

## 6. Client-Side Integration Example (React)

### 6.1 QuestionEditor Component

```javascript
// QuestionEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { SessionAgent } from './agents/sessionAgent';
import { LockAgent } from './agents/lockAgent';
import { LoadAgent } from './agents/loadAgent';
import { SaveGuardAgent } from './agents/saveGuardAgent';
import { ConflictResolverAgent } from './agents/conflictResolverAgent';
import { AuditAgent } from './agents/auditAgent';

// Initialize agents (singleton per app)
const sessionAgent = new SessionAgent();
const lockAgent = new LockAgent(db, sessionAgent);
const loadAgent = new LoadAgent(db);
const saveGuardAgent = new SaveGuardAgent(db, sessionAgent, lockAgent);
const auditAgent = new AuditAgent(db, sessionAgent);
const conflictResolver = new ConflictResolverAgent(
  lockAgent, 
  loadAgent, 
  saveGuardAgent
);

export function QuestionEditor({ questionId }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [baseVersion, setBaseVersion] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const heartbeatRef = useRef(null);

  // Load question on mount
  useEffect(() => {
    loadQuestion();
  }, [questionId]);

  // Start heartbeat when editing
  useEffect(() => {
    if (!isEditing) return;

    heartbeatRef.current = setInterval(async () => {
      const result = await lockAgent.renewLock(questionId);
      if (!result.success) {
        console.warn('Lock renewal failed. Switching to read-only.');
        setIsReadOnly(true);
        setIsEditing(false);
      }
    }, 20000); // 20 seconds

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [isEditing, questionId]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (isEditing) {
        lockAgent.releaseLock(questionId);
      }
    };
  }, [isEditing, questionId]);

  async function loadQuestion() {
    const result = await loadAgent.loadQuestion(questionId);
    if (result.success) {
      setQuestion(result.question);
      setBaseVersion(result.baseVersion);
    }
  }

  async function handleEdit() {
    const lockResult = await lockAgent.acquireLock(
      questionId, 
      user.uid, 
      user.email
    );

    if (lockResult.success) {
      setIsEditing(true);
      setIsReadOnly(false);
      setLockInfo(lockResult.lock);
      
      await auditAgent.logEvent(
        'lock_acquired', 
        questionId, 
        user.uid, 
        user.email
      );
    } else {
      setIsReadOnly(true);
      alert(`Cannot edit: ${lockResult.error}`);
    }
  }

  async function handleSave() {
    const updates = {
      questionText: question.questionText,
      answerChoices: question.answerChoices,
      correctAnswer: question.correctAnswer,
      // ... other fields
    };

    const saveResult = await saveGuardAgent.saveQuestion(
      questionId,
      updates,
      baseVersion,
      user.uid,
      user.email
    );

    if (saveResult.success) {
      alert('Question saved successfully!');
      setIsEditing(false);
      setBaseVersion(saveResult.newVersion);
      
      await auditAgent.logEvent(
        'save_success', 
        questionId, 
        user.uid, 
        user.email,
        { newVersion: saveResult.newVersion }
      );
    } else {
      if (saveResult.errorType === 'VERSION_CONFLICT') {
        // Show conflict resolution modal
        const conflictResult = await conflictResolver.handleConflict(
          questionId,
          updates,
          user.uid,
          user.email
        );
        
        setConflictData(conflictResult);
        setShowConflictModal(true);
        
        await auditAgent.logEvent(
          'save_conflict', 
          questionId, 
          user.uid, 
          user.email,
          { expectedVersion: baseVersion }
        );
      } else {
        alert(`Save failed: ${saveResult.error}`);
      }
    }
  }

  async function handleCancel() {
    await lockAgent.releaseLock(questionId);
    setIsEditing(false);
    await loadQuestion(); // Reload original data
    
    await auditAgent.logEvent(
      'lock_released', 
      questionId, 
      user.uid, 
      user.email
    );
  }

  async function handleConflictResolve(action) {
    if (action === 'DISCARD') {
      const result = await conflictResolver.discardLocalChanges(questionId);
      setQuestion(result.question);
      setBaseVersion(result.baseVersion);
      setShowConflictModal(false);
    } else if (action === 'OVERWRITE') {
      const result = await conflictResolver.overwriteServerChanges(
        questionId,
        conflictData.localChanges,
        user.uid,
        user.email
      );
      
      if (result.success) {
        alert('Your changes have been saved.');
        setShowConflictModal(false);
      } else {
        alert(`Failed to overwrite: ${result.error}`);
      }
    }
  }

  if (!question) return <div>Loading...</div>;

  return (
    <div>
      <h1>Question Editor</h1>
      
      {isReadOnly && (
        <div className="alert alert-warning">
          This question is locked by {lockInfo?.userEmail || 'another user'}.
          You are in read-only mode.
        </div>
      )}

      <input
        type="text"
        value={question.questionText}
        onChange={(e) => setQuestion({ ...question, questionText: e.target.value })}
        disabled={!isEditing}
      />

      {/* ... other form fields ... */}

      <div className="actions">
        {!isEditing && (
          <button onClick={handleEdit}>Edit</button>
        )}
        {isEditing && (
          <>
            <button onClick={handleSave}>Save</button>
            <button onClick={handleCancel}>Cancel</button>
          </>
        )}
      </div>

      {/* Conflict Resolution Modal */}
      {showConflictModal && (
        <ConflictModal
          conflictData={conflictData}
          onResolve={handleConflictResolve}
          onClose={() => setShowConflictModal(false)}
        />
      )}
    </div>
  );
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Agent Unit Tests**:

- `SessionAgent`: Verify session ID generation and persistence.
- `LockAgent`: Test acquire, renew, release, and expiration logic.
- `SaveGuardAgent`: Test version validation and atomic writes.
- `ConflictResolverAgent`: Test conflict detection and resolution paths.

**Mock Firestore**: Use `@firebase/testing` or Jest mocks to simulate Firestore transactions.

### 7.2 Integration Tests

**Concurrent User Simulation**:

1. Open two browser tabs with different session IDs.
2. Have both tabs load the same question.
3. Have Tab A acquire the lock and start editing.
4. Verify Tab B is in read-only mode.
5. Have Tab A save changes (version 5 → 6).
6. Have Tab B attempt to edit (should acquire lock after Tab A releases).
7. Have Tab B save changes (version 6 → 7).
8. Verify no data loss.

**Lock Expiration Test**:

1. Acquire a lock with a 5-second TTL (for testing).
2. Do not renew the lock.
3. Wait 6 seconds.
4. Attempt to acquire the lock from a different session.
5. Verify the lock is stolen successfully.

**Version Conflict Test**:

1. Load question at version 5.
2. Manually update the question in Firestore to version 6 (simulate another user's save).
3. Attempt to save with `expectedVersion = 5`.
4. Verify the transaction aborts with `VERSION_CONFLICT`.

### 7.3 Manual QA Checklist

- [ ] User can acquire a lock and edit a question.
- [ ] User can save changes successfully (version increments).
- [ ] User cannot save if lock expired.
- [ ] User cannot save if another user saved first (version conflict detected).
- [ ] Lock is released when user clicks Cancel.
- [ ] Lock expires after 60 seconds of inactivity.
- [ ] Heartbeat renews lock every 20 seconds.
- [ ] Closing the tab releases the session (but lock remains until expiration).
- [ ] Conflict modal shows correct options.
- [ ] Audit log records all events.

---

## 8. Performance Considerations

### 8.1 Transaction Costs

**Firestore Pricing**:

- 1 transaction = 1 read + 1 write (minimum).
- For this system:
  - **Lock acquire**: 1 read (lock doc) + 1 write (create/update lock) = **2 operations**.
  - **Save**: 1 read (lock doc) + 1 read (question doc) + 1 write (question) + 1 delete (lock) = **4 operations**.
  - **Heartbeat**: 1 read + 1 write = **2 operations** (every 20 seconds).

**Cost Estimate**:

- 1 editing session (5 minutes):
  - 1 lock acquire = 2 ops.
  - 15 heartbeats (5 min / 20 sec) = 30 ops.
  - 1 save = 4 ops.
  - **Total**: 36 operations per session.

**Optimization**:

- Increase heartbeat interval to 30 seconds to reduce costs.
- Use Cloud Functions to clean up expired locks (batch deletes).

### 8.2 Firestore Limits

- **Transaction size**: Max 500 documents per transaction (not an issue here).
- **Write rate**: 1 write/second per document (heartbeats are well below this).
- **Concurrent transactions**: Firestore handles thousands of concurrent transactions.

### 8.3 Offline Support

**Current Design**: **Does not support offline editing**.

**Why?**

- Offline edits cannot acquire locks.
- Offline edits cannot validate versions.
- **Risk**: Offline saves could overwrite online changes.

**Recommendation**:

- If offline support is required, implement a **conflict-free replicated data type (CRDT)** or use Firestore's offline persistence with manual conflict resolution.

---

## 9. Deployment Checklist

Before deploying to production:

- [ ] Deploy Firestore Security Rules.
- [ ] Test all agent methods in staging environment.
- [ ] Run concurrent user integration tests.
- [ ] Set up monitoring for audit log events (Cloud Functions + BigQuery).
- [ ] Configure alerts for high lock contention (many `lock_acquisition_failed` events).
- [ ] Document the conflict resolution UX for end users.
- [ ] Train support team on lock expiration and version conflicts.
- [ ] Set up automated cleanup job to delete expired locks (optional).

---

## 10. Future Enhancements

### 10.1 Real-Time Lock Notifications

**Problem**: User B doesn't know when User A releases the lock.

**Solution**: Use Firestore real-time listeners to subscribe to `/edit-locks/{questionId}`.

```javascript
// In QuestionEditor.jsx
useEffect(() => {
  const lockRef = doc(db, 'edit-locks', questionId);
  const unsubscribe = onSnapshot(lockRef, (snap) => {
    if (!snap.exists()) {
      // Lock was released!
      if (isReadOnly) {
        alert('The question is now available for editing.');
      }
    } else {
      const lock = snap.data();
      if (lock.sessionId !== sessionAgent.getSessionId()) {
        setIsReadOnly(true);
        setLockInfo(lock);
      }
    }
  });

  return unsubscribe;
}, [questionId]);
```

### 10.2 Collaborative Editing (Operational Transform)

**Problem**: Only one user can edit at a time.

**Solution**: Implement Operational Transform (OT) or CRDTs to allow simultaneous editing of different fields.

**Libraries**:

- **ShareDB**: Implements OT.
- **Yjs**: Implements CRDTs for collaborative editing.

**Trade-off**: Much more complex than locking.

### 10.3 Field-Level Locking

**Problem**: User A edits the question text, User B edits the tags. Both are blocked.

**Solution**: Lock individual fields instead of the entire document.

**Implementation**:

```javascript
/edit-locks/{questionId}/fields/{fieldName}
```

### 10.4 Lock Queue (Waitlist)

**Problem**: User B has to keep clicking "Edit" to check if the lock is available.

**Solution**: Implement a queue system where users can "request to edit" and are notified when it's their turn.

**Implementation**:

```javascript
/edit-queues/{questionId}/requests/{userId}
```

---

## 11. Appendix: FAQ

### Q1: What happens if a user's lock expires while they're typing?

**A**: The heartbeat renewal fails. The UI should:

1. Switch to read-only mode.
2. Show a warning: *"Your edit session has expired. Please reload to continue editing."*
3. Disable the Save button.

### Q2: Can a user force-steal a lock from another user?

**A**: Not in the current design. Security rules prevent lock theft. However, an **admin override** could be added:

```javascript
async function adminForceReleaseLock(questionId) {
  if (!user.isAdmin) throw new Error('Unauthorized');
  await deleteDoc(doc(db, 'edit-locks', questionId));
}
```

### Q3: What if two users acquire a lock at the exact same millisecond?

**A**: Firestore transactions are **serializable**. Only one transaction will succeed. The second transaction will fail and return an error.

### Q4: How do I debug lock contention issues?

**A**: Query the audit log:

```javascript
const q = query(
  collection(db, 'audit-log'),
  where('eventType', '==', 'lock_acquisition_failed'),
  orderBy('timestamp', 'desc'),
  limit(50)
);

const snapshot = await getDocs(q);
snapshot.forEach(doc => console.log(doc.data()));
```

### Q5: Should I use Firestore or Realtime Database for locks?

**A**: **Firestore** is recommended because:

1. Transactions are more robust.
2. Better querying for audit logs.
3. Security rules are more expressive.

**Realtime Database** has lower latency but weaker transaction semantics.

---

## 12. Summary

This design provides **production-grade concurrent editing protection** for Cloud Firestore:

✅ **No silent overwrites** – Version conflicts are detected via optimistic concurrency control.  
✅ **No permanent locks** – Time-limited leases expire automatically.  
✅ **Atomic operations** – All critical writes use Firestore transactions.  
✅ **Session isolation** – Each browser tab has a unique session ID.  
✅ **Audit trail** – All lock and save events are logged.  
✅ **Conflict resolution** – Users are guided through merge/overwrite/discard options.  

**Next Steps**:

1. Implement the six agents (Session, Lock, Load, SaveGuard, ConflictResolver, Audit).
2. Add UI for lock status and conflict modals.
3. Deploy Firestore Security Rules.
4. Test with concurrent users in staging.
5. Monitor audit logs in production.

---

**End of Document**
