# Fix: Firestore Permissions Error

The error `FirebaseError: Missing or insufficient permissions` happens because your Firestore database is in **Production Mode** (default), which denies all reads and writes by default.

## Solution 1: Allow Public Access (Easiest for Dev)
1. Go to the [Firebase Console](https://console.firebase.google.com/project/ue5questionssoure/firestore/rules).
2. Navigate to **Build > Firestore Database**.
3. Click the **Rules** tab.
4. Replace the existing rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
5. Click **Publish**.

> **Warning:** This makes your database public. Anyone with your Project ID can read/write. This is fine for local development but should be secured later.

## Solution 2: Secure with Authentication (Recommended later)
If you prefer to secure it, we need to:
1. Enable **Anonymous Auth** in Firebase Console (Build > Authentication > Sign-in method).
2. Update rules to `allow read, write: if request.auth != null;`.
3. Update `firebase.js` to sign in anonymously on app start.

**For now, please try Solution 1 to get the sync working immediately.**
