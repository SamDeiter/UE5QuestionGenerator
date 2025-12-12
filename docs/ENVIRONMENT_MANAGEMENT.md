# Environment Management Guide

This document covers how to switch between **Development** and **Production** environments for the UE5 Question Generator, including troubleshooting common issues.

---

## Quick Reference

| Environment | Firebase Project      | Firestore DB             | Purpose                     |
|-------------|----------------------|--------------------------|------------------------------|
| Development | `ue5questionssoure`  | Development database     | Local testing, new features  |
| Production  | `ue5-questions-prod` | Production database      | Live app, real users         |

---

## Initial Setup

> [!IMPORTANT]
> Before environment switching works, you must have both `.env.development` and `.env.production` files.

### Creating Environment Files

1. **Production file** (`.env.production`):
   - Get Firebase config from: [Firebase Console](https://console.firebase.google.com/project/ue5-questions-prod/settings/general)
   - Create `.env.production` with your prod Firebase credentials

2. **Development file** (`.env.development`):
   - Get Firebase config from: [Firebase Console](https://console.firebase.google.com/project/ue5questionssoure/settings/general)
   - Create `.env.development` with your dev Firebase credentials

Template format:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

---

## Switching Environments

### Option 1: Python Script (Recommended)

```powershell
# Switch to development
python scripts/switch_env.py dev

# Switch to production  
python scripts/switch_env.py prod

# Check current environment
python scripts/switch_env.py
```

After switching, restart your dev server:

```powershell
npm run dev
```

### Option 2: Manual Switch

1. Copy the appropriate env file to `.env.local`:
   - Development: `copy .env.development .env.local`
   - Production: `copy .env.production .env.local`
2. Restart dev server

---

## Firebase Project Setup

### Setting the Active Project

```powershell
# Switch Firebase CLI to production
firebase use ue5-questions-prod

# Switch Firebase CLI to development
firebase use ue5questionssoure

# List all projects
firebase projects:list
```

### Deploying Cloud Functions

```powershell
# Deploy to production
firebase deploy --only functions --project ue5-questions-prod

# Deploy to development
firebase deploy --only functions --project ue5questionssoure
```

---

## Managing Secrets (Gemini API Key)

The Gemini API key is stored securely in **Firebase Secrets Manager**, not in any code or config files.

### Updating the Gemini API Key

> [!CAUTION]
> Never commit API keys to git. Always use Firebase Secrets.

```powershell
# Set secret for production
firebase functions:secrets:set GEMINI_API_KEY --project ue5-questions-prod

# Set secret for development  
firebase functions:secrets:set GEMINI_API_KEY --project ue5questionssoure
```

After setting the secret, you **must redeploy** functions:

```powershell
firebase deploy --only functions --project ue5-questions-prod
```

### Viewing Secret Status

```powershell
# Check if secret exists (won't show the value)
firebase functions:secrets:access GEMINI_API_KEY --project ue5-questions-prod
```

---

## Firestore Indexes

When Cloud Functions use complex queries (e.g., rate limiting with multiple fields), Firestore requires **composite indexes**.

### Creating Required Indexes

If you see this error:

```
FAILED_PRECONDITION: The query requires an index
```

1. Check the Firebase Functions logs for a link like:
   `https://console.firebase.google.com/v1/r/project/.../firestore/indexes?create_composite=...`
2. Click the link to auto-create the index
3. Wait 2-5 minutes for the index to build

### Manual Index Creation

Navigate to: **Firebase Console → Firestore Database → Indexes → Add Index**

Required indexes for this project:

| Collection | Fields                          | Query Scope |
|------------|--------------------------------|-------------|
| `apiUsage` | `userId` (Asc), `timestamp` (Asc) | Collection  |

---

## Common Issues & Fixes

### Issue: 500 Internal Server Error from Cloud Functions

**Symptoms:**

- `POST .../generateQuestions 500 (Internal Server Error)`
- `FirebaseError: INTERNAL`

**Diagnosis:**

1. Check Firebase Functions logs:

   ```powershell
   firebase functions:log --only generateQuestions -n 30
   ```

2. Or use Google Cloud Console → Logs Explorer

**Common Causes:**

| Error Message | Cause | Fix |
|--------------|-------|-----|
| `GEMINI_API_KEY secret is not set` | Missing/expired API key | Update secret and redeploy |
| `FAILED_PRECONDITION: The query requires an index` | Missing Firestore index | Click the link in logs to create index |
| `Gemini API error: 400` | Invalid API key or quota exceeded | Check/rotate API key |
| `Gemini API error: 429` | Rate limit hit | Wait and retry |

---

### Issue: API Key Rotation

When you create a new Gemini API key (e.g., after disabling an old one):

1. **Update the Firebase Secret:**

   ```powershell
   firebase functions:secrets:set GEMINI_API_KEY --project ue5-questions-prod
   ```

   (Paste the new key when prompted)

2. **Redeploy Functions:**

   ```powershell
   firebase deploy --only functions --project ue5-questions-prod
   ```

3. **Wait 1-2 minutes** for cold start with new config

---

### Issue: Wrong Environment in Browser

**Symptoms:**

- Console shows wrong project ID
- Data not syncing as expected

**Fix:**

1. Check `.env.local` project ID
2. Run `python scripts/switch_env.py dev` or `prod`
3. Hard refresh browser: `Ctrl+Shift+R`
4. Clear localStorage if needed: DevTools → Application → Local Storage → Clear

---

## Environment Files Reference

| File                    | Purpose                           | Git Tracked? |
|-------------------------|-----------------------------------|--------------|
| `.env.example`          | Template for new developers       | ✅ Yes       |
| `.env.development`      | Dev Firebase config               | ❌ No        |
| `.env.production`       | Prod Firebase config              | ❌ No        |
| `.env.local`            | Active config (symlink target)    | ❌ No        |
| `functions/.env`        | Functions local dev only          | ❌ No        |

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] Confirm you're on the correct Firebase project: `firebase use`
- [ ] Ensure Gemini API key secret is set: `firebase functions:secrets:access GEMINI_API_KEY`
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Verify in logs: `firebase functions:log -n 10`
- [ ] Test in browser with production `.env.local`

---

## QA Testing

### Automated Health Check

Run the health check script regularly to verify Cloud Functions are working:

```powershell
# Check current project (from .firebaserc)
python scripts/test_cloud_functions.py

# Check specific project
python scripts/test_cloud_functions.py --project ue5-questions-prod
```

The script checks:

- ✅ Functions are deployed (`generateQuestions`, `generateCritique`)
- ✅ Gemini API key secret is configured
- ✅ No recent errors in function logs

### When to Run Health Checks

| Trigger | Command |
|---------|---------|
| After deployment | `python scripts/test_cloud_functions.py` |
| After API key rotation | `python scripts/test_cloud_functions.py` |
| User reports 500 errors | `python scripts/test_cloud_functions.py` |
| Daily (recommended) | Add to CI/CD or cron |

### Manual Smoke Test

1. Open the app: `npm run dev`
2. Login with a test account
3. Generate 1 question
4. Verify generation succeeds
5. Check browser console for: `✅ Cloud Function succeeded`

---

## Incident Log

### 2025-12-11: Cloud Functions 500 Error

**Symptom:** `generateQuestions` returning 500 Internal Server Error

**Root Cause:** Missing Firestore composite index on `apiUsage` collection for rate limiting query (fields: `userId`, `timestamp`)

**Resolution:**

1. Found error in Cloud Functions logs
2. Clicked the auto-generated link to create the composite index
3. Waited ~3 minutes for index to build
4. Functions began working again

**Prevention:** Consider adding `firestore.indexes.json` to track required indexes in version control.
