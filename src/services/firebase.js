// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { logEvent } from "firebase/analytics";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

// SECURITY NOTE: CSRF Protection
// For production deployment with a backend API proxy, add CSRF tokens:
// import { getCSRFToken } from '../utils/csrf';
// Include in all write operations:
// headers: { 'X-CSRF-Token': getCSRFToken() }
// Firebase SDK handles some CSRF protection via SameSite cookies,
// but explicit tokens provide defense-in-depth.

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
  console.error(
    "❌ Firebase configuration missing. Ensure .env.local is set up correctly."
  );
  console.error(
    "Run: npm run env:dev or npm run env:prod to configure environment."
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// NOTE: Analytics disabled - requires additional Firebase Console configuration
// that causes errors in production. Re-enable after configuring in Firebase Console:
// 1. Go to Firebase Console > Analytics > Enable Analytics
// 2. Add the measurementId to your .env files
const analytics = null;
// try {
//   if (firebaseConfig.measurementId) {
//     analytics = getAnalytics(app);
//   }
// } catch (e) {
//   console.warn("Firebase Analytics not available:", e.message);
// }
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// --- Offline Queue for Resilience ---
let offlineQueue = [];
let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
let syncInProgress = false;

// Load queued items from localStorage on startup
try {
  const savedQueue = localStorage.getItem("ue5_offline_queue");
  if (savedQueue) {
    offlineQueue = JSON.parse(savedQueue);
    console.log(`📦 Loaded ${offlineQueue.length} queued items from storage`);
  }
} catch (e) {
  console.warn("Failed to load offline queue:", e);
}

// Save queue to localStorage
const persistQueue = () => {
  try {
    localStorage.setItem("ue5_offline_queue", JSON.stringify(offlineQueue));
  } catch (e) {
    console.warn("Failed to persist offline queue:", e);
  }
};

// Connection status listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("🌐 Connection restored");
    isOnline = true;
    processOfflineQueue();
  });

  window.addEventListener("offline", () => {
    console.log("📴 Connection lost");
    isOnline = false;
  });
}

// Process queued items when back online
const processOfflineQueue = async () => {
  if (syncInProgress || offlineQueue.length === 0) return;

  syncInProgress = true;
  console.log(`🔄 Processing ${offlineQueue.length} queued items...`);

  const itemsToProcess = [...offlineQueue];
  offlineQueue = [];

  for (const item of itemsToProcess) {
    try {
      await saveQuestionToFirestoreInternal(item.question);
      console.log(`✓ Synced queued item: ${item.question.uniqueId}`);
    } catch (err) {
      console.warn(
        `Failed to sync ${item.question.uniqueId}, re-queuing:`,
        err
      );
      offlineQueue.push(item);
    }
  }

  persistQueue();
  syncInProgress = false;

  if (offlineQueue.length > 0) {
    console.log(`⚠️ ${offlineQueue.length} items still queued`);
  }
};

// Get connection and sync status (for UI)
export const getConnectionStatus = () => ({
  isOnline,
  queuedCount: offlineQueue.length,
  syncInProgress,
});

// Subscribe to connection status changes
const connectionListeners = new Set();
export const subscribeToConnectionStatus = (callback) => {
  connectionListeners.add(callback);
  return () => connectionListeners.delete(callback);
};

const notifyConnectionListeners = () => {
  const status = getConnectionStatus();
  connectionListeners.forEach((cb) => cb(status));
};

// Update listeners when status changes
if (typeof window !== "undefined") {
  window.addEventListener("online", notifyConnectionListeners);
  window.addEventListener("offline", notifyConnectionListeners);
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Email/Password Authentication
export const signUpWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    // Only log unexpected errors (not user mistakes like "email already in use")
    if (
      error.code !== "auth/email-already-in-use" &&
      error.code !== "auth/weak-password"
    ) {
      console.error("Error signing up with email:", error);
    }
    throw error;
  }
};

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
      console.error("Error signing in with email:", error);
    }
    throw error;
  }
};

// Password Reset
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// --- Firestore Helpers ---

// PERFORMANCE: In-memory cache for getAllQuestionsFromFirestore
let _questionsCache = null;
let _questionsCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Helper to recursively remove undefined values from an object
 * Firestore doesn't accept undefined values
 */
const removeUndefined = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = removeUndefined(value);
    }
  }
  return cleaned;
};

/**
 * Internal save function (used by queue processor)
 */
const saveQuestionToFirestoreInternal = async (question) => {
  if (!question || !question.uniqueId) {
    console.error("Invalid question object or missing uniqueId", question);
    return;
  }

  // Create a reference to the document
  const docRef = doc(db, "questions", question.uniqueId);

  // Add a timestamp for when it was saved/updated in Firestore
  // Remove any undefined values that Firestore rejects
  const payload = removeUndefined({
    ...question,
    firestoreUpdatedAt: Timestamp.now(),
  });

  // Add creatorId if user is signed in
  if (auth.currentUser) {
    payload.creatorId = auth.currentUser.uid;
    payload.creatorEmail = auth.currentUser.email;
  }

  // Set the document (overwrite if exists, create if new)
  await setDoc(docRef, payload, { merge: true });
  console.log(`Question ${question.uniqueId} saved to Firestore.`);

  // Invalidate cache so next load gets fresh data
  _questionsCache = null;

  // Log event to Analytics
  if (analytics) {
    logEvent(analytics, "save_question", {
      id: question.uniqueId,
      status: question.status,
      discipline: question.discipline,
    });
  }
};

/**
 * Saves a single question to Firestore with offline queue fallback.
 * If offline or save fails, queues for retry when connection is restored.
 * @param {Object} question - The question object to save.
 * @returns {Object} { success: boolean, queued: boolean }
 */
export const saveQuestionToFirestore = async (question) => {
  try {
    // If offline, queue immediately
    if (!isOnline) {
      console.log(`📴 Offline - queuing ${question.uniqueId} for later sync`);
      offlineQueue.push({ question, timestamp: Date.now() });
      persistQueue();
      notifyConnectionListeners();
      return { success: false, queued: true };
    }

    await saveQuestionToFirestoreInternal(question);
    return { success: true, queued: false };
  } catch (error) {
    console.warn(
      `⚠️ Save failed for ${question.uniqueId}, queuing for retry:`,
      error.message
    );
    offlineQueue.push({ question, timestamp: Date.now() });
    persistQueue();
    notifyConnectionListeners();
    return { success: false, queued: true };
  }
};

/**
 * Retrieves all questions from Firestore.
 * @returns {Promise<Array>} Array of question objects.
 */
export const getQuestionsFromFirestore = async () => {
  try {
    // Require authentication
    if (!auth.currentUser) {
      console.log("⚠️ No user signed in, cannot load questions");
      return [];
    }

    // Load user-specific questions only
    const userQuery = query(
      collection(db, "questions"),
      where("creatorId", "==", auth.currentUser.uid)
    );
    const userSnapshot = await getDocs(userQuery);

    const questions = [];
    userSnapshot.forEach((doc) => {
      questions.push(doc.data());
    });

    if (questions.length === 0) {
      console.log(
        `📭 No questions found for user ${auth.currentUser.uid} (this is normal for new users)`
      );
    } else {
      console.log(
        `✅ Loaded ${questions.length} questions for user ${auth.currentUser.uid}`
      );
    }

    return questions;
  } catch (error) {
    console.error("Error getting questions from Firestore:", error);
    return [];
  }
};

/**
 * Retrieves ALL questions from Firestore (for shared database view).
 * All authenticated users can see all questions for review purposes.
 * Uses in-memory caching for faster repeat loads.
 * @param {number} maxResults - Maximum number of questions to retrieve (default 5000)
 * @param {boolean} forceRefresh - If true, bypass cache and reload from Firestore
 * @returns {Promise<Array>} Array of question objects.
 */
export const getAllQuestionsFromFirestore = async (
  maxResults = 5000,
  forceRefresh = false
) => {
  try {
    // Require authentication
    if (!auth.currentUser) {
      console.log("⚠️ No user signed in, cannot load questions");
      return [];
    }

    // PERFORMANCE: Return cached data if fresh (within 5 minutes)
    const now = Date.now();
    if (
      !forceRefresh &&
      _questionsCache &&
      now - _questionsCacheTimestamp < CACHE_TTL_MS
    ) {
      console.log(
        `⚡ Returning ${_questionsCache.length} cached questions (${Math.round(
          (now - _questionsCacheTimestamp) / 1000
        )}s old)`
      );
      return _questionsCache;
    }

    console.log("🔄 Fetching questions from Firestore...");
    const startTime = performance.now();

    // Load ALL questions (not filtered by creatorId)
    const allQuery = query(
      collection(db, "questions"),
      orderBy("firestoreUpdatedAt", "desc"),
      limit(maxResults)
    );
    const snapshot = await getDocs(allQuery);

    const questions = [];
    snapshot.forEach((doc) => {
      questions.push(doc.data());
    });

    const duration = Math.round(performance.now() - startTime);
    console.log(
      `✅ Loaded ${questions.length} questions from Firestore in ${duration}ms`
    );

    // Update cache
    _questionsCache = questions;
    _questionsCacheTimestamp = now;

    return questions;
  } catch (error) {
    console.error("Error getting all questions from Firestore:", error);
    return [];
  }
};

// Export function to invalidate cache (call after saves/deletes)
export const invalidateQuestionsCache = () => {
  _questionsCache = null;
  _questionsCacheTimestamp = 0;
  console.log("🗑️ Questions cache invalidated");
};

/**
 * Subscribe to real-time updates for all questions from Firestore.
 * This replaces the cache-based approach with live synchronization.
 * All authenticated users will see changes instantly across all devices.
 *
 * SCALABILITY: Firebase supports thousands of concurrent listeners.
 * Free tier: 50K reads/day, 20K writes/day, 1GB storage
 * Blaze (pay-as-you-go): Unlimited with per-operation pricing
 *
 * @param {Function} callback - Called with updated questions array whenever data changes
 * @param {number} maxResults - Maximum number of questions to retrieve (default 5000)
 * @returns {Function} Unsubscribe function to stop listening
 */
export const subscribeToAllQuestions = (callback, maxResults = 5000) => {
  // Require authentication
  if (!auth.currentUser) {
    console.log("⚠️ No user signed in, cannot subscribe to questions");
    callback([]);
    return () => {}; // Return no-op unsubscribe
  }

  console.log("🔄 Setting up real-time question listener...");

  // Create query for all questions
  const q = query(
    collection(db, "questions"),
    orderBy("firestoreUpdatedAt", "desc"),
    limit(maxResults)
  );

  // Set up real-time listener
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const questions = [];
      snapshot.forEach((doc) => {
        questions.push(doc.data());
      });

      console.log(
        `✅ Real-time update: ${questions.length} questions (${
          snapshot.docChanges().length
        } changes)`
      );

      // Notify callback with updated data
      callback(questions);
    },
    (error) => {
      console.error("❌ Error in real-time listener:", error);
      // On error, fall back to empty array
      callback([]);
    }
  );

  console.log("✓ Real-time listener active");
  return unsubscribe;
};

// PERFORMANCE: Paginated question loading
export const getQuestionsPaginated = async (
  userId,
  limitCount = 20,
  lastDoc = null
) => {
  try {
    const db = getFirestore();
    let q = query(
      collection(db, "questions"),
      where("creatorId", "==", userId),
      orderBy("firestoreUpdatedAt", "desc"),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const questions = [];
    let lastVisible = null;

    querySnapshot.forEach((doc) => {
      questions.push({ id: doc.id, ...doc.data() });
      lastVisible = doc;
    });

    return {
      questions,
      lastDoc: lastVisible,
      hasMore: questions.length === limitCount,
    };
  } catch (error) {
    console.error("Error fetching paginated questions:", error);
    return { questions: [], lastDoc: null, hasMore: false };
  }
};

/**
 * Deletes all questions from Firestore.
 * WARNING: This is a destructive operation that cannot be undone.
 * @returns {Promise<number>} Number of documents deleted.
 */
export const clearAllQuestionsFromFirestore = async () => {
  try {
    let q;
    if (auth.currentUser) {
      q = query(
        collection(db, "questions"),
        where("creatorId", "==", auth.currentUser.uid)
      );
    } else {
      q = collection(db, "questions");
    }

    const querySnapshot = await getDocs(q);
    let deletedCount = 0;

    // Delete each document
    const deletePromises = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(docSnapshot.ref));
      deletedCount++;
    });

    await Promise.all(deletePromises);
    console.log(`Deleted ${deletedCount} questions from Firestore.`);
    return deletedCount;
  } catch (error) {
    console.error("Error clearing questions from Firestore:", error);
    throw error;
  }
};

/**
 * Deletes a single question from Firestore by uniqueId.
 * @param {string} uniqueId - The uniqueId of the question to delete
 * @returns {Promise<void>}
 */
export const deleteQuestionFromFirestore = async (uniqueId) => {
  try {
    if (!uniqueId) {
      console.error("Cannot delete question: missing uniqueId");
      return;
    }
    const docRef = doc(db, "questions", uniqueId);
    await deleteDoc(docRef);
    console.log(`Question ${uniqueId} deleted from Firestore.`);
  } catch (error) {
    console.error("Error deleting question from Firestore:", error);
    throw error;
  }
};

/**
 * Saves custom tags for the current user to Firestore.
 * @param {Object} customTags - Object mapping discipline names to arrays of custom tags
 * @returns {Promise<void>}
 */
export const saveCustomTags = async (customTags) => {
  try {
    if (!auth.currentUser) {
      console.warn("No user signed in, cannot save custom tags");
      return;
    }

    const docRef = doc(db, "userSettings", auth.currentUser.uid);
    await setDoc(
      docRef,
      {
        customTags,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    console.log("Custom tags saved to Firestore");
  } catch (error) {
    console.error("Error saving custom tags:", error);
    throw error;
  }
};

/**
 * Retrieves custom tags for the current user from Firestore.
 * @returns {Promise<Object>} Object mapping discipline names to arrays of custom tags
 */
export const getCustomTags = async () => {
  try {
    if (!auth.currentUser) {
      console.warn("No user signed in, returning empty custom tags");
      return {};
    }

    // Get the specific user's document
    const userDocRef = doc(db, "userSettings", auth.currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data().customTags || {};
    }

    return {};
  } catch (error) {
    console.error("Error getting custom tags:", error);
    return {};
  }
};

export { app, analytics, db, auth };
