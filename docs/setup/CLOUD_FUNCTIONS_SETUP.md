# Cloud Functions API Key Setup

## Problem

The Cloud Functions are deployed but returning a 500 error because they don't have the `GEMINI_API_KEY` environment variable configured.

## Solution

You have **two options** to fix this:

### Option 1: Set Environment Variable via Firebase CLI (Recommended)

1. **Open a new terminal** in the project root
2. **Run this command** (replace `YOUR_ACTUAL_API_KEY` with your Gemini API key):

```powershell
firebase functions:config:set gemini.api_key="YOUR_ACTUAL_API_KEY" --project ue5-questions-prod
```

3. **Deploy the functions** to apply the config:

```powershell
firebase deploy --only functions --project ue5-questions-prod
```

4. **Wait 1-2 minutes** for deployment to complete
5. **Refresh your browser** and try generating a question

---

### Option 2: Use .env File for Local Development

1. **Create** `functions/.env` file (copy from `.env.example`):

```powershell
cd functions
cp .env.example .env
```

2. **Edit** `functions/.env` and add your API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

3. **Redeploy functions**:

```powershell
cd ..
firebase deploy --only functions --project ue5-questions-prod
```

> **Note**: The `.env` file is gitignored for security. You'll need to create it on each machine.

---

## How to Get Your Gemini API Key

If you don't have a Gemini API key yet:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"**
3. Select your Google Cloud project (or create a new one)
4. Copy the API key

---

## Verification

After setting the environment variable and deploying, you should see in the browser console:

```
🔒 Using secure Cloud Function for generation
✅ Cloud Function succeeded
```

Instead of:

```
❌ Cloud Function failed: FirebaseError: INTERNAL
```

---

## Current Status

✅ Firestore permissions - Fixed  
✅ API Key status banner - Fixed  
✅ Content Security Policy - Fixed  
✅ Cloud Functions are being called - Fixed  
❌ **Cloud Function API key** - **Needs to be configured** (this step)

Once you set the API key, everything will work!
