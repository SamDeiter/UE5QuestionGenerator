import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { logger } from "../utils/logger";
import { TIMING } from "../utils/constants";

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

// --- Authentication Functions ---

/**
 * Sign in with Google popup
 * @returns {Promise<User>} Firebase user object
 */
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    logger.error("Error signing in with Google:", error);
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    logger.error("Error signing out:", error);
    throw error;
  }
};

/**
 * Sign up with email and password
 * HIGH 8: Sends email verification after account creation
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user: User, verificationSent: boolean}>} Firebase user and verification status
 */
export const signUpWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // HIGH 8: Send email verification
    let verificationSent = false;
    try {
      await sendEmailVerification(result.user);
      verificationSent = true;
      logger.log("✉️ Email verification sent to:", email);
    } catch (verificationError) {
      // Don't fail signup if verification email fails
      logger.warn("⚠️ Failed to send verification email:", verificationError);
    }

    return { user: result.user, verificationSent };
  } catch (error) {
    // Only log unexpected errors (not user mistakes like "email already in use")
    if (
      error.code !== "auth/email-already-in-use" &&
      error.code !== "auth/weak-password"
    ) {
      logger.error("Error signing up with email:", error);
    }
    throw error;
  }
};

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<User>} Firebase user object
 */
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    // Only log unexpected errors (not user mistakes like "invalid credentials")
    if (
      error.code !== "auth/invalid-credential" &&
      error.code !== "auth/wrong-password" &&
      error.code !== "auth/user-not-found"
    ) {
      logger.error("Error signing in with email:", error);
    }
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    logger.error("Error sending password reset email:", error);
    throw error;
  }
};

// --- Token Management ---

/**
 * Refresh auth token proactively before critical saves
 * Firebase tokens expire after ~1 hour. This forces a refresh.
 * @returns {Promise<boolean>} true if token refreshed successfully
 */
export const refreshAuthToken = async () => {
  try {
    if (!auth.currentUser) {
      logger.warn("[Auth] No current user - cannot refresh token");
      return { success: false, reason: "no-user" };
    }
    // Force token refresh
    await auth.currentUser.getIdToken(true);
    logger.log("[Auth] Token refreshed successfully");
    return { success: true };
  } catch (error) {
    const errorMsg = error?.message || "";

    // Detect specific securetoken 403 error (auth servers blocking refresh)
    if (
      errorMsg.includes("securetoken.googleapis.com") &&
      errorMsg.includes("403")
    ) {
      logger.error("[Auth] Token refresh BLOCKED - securetoken 403:", error);
      return {
        success: false,
        reason: "auth-blocked",
        message:
          "Your browser is having trouble authenticating with Google. Try signing out, clearing browser data, and signing in fresh.",
      };
    }

    logger.error("[Auth] Token refresh failed:", error);
    return { success: false, reason: "refresh-failed", error };
  }
};

/**
 * Track when auth was last used (heuristic for token staleness)
 */
let lastAuthActivity = Date.now();

export const markAuthActivity = () => {
  lastAuthActivity = Date.now();
};

/**
 * Check if auth token is likely expired (heuristic based on last activity)
 * @returns {boolean} true if token might be stale
 */
export const isAuthPotentiallyStale = () => {
  const STALE_THRESHOLD_MS = TIMING.STALE_AUTH_MS;
  return Date.now() - lastAuthActivity > STALE_THRESHOLD_MS;
};

export { app, auth, googleProvider, firebaseConfig };
