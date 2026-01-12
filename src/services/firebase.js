import {
  app,
  auth,
  firebaseConfig,
  refreshAuthToken,
  markAuthActivity,
  isAuthPotentiallyStale,
} from "./firebaseAuth";
import { invalidateQuestionsCache } from "./firebaseQueries";
import { logEvent } from "firebase/analytics";
import {
  getFirestore,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { logger } from "../utils/logger";
import { PROCESSING } from "../utils/constants";

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
  invalidateQuestionsCache();

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
  invalidateQuestionsCache();

  const duration = Math.round(performance.now() - startTime);
  logger.log(`⚡ Batch saved ${results.success} questions in ${duration}ms`);

  return results;
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

// Re-export query functions from firebaseQueries.js for backward compatibility
export {
  getQuestionsFromFirestore,
  getAllQuestionsFromFirestore,
  subscribeToAllQuestions,
  getQuestionsPaginated,
  invalidateQuestionsCache,
  clearAllQuestionsFromFirestore,
  deleteSoftDeletedQuestionsFromFirestore,
  deleteQuestionFromFirestore,
  saveCustomTags,
  getCustomTags,
} from "./firebaseQueries";
