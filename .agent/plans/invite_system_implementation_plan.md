# Secure Invite System - Implementation Plan

**Status:** Planning  
**Date:** December 12, 2024  
**Target Version:** v2.1  
**Priority:** HIGH (Security Feature)

---

## Overview

Implement a secure invite code system that allows controlled access to the UE5 Question Generator. Only users with valid invite codes can register, and codes can be managed by administrators.

> [!IMPORTANT]
> This system must follow all security guidelines from `AGENTS.md` and `.agent/JavaSec-Sentinel.md`:
>
> - Never expose API keys or secrets
> - Sanitize all user inputs
> - Tests first, then implementation
> - Phased approach for Windows performance

---

## Phase 1: Core Infrastructure (1 hour)

### 1.1 Firestore Schema Design

**Collection:** `invites/{inviteCode}`

```javascript
{
  code: "ABC123XYZ789",        // 12-char crypto-random
  createdBy: "uid",           // Admin who created
  createdByEmail: "email",    // For audit trail
  createdAt: Timestamp,
  expiresAt: Timestamp,       // Required (max 30 days)
  maxUses: 1,                 // 1 = single-use, -1 = unlimited
  currentUses: 0,
  usedBy: [],                 // Array of { email, usedAt }
  role: "user",               // "admin" or "user"
  isActive: true,             // Can be revoked
  note: ""                    // Optional description
}
```

**Collection:** `inviteAttempts/{ip_or_sessionId}`

```javascript
{
  attempts: 0,
  lastAttempt: Timestamp,
  lockedUntil: Timestamp | null
}
```

---

### 1.2 Firestore Security Rules

**File:** `firestore.rules` (update)

```rules
// Invite codes - ADMIN ONLY for create/list
match /invites/{inviteCode} {
  // Anyone can validate (but via Cloud Function, not direct read)
  allow read: if false;  // No direct reads - use Cloud Function
  allow create: if isAdmin(request.auth.uid);
  allow update: if isAdmin(request.auth.uid);
  allow delete: if isAdmin(request.auth.uid);
}

// Rate limiting collection
match /inviteAttempts/{attemptId} {
  allow read, write: if false;  // Cloud Functions only
}

function isAdmin(uid) {
  return get(/databases/$(database)/documents/admins/$(uid)).data.isAdmin == true;
}
```

---

### 1.3 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| [`functions/index.js`](file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/functions/index.js) | MODIFY | Add `validateInvite`, `createInvite`, `revokeInvite` |
| `src/services/inviteService.js` | NEW | Client-side wrapper for invite functions |
| `src/components/InviteSignUp.jsx` | NEW | Sign-up form with invite code |
| `src/components/AdminInviteManager.jsx` | NEW | Admin UI for managing invites |
| `firestore.rules` | MODIFY | Add invite security rules |

---

## Phase 2: Cloud Functions (1.5 hours)

### 2.1 validateInvite (Critical Security)

**Purpose:** Server-side invite code validation with rate limiting

```javascript
// functions/index.js

exports.validateInvite = functions
  .runWith({ timeoutSeconds: 30 })
  .https.onCall(async (data, context) => {
    const { code } = data;
    
    // === INPUT SANITIZATION ===
    if (!code || typeof code !== 'string' || code.length !== 12) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid code format');
    }
    
    // Sanitize: alphanumeric only
    const sanitizedCode = code.replace(/[^A-Za-z0-9]/g, '').substring(0, 12);
    
    // === RATE LIMITING ===
    const clientIP = context.rawRequest?.ip || 'unknown';
    const rateLimitRef = admin.firestore().collection('inviteAttempts').doc(clientIP);
    const rateLimitDoc = await rateLimitRef.get();
    
    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      if (data.lockedUntil && data.lockedUntil.toDate() > new Date()) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many attempts. Try again later.'
        );
      }
      if (data.attempts >= 5) {
        // Lock for 1 hour after 5 failed attempts
        await rateLimitRef.update({
          lockedUntil: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 60 * 60 * 1000)
          )
        });
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Too many attempts. Locked for 1 hour.'
        );
      }
    }
    
    // === VALIDATE INVITE ===
    const inviteRef = admin.firestore().collection('invites').doc(sanitizedCode);
    const inviteDoc = await inviteRef.get();
    
    if (!inviteDoc.exists) {
      await incrementFailedAttempt(rateLimitRef, rateLimitDoc);
      throw new functions.https.HttpsError('not-found', 'Invalid invite code');
    }
    
    const invite = inviteDoc.data();
    
    // Check if active
    if (!invite.isActive) {
      throw new functions.https.HttpsError('failed-precondition', 'Invite has been revoked');
    }
    
    // Check expiration
    if (invite.expiresAt.toDate() < new Date()) {
      throw new functions.https.HttpsError('failed-precondition', 'Invite has expired');
    }
    
    // Check usage limit
    if (invite.maxUses !== -1 && invite.currentUses >= invite.maxUses) {
      throw new functions.https.HttpsError('failed-precondition', 'Invite has reached max uses');
    }
    
    // === CLEAR RATE LIMIT ON SUCCESS ===
    await rateLimitRef.delete();
    
    return {
      valid: true,
      role: invite.role,
      expiresAt: invite.expiresAt.toDate().toISOString()
    };
  });
```

---

### 2.2 consumeInvite (After Successful Auth)

**Purpose:** Mark invite as used after user completes registration

```javascript
exports.consumeInvite = functions
  .https.onCall(async (data, context) => {
    // MUST be authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
    }
    
    const { code } = data;
    const userEmail = context.auth.token.email;
    
    const inviteRef = admin.firestore().collection('invites').doc(code);
    const inviteDoc = await inviteRef.get();
    
    if (!inviteDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Invalid invite');
    }
    
    const invite = inviteDoc.data();
    
    // Check if already used by this email
    if (invite.usedBy.some(u => u.email === userEmail)) {
      return { success: true, alreadyUsed: true };
    }
    
    // Update invite usage
    await inviteRef.update({
      currentUses: admin.firestore.FieldValue.increment(1),
      usedBy: admin.firestore.FieldValue.arrayUnion({
        email: userEmail,
        uid: context.auth.uid,
        usedAt: admin.firestore.Timestamp.now()
      })
    });
    
    return { success: true };
  });
```

---

### 2.3 createInvite (Admin Only)

```javascript
exports.createInvite = functions
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth || !await isAdmin(context.auth.uid)) {
      throw new functions.https.HttpsError('permission-denied', 'Admins only');
    }
    
    const { maxUses = 1, expiresInDays = 7, role = 'user', note = '' } = data;
    
    // Generate cryptographically secure code
    const code = crypto.randomBytes(9).toString('base64')
      .replace(/[^A-Za-z0-9]/g, '').substring(0, 12).toUpperCase();
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.min(expiresInDays, 30)); // Max 30 days
    
    await admin.firestore().collection('invites').doc(code).set({
      code,
      createdBy: context.auth.uid,
      createdByEmail: context.auth.token.email,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      maxUses,
      currentUses: 0,
      usedBy: [],
      role,
      isActive: true,
      note
    });
    
    return {
      code,
      inviteUrl: `https://samdeiter.github.io/UE5QuestionGenerator/?invite=${code}`,
      expiresAt: expiresAt.toISOString()
    };
  });
```

---

## Phase 3: Frontend Components (1.5 hours)

### 3.1 InviteSignUp Component

**File:** `src/components/InviteSignUp.jsx`

- Reads `?invite=CODE` from URL
- Shows invite validation status
- Offers Google Sign-In + Email/Password options
- Consumes invite after successful auth

### 3.2 Email/Password Auth

**File:** `src/services/firebase.js` (update)

```javascript
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification 
} from 'firebase/auth';

export const signUpWithEmail = async (email, password) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(result.user);
  return result.user;
};

export const signInWithEmail = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};
```

### 3.3 AdminInviteManager Component

**File:** `src/components/AdminInviteManager.jsx`

- Create new invites with options (uses, expiry, role)
- View active invites table
- Revoke invites
- Copy invite link to clipboard

---

## Phase 4: Integration & Testing (1 hour)

### 4.1 Unit Tests (REQUIRED FIRST)

**File:** `src/services/inviteService.test.js`

```javascript
describe('InviteService', () => {
  test('validateInvite rejects invalid format', async () => {});
  test('validateInvite rejects expired code', async () => {});
  test('validateInvite rejects used code', async () => {});
  test('validateInvite accepts valid code', async () => {});
  test('consumeInvite increments usage', async () => {});
  test('createInvite generates unique codes', async () => {});
});
```

### 4.2 Security Tests

```javascript
describe('Security', () => {
  test('rate limiting blocks after 5 attempts', async () => {});
  test('non-admin cannot create invite', async () => {});
  test('SQL/XSS injection is sanitized', async () => {});
});
```

---

## Security Checklist

| Requirement | Implementation |
|-------------|----------------|
| ✅ Cryptographic randomness | `crypto.randomBytes(9)` |
| ✅ Rate limiting | 5 attempts → 1 hour lockout |
| ✅ Input sanitization | Alphanumeric filter, length check |
| ✅ Server-side validation | Cloud Functions, not client |
| ✅ Admin-only creation | UID whitelist check |
| ✅ Forced expiration | Max 30 days |
| ✅ Instant revocation | `isActive` flag |
| ✅ Audit trail | `createdBy`, `usedBy` arrays |
| ✅ No secrets exposed | All validation server-side |
| ✅ XSS prevention | DOMPurify for any displayed content |

---

## Implementation Order

Following AGENTS.md phased approach:

1. **Phase 1:** Schema + Security Rules (30 min)
2. **Phase 2:** Cloud Functions + Tests (1.5 hours)
3. **Phase 3:** Frontend Components (1.5 hours)
4. **Phase 4:** Integration + Deploy (1 hour)

**Total Estimated Time:** ~4.5 hours

---

## Rollback Plan

If issues arise:

1. Disable invite requirement (revert to Google-only)
2. Revoke all active invites
3. Restore previous `SignIn.jsx`

---

## Success Criteria

- [ ] Non-invited users cannot access app
- [ ] Invited users can sign up via Google OR Email
- [ ] Admins can create/revoke invites
- [ ] Rate limiting prevents brute force
- [ ] All Cloud Functions secure and tested
- [ ] Logout button functional

---

## Next Steps

**Awaiting approval to proceed with Phase 1.**

```
[PROCEED?] Start Phase 1: Firestore schema and security rules
```
