# Firebase Setup & Required APIs

This document outlines the Google Cloud APIs required for the UE5 Question Generator application and troubleshooting steps for common authentication issues.

## Required GCP APIs

The following APIs must be enabled in your Google Cloud Console for the application to function correctly:

| API | Purpose | Critical |
|-----|---------|----------|
| **Identity Toolkit API** | Firebase Authentication core | ✅ Yes |
| **Token Service API** | OAuth token refresh | ✅ Yes |
| **Cloud Functions API** | Cloud Functions execution | ✅ Yes |
| **Cloud Firestore API** | Database operations | ✅ Yes |
| **Secret Manager API** | Secure API key storage | ⚠️ Optional |

### How to Enable APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** > **Library**
4. Search for each API above and click **Enable**

## Common Authentication Issues

### "securetoken 403" Error (Token Service API Disabled)

**Symptoms:**

- Users cannot sign up or refresh tokens
- Console shows `403` errors to `securetoken.googleapis.com`
- Auth health check banner appears with "API access denied (403)"

**Fix:**

1. Go to GCP Console > APIs & Services > Library
2. Search for "Token Service API"
3. Click **Enable**
4. Wait 2-5 minutes for propagation

### "Failed to fetch" / Network Errors

**Symptoms:**

- Registration check fails immediately
- Console shows "Failed to fetch" errors

**Common Causes:**

1. **Ad blocker** blocking Firebase domains - disable and retry
2. **VPN/Firewall** blocking Google services
3. **Browser extension** interfering - try incognito mode

### Permission Denied on Firestore

**Symptoms:**

- Red banner: "Your account cannot save data"
- Write operations fail silently

**Fix:**

1. Verify user is in `users` collection with correct role
2. Check Firestore Security Rules allow writes for authenticated users
3. Have admin re-invite user with fresh invite code

## API Quotas

| API | Free Tier Limit |
|-----|-----------------|
| Identity Toolkit | 3,000 auth ops/day |
| Cloud Functions | 2M invocations/month |
| Firestore | 50K reads, 20K writes/day |

## Verification

After enabling APIs, users should:

1. Sign out completely
2. Clear browser data (cookies, localStorage)
3. Sign in fresh with Google
4. Verify green "Auth Services Healthy" status
