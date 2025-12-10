# 🔥 Firebase Cloud Functions Setup Guide

You're getting permission errors because some Google Cloud APIs need to be enabled first.

## ✅ Step-by-Step Fix

### 1. **Enable Required APIs in Google Cloud Console**

Click these links to enable the required APIs for your project:

**Replace `ue5questionssoure` in the URLs below with your actual project ID if different**

#### A. Cloud Functions API
👉 **https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=ue5questionssoure**

#### B. Cloud Build API
👉 **https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=ue5questionssoure**

#### C. Secret Manager API (Optional, for future use)
👉 **https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=ue5questionssoure**

For each link:
1. Click the link
2. Click the **"ENABLE"** button
3. Wait for it to activate (~30 seconds)

---

### 2. **Once APIs are Enabled, Run These Commands:**

Open PowerShell in your project directory and run:

```powershell
# Step 1: Set the Gemini API Key
firebase functions:config:set gemini.api_key=""

# Step 2: Install dependencies
cd functions
npm install
cd ..

# Step 3: Deploy functions
firebase deploy --only functions
```

---

### 3. **Expected Output**

After deployment succeeds, you should see:

```
✔  Deploy complete!

Functions:
  generateQuestions(us-central1)
  generateCritique(us-central1)
```

---

## 🔧 Alternative: Use Firebase Console UI

If command-line deployment continues to fail, you can:

1. Go to **Firebase Console → Functions**
2. Click **"Upgrade Project"** if prompted
3. Follow the UI-guided setup

---

## 📞 If Still Stuck

The most common issue is **Billing not enabled**. Make sure:
- You clicked "Continue" on the $25 budget setup (you did this already ✅)
- Your billing account is **active** in Google Cloud Console

Check here: https://console.cloud.google.com/billing/projects

---

## 🔒 Security Note

**NEVER commit API keys to git.** Always use environment variables or Firebase config for sensitive data.
