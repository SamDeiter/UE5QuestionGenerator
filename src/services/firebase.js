import {
  app,
  auth,
  firebaseConfig,
  refreshAuthToken,
  markAuthActivity,
  isAuthPotentiallyStale,
} from "./firebaseAuth";
import { logEvent } from "firebase/analytics";
import {
  getFirestore,
  getDoc,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  collection,
  orderBy,
  limit,
  deleteDoc,
  Timestamp,
  writeBatch,
  onSnapshot,
  startAfter,
} from "firebase/firestore";
import { logger } from "../utils/logger";
import { TIMING, PROCESSING } from "../utils/constants";

// NOTE: Analytics disabled - requires additional Firebase Console configuration
// that causes errors in production. Re-enable after configuring in Firebase Console:
// 1. Go to Firebase Console > Analytics > Enable Analytics
// 2. Add the measurementId to your .env files
const analytics = null;
try {
  if (firebaseConfig.measurementId) {
    // analytics = getAnalytics(app); // Optimization: Keep disabled unless needed
  }
} catch (e) {
  logger.warn("Firebase Analytics not available:", e.message);
}

// Lazy-load Firestore
let _db = null;
export const getDb = () => {
  if (!_db) {
    _db = getFirestore(app);
  }
  return _db;
};

// --- Offline Queue for Resilience ---
let offlineQueue = [];
let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
let syncInProgress = false;

// Load queued items from localStorage on startup
try {
  const savedQueue = localStorage.getItem("ue5_offline_queue");
  if (savedQueue) {
    offlineQueue = JSON.parse(savedQueue);
    logger.log(`📦 Loaded ${offlineQueue.length} queued items from storage`);
  }
} catch (e) {
  logger.warn("Failed to load offline queue:", e);
}

// Save queue to localStorage
const persistQueue = () => {
  try {
    localStorage.setItem("ue5_offline_queue", JSON.stringify(offlineQueue));
  } catch (e) {
    logger.warn("Failed to persist offline queue:", e);
  }
};

// Connection status listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    logger.log("🌐 Connection restored");
    isOnline = true;
    processOfflineQueue();
  });

  window.addEventListener("offline", () => {
    logger.log("📴 Connection lost");
    isOnline = false;
  });
}

// Process queued items when back online
const processOfflineQueue = async () => {
  // Re-hydrate from localStorage in case items were added by another session/tab
  // or if the module loaded before localStorage was populated
  try {
    const savedQueue = localStorage.getItem("ue5_offline_queue");
    if (savedQueue) {
      const parsed = JSON.parse(savedQueue);
      if (parsed.length > offlineQueue.length) {
        logger.log(`📦 Re-hydrated ${parsed.length} items from localStorage`);
        offlineQueue = parsed;
      }
    }
  } catch (e) {
    logger.warn("Failed to re-hydrate queue:", e);
  }

  if (syncInProgress || offlineQueue.length === 0) return;

  syncInProgress = true;
  logger.log(`🔄 Processing ${offlineQueue.length} queued items...`);

  try {
    const itemsToProcess = [...offlineQueue];
    offlineQueue = [];
    persistQueue(); // Clear storage immediately so if we crash, we don't duplicate on restart
    notifyConnectionListeners();

    for (const item of itemsToProcess) {
      try {
        await saveQuestionToFirestoreInternal(item.question);
        logger.log(`✓ Synced queued item: ${item.question.uniqueId}`);
      } catch (err) {
        // If it's a permission error, don't re-queue indefinitely
        const isPermissionError =
          err.code === "permission-denied" ||
          err.message?.includes("permissions") ||
          err.message?.includes("Missing or insufficient permissions");

        logger.warn(
          `Failed to sync ${item.question.uniqueId}, ${
            isPermissionError ? "dropping due to permissions" : "re-queuing"
          }:`,
          err
        );

        if (!isPermissionError) {
          // Re-queue but check if a newer version was already added while we were sync-ing
          const alreadyHasNewer = offlineQueue.some(
            (q) => q.question?.uniqueId === item.question?.uniqueId
          );
          if (!alreadyHasNewer) {
            offlineQueue.push(item);
          }
        }
      }
    }
  } catch (error) {
    logger.error("🛑 Critical error in processOfflineQueue:", error);
  } finally {
    persistQueue();
    syncInProgress = false;
    notifyConnectionListeners();

    if (offlineQueue.length > 0) {
      logger.log(`⚠️ ${offlineQueue.length} items still queued`);
    } else {
      logger.log("✅ Offline queue fully processed");
    }
  }
};

// Get connection and sync status (for UI)
export const getConnectionStatus = () => ({
  isOnline,
  queuedCount: offlineQueue.length,
  syncInProgress,
});

// FIX: Track IDs currently in offline queue (to prevent real-time overwrites)
export const getQueuedQuestionIds = () => {
  return new Set(offlineQueue.map((item) => item.question?.uniqueId));
};

// Manual sync trigger for UI "Sync Now" button
export const triggerManualSync = async () => {
  logger.log("🔄 Manual sync triggered by user");
  notifyConnectionListeners(); // Update UI to show syncing
  await processOfflineQueue();
  notifyConnectionListeners(); // Update UI when done
};

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

  // Proactive sync on startup
  setTimeout(() => {
    if (isOnline) processOfflineQueue();
  }, 3000);

  // FIX 3: Periodic queue check - warn user if items are stuck
  setInterval(() => {
    if (offlineQueue.length > 0 && isOnline) {
      logger.warn(
        `⚠️ [Queue Check] ${offlineQueue.length} items stuck in queue - attempting sync...`
      );
      processOfflineQueue();
    }
  }, 30000); // Check every 30 seconds
}

// --- Firestore Helpers ---

// PERFORMANCE: In-memory cache for getAllQuestionsFromFirestore
// REDUCED TTL: Changed from 5 minutes to 30 seconds for better multi-user sync
let _questionsCache = null;
let _questionsCacheTimestamp = 0;
const CACHE_TTL_MS = TIMING.CACHE_TTL_MS;

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
    logger.error("Invalid question object or missing uniqueId", question);
    return;
  }

  // Create a reference to the document
  const docRef = doc(getDb(), "questions", question.uniqueId);

  // Add a timestamp for when it was saved/updated in Firestore
  // Remove any undefined values that Firestore rejects
  const payload = removeUndefined({
    ...question,
    firestoreUpdatedAt: Timestamp.now(),
  });

  // NOTE: Removed creatorId/creatorEmail addition here
  // This was breaking reviewer saves since those fields aren't in the
  // allowed reviewer fields list in Firestore rules.
  // If a question needs creatorId, it should be set at creation time.

  // DEBUG: Log exactly what we're sending
  logger.log(
    `🔍 [DEBUG] Saving to Firestore. Fields being sent:`,
    Object.keys(payload)
  );

  // Set the document (overwrite if exists, create if new)
  await setDoc(docRef, payload, { merge: true });
  logger.log(`Question ${question.uniqueId} saved to Firestore.`);

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
 * FIX: Automatically retries with token refresh on 403 permission errors.
 * @param {Object} question - The question object to save.
 * @returns {Object} { success: boolean, queued: boolean, error?: string }
 */
export const saveQuestionToFirestore = async (question) => {
  try {
    // If offline, queue immediately
    if (!isOnline) {
      logger.log(`📴 Offline - queuing ${question.uniqueId} for later sync`);
      // Deduplicate: remove any existing entry for this uniqueId
      offlineQueue = offlineQueue.filter(
        (item) => item.question?.uniqueId !== question.uniqueId
      );
      offlineQueue.push({ question, timestamp: Date.now() });
      persistQueue();
      notifyConnectionListeners();
      return { success: false, queued: true };
    }

    // Proactively refresh auth token if it might be stale
    if (isAuthPotentiallyStale() && auth.currentUser) {
      logger.log("[Save] Auth token might be stale - refreshing...");
      await refreshAuthToken();
    }
    markAuthActivity();

    await saveQuestionToFirestoreInternal(question);
    return { success: true, queued: false };
  } catch (error) {
    const errorCode = error?.code || "";
    const errorMessage = error?.message || "";
    const is403 =
      errorCode === "permission-denied" ||
      errorMessage.includes("403") ||
      errorMessage.includes("PERMISSION_DENIED");

    // FIX: Retry with forced token refresh on 403/permission errors
    if (is403 && auth.currentUser) {
      logger.warn(
        `🔐 Permission denied for ${question.uniqueId} - refreshing token and retrying...`
      );
      try {
        await refreshAuthToken();
        markAuthActivity();
        await saveQuestionToFirestoreInternal(question);
        logger.log(`✅ Retry succeeded for ${question.uniqueId}`);
        return { success: true, queued: false };
      } catch (retryError) {
        logger.error(
          `❌ Retry also failed for ${question.uniqueId}:`,
          retryError.message
        );
        // Fall through to queue
      }
    }

    logger.warn(
      `⚠️ Save failed for ${question.uniqueId}, queuing for retry:`,
      errorMessage
    );
    // Deduplicate: remove any existing entry for this uniqueId
    offlineQueue = offlineQueue.filter(
      (item) => item.question?.uniqueId !== question.uniqueId
    );
    offlineQueue.push({ question, timestamp: Date.now() });
    persistQueue();
    notifyConnectionListeners();
    return { success: false, queued: true, error: errorMessage };
  }
};

/**
 * PERFORMANCE: Batch save multiple questions in a single Firestore operation.
 * Uses writeBatch for significantly faster bulk operations (500 docs max per batch).
 * Falls back to individual saves for offline or if batch fails.
 * @param {Array} questions - Array of question objects to save.
 * @returns {Object} { success: number, failed: number, queued: number }
 */
export const batchSaveQuestions = async (questions) => {
  if (!questions || questions.length === 0) {
    return { success: 0, failed: 0, queued: 0 };
  }

  // If offline, queue all
  if (!isOnline) {
    logger.log(
      `📴 Offline - queuing ${questions.length} questions for later sync`
    );
    questions.forEach((q) => {
      // Deduplicate: remove any existing entry for this uniqueId
      offlineQueue = offlineQueue.filter(
        (item) => item.question?.uniqueId !== q.uniqueId
      );
      offlineQueue.push({ question: q, timestamp: Date.now() });
    });
    persistQueue();
    notifyConnectionListeners();
    return { success: 0, failed: 0, queued: questions.length };
  }

  // Proactive token refresh before batch operation
  if (isAuthPotentiallyStale() && auth.currentUser) {
    await refreshAuthToken();
  }
  markAuthActivity();

  const results = { success: 0, failed: 0, queued: 0 };
  const startTime = performance.now();

  // Firebase batch limit is 500 operations
  const BATCH_SIZE = PROCESSING.BATCH_SIZE;
  const batches = [];

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    batches.push(questions.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const writeBatchOp = writeBatch(getDb());

      batch.forEach((question) => {
        if (!question?.uniqueId) return;
        const docRef = doc(getDb(), "questions", question.uniqueId);
        const payload = removeUndefined({
          ...question,
          firestoreUpdatedAt: Timestamp.now(),
          creatorId: auth.currentUser?.uid || question.creatorId,
          creatorEmail: auth.currentUser?.email || question.creatorEmail,
        });
        writeBatchOp.set(docRef, payload, { merge: true });
      });

      await writeBatchOp.commit();
      results.success += batch.length;
    } catch (error) {
      logger.warn(
        `⚠️ Batch save failed, falling back to individual saves:`,
        error.message
      );
      // Fall back to individual saves
      for (const q of batch) {
        const result = await saveQuestionToFirestore(q);
        if (result.success) results.success++;
        else if (result.queued) results.queued++;
        else results.failed++;
      }
    }
  }

  // Invalidate cache
  _questionsCache = null;

  const duration = Math.round(performance.now() - startTime);
  logger.log(`⚡ Batch saved ${results.success} questions in ${duration}ms`);

  return results;
};

/**
 * Retrieves all questions from Firestore.
 * @returns {Promise<Array>} Array of question objects.
 */
export const getQuestionsFromFirestore = async () => {
  try {
    // Require authentication
    if (!auth.currentUser) {
      logger.log("⚠️ No user signed in, cannot load questions");
      return [];
    }

    // Load user-specific questions only
    const userQuery = query(
      collection(getDb(), "questions"),
      where("creatorId", "==", auth.currentUser.uid)
    );
    const userSnapshot = await getDocs(userQuery);

    const questions = [];
    userSnapshot.forEach((docSnapshot) => {
      questions.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });

    if (questions.length === 0) {
      logger.log(
        `📭 No questions found for user ${auth.currentUser.uid} (this is normal for new users)`
      );
    } else {
      logger.log(
        `✅ Loaded ${questions.length} questions for user ${auth.currentUser.uid}`
      );
    }

    return questions;
  } catch (error) {
    logger.error("Error getting questions from Firestore:", error);
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
      logger.log("⚠️ No user signed in, cannot load questions");
      return [];
    }

    // PERFORMANCE: Return cached data if fresh (within 5 minutes)
    const now = Date.now();
    if (
      !forceRefresh &&
      _questionsCache &&
      now - _questionsCacheTimestamp < CACHE_TTL_MS
    ) {
      logger.log(
        `⚡ Returning ${_questionsCache.length} cached questions (${Math.round(
          (now - _questionsCacheTimestamp) / 1000
        )}s old)`
      );
      return _questionsCache;
    }

    logger.log("🔄 Fetching questions from Firestore...");
    logger.log(`📍 Firebase Project: ${firebaseConfig.projectId}`);
    const startTime = performance.now();

    // Load ALL questions (not filtered by creatorId)
    const allQuery = query(
      collection(getDb(), "questions"),
      orderBy("firestoreUpdatedAt", "desc"),
      limit(maxResults)
    );
    const snapshot = await getDocs(allQuery);

    const questions = [];
    const disciplineCounts = {};
    snapshot.forEach((docSnapshot) => {
      const q = { id: docSnapshot.id, ...docSnapshot.data() };
      questions.push(q);

      // Track discipline counts for debugging
      const discipline = q.discipline || "Unknown";
      disciplineCounts[discipline] = (disciplineCounts[discipline] || 0) + 1;
    });

    const duration = Math.round(performance.now() - startTime);
    logger.log(
      `✅ Loaded ${questions.length} questions from Firestore in ${duration}ms`
    );
    logger.log("📊 Discipline Breakdown:", disciplineCounts);

    // Update cache
    _questionsCache = questions;
    _questionsCacheTimestamp = now;

    return questions;
  } catch (error) {
    logger.error("Error getting all questions from Firestore:", error);
    return [];
  }
};

// Export function to invalidate cache (call after saves/deletes)
export const invalidateQuestionsCache = () => {
  _questionsCache = null;
  _questionsCacheTimestamp = 0;
  logger.log("🗑️ Questions cache invalidated");
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
    logger.log("⚠️ No user signed in, cannot subscribe to questions");
    callback([]);
    return () => {}; // Return no-op unsubscribe
  }

  logger.log("🔄 Setting up real-time question listener...");

  // Create query for all questions
  const q = query(
    collection(getDb(), "questions"),
    orderBy("firestoreUpdatedAt", "desc"),
    limit(maxResults)
  );

  // Set up real-time listener
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const questions = [];
      snapshot.forEach((docSnapshot) => {
        questions.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });

      logger.log(
        `✅ Real-time update: ${questions.length} questions (${
          snapshot.docChanges().length
        } changes)`
      );

      // Notify callback with updated data
      callback(questions);
    },
    (error) => {
      logger.error("❌ Error in real-time listener:", error);
      // On error, fall back to empty array
      callback([]);
    }
  );

  logger.log("✓ Real-time listener active");
  return unsubscribe;
};

// PERFORMANCE: Paginated question loading
export const getQuestionsPaginated = async (
  userId,
  limitCount = 20,
  lastDoc = null
) => {
  try {
    const db = getDb();
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
    logger.error("Error fetching paginated questions:", error);
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
        collection(getDb(), "questions"),
        where("creatorId", "==", auth.currentUser.uid)
      );
    } else {
      q = collection(getDb(), "questions");
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
    logger.log(`Deleted ${deletedCount} questions from Firestore.`);
    return deletedCount;
  } catch (error) {
    logger.error("Error clearing questions from Firestore:", error);
    throw error;
  }
};

/**
 * Deletes all questions with status 'deleted' from Firestore.
 * This is used to clean up ghost questions that cause count discrepancies.
 * @returns {Promise<number>} Number of documents deleted.
 */
export const deleteSoftDeletedQuestionsFromFirestore = async () => {
  try {
    const q = query(
      collection(getDb(), "questions"),
      where("status", "==", "deleted")
    );

    const querySnapshot = await getDocs(q);
    let deletedCount = 0;

    const deletePromises = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(docSnapshot.ref));
      deletedCount++;
    });

    await Promise.all(deletePromises);
    logger.log(
      `Successfully cleaned up ${deletedCount} soft-deleted questions.`
    );
    return deletedCount;
  } catch (error) {
    logger.error("Error cleaning up soft-deleted questions:", error);
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
      logger.error("Cannot delete question: missing uniqueId");
      return;
    }
    const docRef = doc(getDb(), "questions", uniqueId);
    await deleteDoc(docRef);
    logger.log(`Question ${uniqueId} deleted from Firestore.`);
  } catch (error) {
    logger.error("Error deleting question from Firestore:", error);
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
      logger.warn("No user signed in, cannot save custom tags");
      return;
    }

    const docRef = doc(getDb(), "userSettings", auth.currentUser.uid);
    await setDoc(
      docRef,
      {
        customTags,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    logger.log("Custom tags saved to Firestore");
  } catch (error) {
    logger.error("Error saving custom tags:", error);
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
      logger.warn("No user signed in, returning empty custom tags");
      return {};
    }

    // Get the specific user's document
    const userDocRef = doc(getDb(), "userSettings", auth.currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data().customTags || {};
    }

    return {};
  } catch (error) {
    logger.error("Error getting custom tags:", error);
    return {};
  }
};

export { app, analytics, auth };

// Re-export auth functions from firebaseAuth.js for backward compatibility
export {
  signInWithGoogle,
  signOutUser,
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
  refreshAuthToken,
  markAuthActivity,
  isAuthPotentiallyStale,
} from "./firebaseAuth";
