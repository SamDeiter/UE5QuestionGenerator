# 🔒 Security Audit Report: UE5 Question Generator

**Date:** 2025-12-19  
**Scope:** URL parameters, client-side trust, XSS, invite brute-force, access control

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 High | 0 | — |
| 🟠 Medium | 3 | Action Required |
| 🟡 Low | 2 | Recommended |

**Overall Architecture Assessment:** ✅ **Good**  
The application correctly delegates all trust decisions to Cloud Functions. Invite validation, consumption, and role assignment happen server-side. No critical vulnerabilities found.

---

## Vulnerability List (Prioritized)

### 🟠 V-001: Rate Limiting Disabled on Invite Validation

**Severity:** Medium  
**Location:** [checkUserRegistration.js](file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/functions/users/checkUserRegistration.js#L516)

**Issue:**  

```javascript
const ENABLE_RATE_LIMIT = false; // Line 516
```

Rate limiting is explicitly disabled, allowing unlimited invite code guessing attempts.

**Exploit Steps:**

1. Attacker creates a script to call `validateInvite` Cloud Function
2. Brute-force 12-character alphanumeric codes (36^12 combinations)
3. While infeasible for random codes, any predictable patterns become guessable

**Fix:**

```javascript
const ENABLE_RATE_LIMIT = true; // Enable rate limiting
```

---

### 🟠 V-002: Super Admin Email Exposed in Client Bundle

**Severity:** Medium  
**Location:** [useAuth.js](file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/src/hooks/useAuth.js#L24)

**Issue:**

```javascript
const FALLBACK_ADMIN_EMAILS = [
  (import.meta.env.VITE_SUPER_ADMIN_EMAIL || "").trim().toLowerCase(),
]
```

The `VITE_SUPER_ADMIN_EMAIL` environment variable is bundled into the client code during build, exposing the admin email to anyone who views page source.

**Exploit Steps:**

1. Attacker opens browser DevTools → Sources
2. Searches compiled JS for email patterns
3. Uses email for targeted phishing or social engineering

**Fix:**
Admin email checking should happen **server-side only**:

```javascript
// useAuth.js - REMOVE client-side admin fallback
// const FALLBACK_ADMIN_EMAILS = [...] ← DELETE

// Instead, rely only on checkUserRegistration() response
const regStatus = await checkUserRegistration();
setIsAdmin(regStatus.role === "admin");
```

The server already handles super admin detection (see `setupInitialAdmin` function).

---

### 🟠 V-003: Invite Code Visible in URL and Browser History

**Severity:** Medium  
**Location:** [inviteService.js](file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/src/services/inviteService.js#L117)

**Issue:**

```javascript
const params = new URLSearchParams(window.location.search);
return params.get("invite");
```

Invite codes in URLs are stored in:

- Browser history
- Server access logs  
- Shared link previews
- Screen recordings/screenshots

**Exploit Steps:**

1. User shares screen with `?invite=ABC123DEF` in URL bar
2. Attacker captures code from recording
3. Uses code before it expires (if multi-use)

**Current Mitigation:** Code is cleared after consumption via `clearInviteFromUrl()` ✓

**Recommended Enhancement:**
Replace fragment-based codes that don't persist in server logs:

```javascript
// Use URL fragment (hash) instead of query parameter
// Example: https://app.com/#invite=ABC123
export const getInviteFromUrl = () => {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return params.get("invite");
};
```

---

### 🟡 V-004: localStorage Compliance Flags Easily Bypassable

**Severity:** Low  
**Location:** [useAuth.js](file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/src/hooks/useAuth.js#L150-L159)

**Issue:**

```javascript
const ageVerified = localStorage.getItem("ue5_age_verified");
const termsAcceptedStorage = localStorage.getItem("ue5_terms_accepted");
```

Age verification and terms acceptance are stored client-side only.

**Exploit Steps:**

```javascript
localStorage.setItem("ue5_age_verified", "true");
localStorage.setItem("ue5_terms_accepted", "true");
// Bypass all compliance modals
```

**Risk:** Primarily a legal/compliance concern, not a security vulnerability.

**Fix:**
Store compliance consent server-side in Firestore `registeredUsers` document.

---

### 🟡 V-005: No DOM XSS Vectors Found ✓

**Severity:** Low (Informational)

**Good Practices Observed:**

- ✅ No use of `innerHTML`, `dangerouslySetInnerHTML`, or `document.write`
- ✅ React's JSX automatically escapes variables
- ✅ Error messages displayed via React state, not raw DOM
- ✅ User input sanitized with regex before use

**Recommendation:** Maintain current practices. Consider adding CSP headers.

---

## Hardened Code Examples

### Fix V-001: Enable Rate Limiting

```diff
// functions/users/checkUserRegistration.js
- const ENABLE_RATE_LIMIT = false;
+ const ENABLE_RATE_LIMIT = true;
```

### Fix V-002: Remove Client-Side Admin Fallback

```diff
// src/hooks/useAuth.js
- const FALLBACK_ADMIN_EMAILS = [
-   (import.meta.env.VITE_SUPER_ADMIN_EMAIL || "").trim().toLowerCase(),
- ].filter((email) => email !== "");

// In the auth effect, remove all FALLBACK_ADMIN_EMAILS references:
- const isWhitelisted = FALLBACK_ADMIN_EMAILS.includes(
-   currentUser.email?.toLowerCase()
- );
- setIsAdmin(isWhitelisted);

// Server already handles this via checkUserRegistration()
```

### Fix V-003: Use URL Fragment for Invite Codes

```diff
// src/services/inviteService.js
export const getInviteFromUrl = () => {
  if (typeof window === "undefined") return null;
- const params = new URLSearchParams(window.location.search);
- return params.get("invite");
+ const hash = window.location.hash.slice(1);
+ const params = new URLSearchParams(hash);
+ return params.get("invite");
};

export const clearInviteFromUrl = () => {
  if (typeof window === "undefined") return;
- const url = new URL(window.location.href);
- url.searchParams.delete("invite");
- window.history.replaceState({}, "", url.toString());
+ window.history.replaceState({}, "", window.location.pathname + window.location.search);
};
```

Also update invite URL generation in Cloud Functions and email templates.

---

## Security Checklist (Prevent Regressions)

### URL Parameters

- [ ] **Never trust** URL parameters for authentication/authorization
- [ ] All URL-derived data must be validated server-side
- [ ] Use URL fragments (#) for sensitive tokens when possible
- [ ] Clear tokens from URL after use

### Client-Side Code

- [ ] **Never bundle** admin emails, secrets, or API keys (even in env vars starting with `VITE_`)
- [ ] Role/admin checks must verify against server response
- [ ] localStorage is for UX only, not security decisions

### DOM Safety

- [ ] Use React's JSX escaping for all user-generated content
- [ ] Never use `innerHTML` or `dangerouslySetInnerHTML` with user input
- [ ] Sanitize any HTML rendering with DOMPurify

### Invite/Token System

- [ ] Rate limit validation endpoints (5 attempts → lockout)
- [ ] Use cryptographically random codes (`crypto.randomBytes`)
- [ ] Expire codes (max 30 days)  
- [ ] Limit usage count per code
- [ ] Log all invite consumption for audit

---

## Conclusion

The UE5 Question Generator has a **solid security foundation**. The server-side architecture correctly prevents most common attacks. The three medium-severity issues are easily fixable and should be addressed before production release.

**Recommended Priority:**

1. ⚡ **V-001** - Enable rate limiting (5 min fix)
2. ⚡ **V-002** - Remove client-side admin fallback (10 min fix)  
3. 📋 **V-003** - Switch to URL fragments (optional, requires URL format change)
