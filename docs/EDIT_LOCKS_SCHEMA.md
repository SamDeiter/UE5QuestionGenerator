# Edit Locks Collection Schema

**Collection Path**: `/edit-locks/{questionId}`

## Purpose

The `edit-locks` collection manages time-limited edit locks (leases) for concurrent editing protection. Each document represents an active editing session for a specific question.

---

## Document Schema

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | ✅ | Unique browser tab identifier (UUID stored in sessionStorage) |
| `userId` | `string` | ✅ | Firebase Auth UID of the user who owns the lock |
| `userEmail` | `string` | ✅ | Email address of the lock owner (for UI display) |
| `acquiredAt` | `timestamp` | ✅ | Server timestamp when lock was first acquired |
| `expiresAt` | `timestamp` | ✅ | Absolute expiration time (acquiredAt + TTL, typically 60s) |
| `lastHeartbeat` | `timestamp` | ✅ | Last renewal timestamp (updated every ~20s) |
| `lockVersion` | `number` | ✅ | Incremented on each renewal (for debugging) |
| `isActive` | `boolean` | ✅ | Always `true` for active locks |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `userAgent` | `string` | Browser/OS info (optional, for debugging) |

---

## Example Document

```json
{
  "sessionId": "a3f2c1d0-9b8e-4a1c-8f7d-6e5b4c3a2b1c",
  "userId": "AbCdEfGhIjKlMnOpQrStUvWx",
  "userEmail": "reviewer@example.com",
  "acquiredAt": "2025-12-18T15:30:00.000Z",
  "expiresAt": "2025-12-18T15:31:00.000Z",
  "lastHeartbeat": "2025-12-18T15:30:40.000Z",
  "lockVersion": 3,
  "isActive": true,
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
}
```

---

## Lifecycle

### 1. Lock Acquisition

**Trigger**: User clicks "Edit" button on a question

**Action**: `lockAgent.acquireLock(questionId, userId, userEmail)`

**Transaction Logic**:

```javascript
if (lockExists && !expired && lock.sessionId !== mySessionId) {
  // Lock owned by another user → REJECT
  return { success: false, error: "Locked by user@example.com" };
}

if (!lockExists || expired) {
  // No lock or expired lock → CREATE/STEAL
  createLock({ sessionId, userId, userEmail, expiresAt: now + 60s });
  return { success: true };
}

if (lockExists && lock.sessionId === mySessionId) {
  // We already own it → RENEW
  updateLock({ expiresAt: now + 60s, lockVersion: lock.lockVersion + 1 });
  return { success: true };
}
```

### 2. Lock Renewal (Heartbeat)

**Trigger**: Every 20 seconds while editing

**Action**: `lockAgent.renewLock(questionId)`

**Updates**:

- `expiresAt`: Extended by 60 seconds
- `lastHeartbeat`: Updated to current timestamp
- `lockVersion`: Incremented by 1

**Purpose**: Keep lock alive during active editing

### 3. Lock Release

**Trigger**:

- User saves question (successful save)
- User cancels editing
- User navigates away
- Component unmounts

**Action**: `lockAgent.releaseLock(questionId)`

**Result**: Lock document is **deleted**

### 4. Lock Expiration

**Trigger**: `now() > expiresAt` (typically after 60 seconds of inactivity)

**Behavior**:

- Lock is considered **expired** but not automatically deleted
- Another user can **steal** the expired lock
- Original session can no longer renew or use the lock

**Cleanup**: Expired locks are garbage-collected by a Cloud Function (optional) or stolen by the next user

---

## Security Rules

```javascript
match /edit-locks/{questionId} {
  // Read: All authenticated users (to check lock status)
  allow read: if isSignedIn();
  
  // Create/Update: Must be the lock owner
  allow create, update: if isSignedIn()
                           && request.resource.data.userId == request.auth.uid;
  
  // Delete: Only the owner can delete their lock
  allow delete: if isSignedIn() 
                   && resource.data.userId == request.auth.uid;
}
```

---

## Common Queries

### Check Lock Status

```javascript
const lockRef = doc(db, 'edit-locks', questionId);
const lockSnap = await getDoc(lockRef);

if (lockSnap.exists()) {
  const lock = lockSnap.data();
  const isExpired = lock.expiresAt.toMillis() < Date.now();
  
  if (!isExpired) {
    console.log(`Locked by ${lock.userEmail}`);
  }
}
```

### List All Active Locks

```javascript
const locksQuery = query(
  collection(db, 'edit-locks'),
  where('expiresAt', '>', new Date())
);

const snapshot = await getDocs(locksQuery);
snapshot.forEach(doc => {
  const lock = doc.data();
  console.log(`${doc.id}: Locked by ${lock.userEmail}`);
});
```

### Clean Up Expired Locks (Cloud Function)

```javascript
// Cloud Function (runs every 5 minutes)
exports.cleanupExpiredLocks = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    const expiredLocks = await db.collection('edit-locks')
      .where('expiresAt', '<', now)
      .get();
    
    const batch = db.batch();
    expiredLocks.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Cleaned up ${expiredLocks.size} expired locks`);
  });
```

---

## Configuration

### Constants (in `lockAgent.js`)

```javascript
const LOCK_TTL_MS = 60000;        // 60 seconds
const HEARTBEAT_INTERVAL_MS = 20000; // 20 seconds
```

### Tuning Guidelines

| Scenario | LOCK_TTL | HEARTBEAT_INTERVAL |
|----------|----------|---------------------|
| **Default (Recommended)** | 60s | 20s |
| **Fast editing** | 30s | 10s |
| **Slow editing** | 120s | 40s |
| **Testing** | 10s | 3s |

**Rule of Thumb**: `HEARTBEAT_INTERVAL < LOCK_TTL / 2` to allow at least one renewal before expiration.

---

## Monitoring

### Key Metrics

1. **Lock Acquisition Rate**
   - Query audit log for `lock_acquired` events
   - Track per user, per question

2. **Lock Contention Rate**
   - Percentage of `lock_acquired` attempts that fail
   - High contention indicates multiple users editing same questions

3. **Average Lock Duration**
   - Time between `lock_acquired` and `lock_released` / `save_success`

4. **Expired Lock Rate**
   - Percentage of locks that expire (vs. being explicitly released)
   - High rate may indicate browser crashes or poor UX

---

## Troubleshooting

### Issue: Lock won't release

**Symptoms**: User closes tab, but lock persists for 60 seconds

**Cause**: Tab closed before `lockAgent.releaseLock()` was called

**Solution**:

1. Wait for lock to expire (60 seconds)
2. Admin force-release via Cloud Function
3. Implement `beforeunload` event listener (unreliable on mobile)

### Issue: Lock stolen prematurely

**Symptoms**: User A is editing, lock is stolen by User B before expiration

**Cause**:

- Heartbeat renewal failed (network issue)
- Lock expiration time miscalculated

**Solution**:

1. Check browser console for heartbeat errors
2. Verify `expiresAt` timestamp in Firestore document
3. Increase `LOCK_TTL` if users have slow networks

### Issue: User can't acquire lock

**Symptoms**: `acquireLock()` always returns `{ success: false }`

**Cause**:

- Lock owned by another active session
- Firestore Security Rules rejecting the write

**Solution**:

1. Check audit log for lock owner
2. Verify Security Rules allow `create` and `update` on `/edit-locks/{questionId}`
3. Ensure `userId` field matches `request.auth.uid`

---

## Related Documentation

- [Concurrent Editing Design](./CONCURRENT_EDITING_DESIGN.md) - Full system design
- [Production Readiness Roadmap](./PRODUCTION_READINESS_ROADMAP.md) - Implementation checklist
- [Firestore Security Rules](../config/firestore/firestore.rules) - Security rules

---

**Last Updated**: December 18, 2025  
**Version**: 1.0
