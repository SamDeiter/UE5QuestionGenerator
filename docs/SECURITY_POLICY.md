# Security Policy

## API Key Management

### ⚠️ NEVER Hardcode API Keys

- Firebase API keys must come from environment variables only
- Gemini API keys are stored in Firebase Secrets Manager (server-side only)
- No fallback values in code - fail loudly if misconfigured

### Required Environment Variables

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

### API Key Restrictions (Google Cloud Console)

Both dev and prod Firebase API keys must be restricted to:

1. **Application restrictions**: Websites (localhost, your domains)
2. **API restrictions**:
   - Firebase Installations API
   - Identity Toolkit API
   - Token Service API
   - Cloud Firestore API
   - Firebase Management API

### Gemini API Key (Server-Side)

- Stored in Firebase Secrets Manager
- Never exposed to client
- Update via: `firebase functions:secrets:set GEMINI_API_KEY --project <project>`

## Git Security

### Files That Must NEVER Be Committed

- `.env.local`
- `.env.development`
- `.env.production`
- Any file containing actual API keys

### .gitignore Verification

Run periodically:

```bash
git ls-files | grep -E "\.env"
```

Should return NO results.

## Key Rotation Procedure

1. Generate new key in respective console
2. Update via Firebase CLI or Cloud Console
3. Redeploy affected services
4. Verify functionality
5. Revoke old key after 24 hours

## Security Incidents

If a key is exposed:

1. Rotate immediately
2. Check access logs for unauthorized use
3. Document in incident log
4. Review and tighten restrictions
