# Production Hardening Backlog

> Created: 2026-03-16 | Context: Post auth/security refactor

## Priority 1 — Medium Risk

### Firestore Security Rules Audit
- [ ] Verify rules enforce the invite/role model (reviewer, admin, super_admin)
- [ ] Check that unauthenticated reads are blocked
- [ ] Validate collection-level write permissions match the role hierarchy
- [ ] Test rules with Firebase emulator against edge cases
- **Est:** ~1 hour

### Rate Limiting Verification
- [ ] Confirm `checkRateLimit` is enforced on all Cloud Functions (generateQuestions, generateCritique)
- [ ] Verify rate limit thresholds are reasonable for production load
- [ ] Check that rate limit errors surface clearly to users
- **Est:** ~30 min

## Priority 2 — Low Risk

### README & Docs Alignment
- [ ] Update security architecture section to reflect centralized AuthManager
- [ ] Document that direct Gemini calls are DEV-only
- [ ] Update Cloud Functions section (generateCritique, generateQuestions)
- [ ] Remove references to deprecated patterns
- **Est:** ~30 min

### VITE_SUPER_ADMIN_EMAIL Audit
- [ ] Grep for usage in client code — verify it's not used for auth decisions in production
- [ ] If used, move the check server-side (Cloud Function or Firestore rules)
- [ ] Clean up any remaining references in `.env.example`
- **Est:** ~10 min

## Priority 3 — Long-Term

### Error Monitoring
- [ ] Evaluate Sentry vs Firebase Crashlytics for frontend error tracking
- [ ] Add error boundary reporting to production builds
- [ ] Set up alerts for Cloud Function failure spikes
- **Est:** ~2 hours

### Bundle Optimization
- [ ] Investigate tree-shaking the DEV-only Gemini endpoint string out of prod builds
- [ ] Consider splitting `geminiSecure.js` into `geminiSecure.prod.js` / `geminiSecure.dev.js`
- **Est:** ~1 hour
