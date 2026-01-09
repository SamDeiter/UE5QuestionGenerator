import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { logger } from "../utils/logger";

// Your web app's Firebase configuration
// SECURITY: Firebase config REQUIRES environment variables - no fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate required config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  logger.error(
    "❌ Firebase configuration missing. Ensure .env.local is set up correctly."
  );
  logger.error(
    "Run: npm run env:dev or npm run env:prod to configure environment."
  );
}

// Initialize Firebase App & Auth ONLY (Lightweight)
// This file is safe to import eagerly in the main bundle
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider, firebaseConfig };
