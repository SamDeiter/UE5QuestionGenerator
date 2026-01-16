/**
 * Firebase Save Functions with Offline Queue Support
 *
 * This module handles all Firestore write operations with resilience:
 * - Single question saves with offline queue fallback
 * - Batch saves for bulk operations
 * - Automatic retry with token refresh on permission errors
 */
import {
  getFirestore,
  doc,
  setDoc,
  Timestamp,
  writeBatch,
  enableMultiTabIndexedDbPersistence,
} from "firebase/firestore";
import { logEvent } from "firebase/analytics";
import { logger } from "../utils/logger";
import { PROCESSING } from "../utils/constants";
import {
  app,
  auth,
  refreshAuthToken,
  markAuthActivity,
  isAuthPotentiallyStale,
} from "./firebaseAuth";
import { invalidateQuestionsCache } from "./firebaseQueries";
import { toastError } from "./toastEvents";

// --- Lazy-load Firestore with Persistence ---
let _db = null;
let _persistenceInitialized = false;

export const getDb = () => {
  if (!_db) {
    _db = getFirestore(app);

    // Enable persistence in a non-blocking way
    if (!_persistenceInitialized && typeof window !== "undefined") {
      _persistenceInitialized = true;
      enableMultiTabIndexedDbPersistence(_db)
        .then(() => {
          logger.log("✅ Firestore multi-tab persistence enabled");
        })
        .catch((err) => {
          if (err.code === "failed-precondition") {
            // Multiple tabs open, persistence can only be enabled in one tab at a time.
            logger.warn("⚠️ Firestore persistence failed: Multiple tabs open");
          } else if (err.code === "unimplemented") {
            // The current browser does not support all of the features required to enable persistence
            logger.warn(
              "⚠️ Firestore persistence failed: Browser not supported"
            );
          } else {
            logger.error("❌ Firestore persistence error:", err);
          }
        });
    }
  }
  return _db;
};

// NOTE: Analytics disabled - requires Firebase Console configuration
const analytics = null;

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

// Subscribe to connection status changes
const connectionListeners = new Set();

const notifyConnectionListeners = () => {
  const status = getConnectionStatus();
  connectionListeners.forEach((cb) => cb(status));
};

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
 * Enforce required fields - auto-populate missing metadata
 * @param {Object} question - Question to enforce fields on
 * @returns {Object} Question with enforced fields
 */
const enforceRequiredFields = (question) => {
  const currentEmail = auth.currentUser?.email;
  const currentName = auth.currentUser?.displayName || currentEmail;
  const now = new Date().toISOString();

  // Ensure creator info is set
  if (!question.creatorEmail && currentEmail) {
    question.creatorEmail = currentEmail;
  }
  if (!question.creatorName && currentName) {
    question.creatorName = currentName;
  }

  // If accepted, ensure acceptedBy is set
  if (question.status === "accepted" && !question.acceptedBy && currentEmail) {
    question.acceptedBy = currentEmail;
    question.acceptedAt = question.acceptedAt || now;
    logger.log(`[FieldEnforce] Auto-set acceptedBy: ${currentEmail}`);
  }

  // If humanVerified, ensure humanVerifiedBy is set
  if (question.humanVerified && !question.humanVerifiedBy && currentEmail) {
    question.humanVerifiedBy = currentEmail;
    question.humanVerifiedAt = question.humanVerifiedAt || now;
    logger.log(`[FieldEnforce] Auto-set humanVerifiedBy: ${currentEmail}`);
  }

  return question;
};

/**
 * Internal save function (used by queue processor)
 */
const saveQuestionToFirestoreInternal = async (question) => {
  if (!question || !question.uniqueId) {
    logger.error("Invalid question object or missing uniqueId", question);
    return;
  }

  // Enforce required fields before save
  const enforcedQuestion = enforceRequiredFields({ ...question });

  const docRef = doc(getDb(), "questions", enforcedQuestion.uniqueId);
  const payload = removeUndefined({
    ...enforcedQuestion,
    firestoreUpdatedAt: Timestamp.now(),
  });

  logger.log(
    `🔍 [DEBUG] Saving to Firestore. Fields being sent:`,
    Object.keys(payload)
  );

  await setDoc(docRef, payload, { merge: true });
  logger.log(`Question ${enforcedQuestion.uniqueId} saved to Firestore.`);

  invalidateQuestionsCache();

  if (analytics) {
    logEvent(analytics, "save_question", {
      id: question.uniqueId,
      status: question.status,
      discipline: question.discipline,
    });
  }
};

/**
 * Process queued items when back online
 */
const processOfflineQueue = async () => {
  // Re-hydrate from localStorage in case items were added by another session/tab
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
    persistQueue();
    notifyConnectionListeners();

    for (const item of itemsToProcess) {
      try {
        await saveQuestionToFirestoreInternal(item.question);
        logger.log(`✓ Synced queued item: ${item.question.uniqueId}`);
      } catch (err) {
        const isPermissionError =
          err.code === "permission-denied" ||
          err.message?.includes("permissions") ||
          err.message?.includes("Missing or insufficient permissions");

        logger.warn(
          `Failed to sync ${item.question.uniqueId}, re-queuing:`,
          err
        );

        // ALWAYS re-queue on failure - never drop user data
        // Permission errors may be temporary (stale token, rules change, etc.)
        const alreadyHasNewer = offlineQueue.some(
          (q) => q.question?.uniqueId === item.question?.uniqueId
        );
        if (!alreadyHasNewer) {
          offlineQueue.push(item);
        }

        // Notify user of permission issues so they can take action
        if (isPermissionError) {
          toastError(
            "⚠️ Permission issue saving questions - please refresh or re-sign in",
            8000
          );
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

// --- Connection Status Management ---

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

  window.addEventListener("online", notifyConnectionListeners);
  window.addEventListener("offline", notifyConnectionListeners);

  // Proactive sync on startup
  setTimeout(() => {
    if (isOnline) processOfflineQueue();
  }, 3000);

  // Periodic queue check - warn user if items are stuck
  setInterval(() => {
    if (offlineQueue.length > 0 && isOnline) {
      logger.warn(
        `⚠️ [Queue Check] ${offlineQueue.length} items stuck in queue - attempting sync...`
      );
      processOfflineQueue();
    }
  }, 30000);
}

/**
 * Get connection and sync status (for UI)
 */
export const getConnectionStatus = () => ({
  isOnline,
  queuedCount: offlineQueue.length,
  syncInProgress,
});

/**
 * Get detailed queue information for UI display
 */
export const getQueueDetails = () => ({
  items: offlineQueue.map((item) => ({
    id: item.question?.uniqueId,
    text: item.question?.question?.substring(0, 50) || item.question?.uniqueId,
    status: item.question?.status,
    timestamp: item.timestamp,
  })),
});

/**
 * Track IDs currently in offline queue (to prevent real-time overwrites)
 */
export const getQueuedQuestionIds = () => {
  return new Set(offlineQueue.map((item) => item.question?.uniqueId));
};

/**
 * Manual sync trigger for UI "Sync Now" button
 */
export const triggerManualSync = async () => {
  logger.log("🔄 Manual sync triggered by user");
  notifyConnectionListeners();
  await processOfflineQueue();
  notifyConnectionListeners();
};

/**
 * Subscribe to connection status changes
 */
export const subscribeToConnectionStatus = (callback) => {
  connectionListeners.add(callback);
  return () => connectionListeners.delete(callback);
};

// --- Save Functions ---

/**
 * Saves a single question to Firestore with offline queue fallback.
 * If offline or save fails, queues for retry when connection is restored.
 * FIX: Automatically retries with token refresh on 403 permission errors.
 * @param {Object} question - The question object to save.
 * @returns {Object} { success: boolean, queued: boolean, error?: string }
 */
export const saveQuestionToFirestore = async (question) => {
  try {
    // CRITICAL: Verify user is authenticated before attempting save
    if (!auth.currentUser) {
      logger.error("❌ [Save] Cannot save - user not authenticated!");
      toastError("Session expired - please sign in again", 8000);
      // Don't queue if not authenticated - this is a critical error
      return {
        success: false,
        queued: false,
        error: "Not authenticated - please sign in again",
      };
    }

    if (!isOnline) {
      logger.log(`📴 Offline - queuing ${question.uniqueId} for later sync`);
      offlineQueue = offlineQueue.filter(
        (item) => item.question?.uniqueId !== question.uniqueId
      );
      offlineQueue.push({ question, timestamp: Date.now() });
      persistQueue();
      notifyConnectionListeners();
      return { success: false, queued: true };
    }

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
      }
    }

    logger.warn(
      `⚠️ Save failed for ${question.uniqueId}, queuing for retry:`,
      errorMessage
    );
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

  // CRITICAL: Verify user is authenticated before attempting batch save
  if (!auth.currentUser) {
    logger.error("❌ [BatchSave] Cannot save - user not authenticated!");
    toastError("Session expired - please sign in again", 8000);
    return {
      success: 0,
      failed: questions.length,
      queued: 0,
      error: "Not authenticated - please sign in again",
    };
  }

  if (!isOnline) {
    logger.log(
      `📴 Offline - queuing ${questions.length} questions for later sync`
    );
    questions.forEach((q) => {
      offlineQueue = offlineQueue.filter(
        (item) => item.question?.uniqueId !== q.uniqueId
      );
      offlineQueue.push({ question: q, timestamp: Date.now() });
    });
    persistQueue();
    notifyConnectionListeners();
    return { success: 0, failed: 0, queued: questions.length };
  }

  if (isAuthPotentiallyStale() && auth.currentUser) {
    await refreshAuthToken();
  }
  markAuthActivity();

  const results = { success: 0, failed: 0, queued: 0 };
  const startTime = performance.now();
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
      for (const q of batch) {
        const result = await saveQuestionToFirestore(q);
        if (result.success) results.success++;
        else if (result.queued) results.queued++;
        else results.failed++;
      }
    }
  }

  invalidateQuestionsCache();

  const duration = Math.round(performance.now() - startTime);
  logger.log(`⚡ Batch saved ${results.success} questions in ${duration}ms`);

  return results;
};
