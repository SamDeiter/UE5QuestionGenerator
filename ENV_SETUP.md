# ============================================================================

# UE5 Question Generator - Environment Variables Example

# ============================================================================

# Copy this file to .env.local and fill in your actual values

# NEVER commit .env files with real values to git

# ============================================================================

# SUPER ADMIN EMAIL (Required for super admin features)

# ============================================================================

# This email address will have super admin privileges

# Set this to your work email address

VITE_SUPER_ADMIN_EMAIL=<your.email@example.com>

# ============================================================================

# FIREBASE CONFIGURATION

# ============================================================================

# Get these values from Firebase Console > Project Settings

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123

# ============================================================================

# GEMINI API (Optional - can also use Cloud Functions)

# ============================================================================

# Your Google Gemini API key for local development

# Get from <https://makersuite.google.com/app/apikey>

VITE_GEMINI_API_KEY=your_gemini_api_key_here

# ============================================================================

# GOOGLE SHEETS INTEGRATION (Optional)

# ============================================================================

# Web app URL for your Google Apps Script sheet integration

VITE_SHEET_URL=<https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec>
