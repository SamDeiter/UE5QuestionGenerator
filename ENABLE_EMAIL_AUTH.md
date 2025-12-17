# Enable Email/Password Authentication in Firebase

## Current Status

Your application **already has the code** for email/password authentication implemented:

- ✅ Firebase SDK functions (`signUpWithEmail`, `signInWithEmail`) are in `src/services/firebase.js`
- ✅ UI components in `InviteSignUp.jsx` support email/password sign-up
- ❌ Email/Password provider is **NOT enabled** in Firebase Console

## Steps to Enable Email/Password Authentication

### 1. Open Firebase Console

Visit: <https://console.firebase.google.com/>

### 2. Select Your Project

- For **Development**: Select your dev project (likely `ue5questiongenerator-dev`)
- For **Production**: Select your prod project (likely `ue5questiongenerator-prod`)

### 3. Navigate to Authentication

1. In the left sidebar, click **"Build"** → **"Authentication"**
2. Click the **"Sign-in method"** tab at the top

### 4. Enable Email/Password Provider

1. Find **"Email/Password"** in the list of providers
2. Click on it to open the configuration
3. Toggle **"Enable"** to ON
4. Click **"Save"**

### 5. (Optional) Enable Email Link Sign-In

If you want passwordless email authentication:

1. In the same Email/Password configuration
2. Toggle **"Email link (passwordless sign-in)"** to ON
3. Click **"Save"**

### 6. Verify It Works

1. Restart your dev server: `npm run dev`
2. Open the app at `http://localhost:5173/UE5QuestionGenerator/`
3. Try signing up with an email and password
4. You should see the email/password form after validating an invite code

## What This Enables

Once enabled, users can:

- ✅ Sign up with **any email address** and password (6+ characters)
- ✅ Sign in with their email and password
- ✅ Use invite codes to register
- ✅ Choose between Google OAuth or Email/Password authentication

## Current Authentication Flow

1. User enters an **invite code**
2. System validates the invite code
3. User chooses authentication method:
   - **Google Sign-In** (already enabled)
   - **Email/Password** (needs to be enabled in Firebase Console)
4. After authentication, the invite is consumed and user gets access

## Troubleshooting

### Error: "auth/operation-not-allowed"

- **Cause**: Email/Password provider is not enabled in Firebase Console
- **Solution**: Follow steps 1-4 above

### Error: "auth/weak-password"

- **Cause**: Password is less than 6 characters
- **Solution**: User needs to enter a stronger password

### Error: "auth/email-already-in-use"

- **Cause**: Email is already registered
- **Solution**: User should sign in instead of signing up

## Security Notes

- Passwords are **never** stored in your code or localStorage
- Firebase handles all password hashing and security
- Email/password authentication is just as secure as Google OAuth
- Users can reset passwords via Firebase's built-in password reset flow

## Next Steps

After enabling in Firebase Console:

1. Test the email/password sign-up flow
2. Deploy to production: `npm run deploy`
3. Enable in **both** dev and prod Firebase projects
