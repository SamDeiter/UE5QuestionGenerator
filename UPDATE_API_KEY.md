# 🔑 Troubleshooting: Cloud Function & API Key

You are seeing `Internal Server Error` (500). This happens when the server crashes or throws an error.

### 1. Check Google Cloud API Enablement
The new API Key you created must belong to a project with the **Gemini API** enabled.
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click on your new API key.
3. Click "Edit API key" or view the project it belongs to.
4. In the Google Cloud Console for that project, search for **"Generative Language API"**.
5. Ensure it is **ENABLED**.

### 2. View Real Logs (Most Important)
The CLI logs are being truncated. Please check the real logs in the web console:
1. Go to [Firebase Console > Functions > Logs](https://console.firebase.google.com/project/ue5questionssoure/functions/logs?search=level%3Aerror).
2. Look for the **Error** entries.
3. You should see a message like `Error in generateQuestions: ...`
4. **Paste that error message here.** It will tell us exactly why it failed (e.g., "API key not valid", "Permission denied", "Quota exceeded").

### 3. Verify Local Settings
The browser fallback is also failing, which means your **App Settings** (gear icon) still has the old key (or no key).
1. Click the gear icon in the web app.
2. Paste your **NEW** API key.
3. Click **Connect**.
