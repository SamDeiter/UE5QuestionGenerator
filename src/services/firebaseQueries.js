/**
 * Firebase Query Functions
 *
 * Read-only functions for retrieving questions from Firestore.
 * These functions are separated from the main firebase.js to improve modularity.
 */
import {
  query,
  where,
  getDocs,
  getDoc,
  doc,
  collection,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getCountFromServer,
  getAggregateFromServer,
  sum,
  count,
} from "firebase/firestore";
import { logger } from "../utils/logger";
import { TIMING, FIRESTORE_LIMITS, QUESTION_SOURCES } from "../utils/constants";
import { auth, firebaseConfig } from "./firebaseAuth";
import { getDb } from "./firebaseSave";
import {
  getCachedQuestions,
  cacheQuestions,
  isCacheValid,
  clearCache as clearIndexedDBCache,
} from "./questionCache";
import { parseQuestionDoc } from "../utils/questionDocParser";
import { registerListener, unregisterListener } from "../utils/listenerTracker";

// --- Cache Management ---
let _questionsCache = null;
let _questionsCacheTimestamp = 0;
const CACHE_TTL_MS = TIMING.CACHE_TTL_MS;

// Convert any firestoreUpdatedAt shape (Timestamp, {seconds, nanoseconds}, ISO string, null)
// into a millisecond epoch for client-side sorting. Defense against historic data drift
// where some docs stored a plain object instead of a Timestamp.
const toMillis = (v) => {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") {
    return v.seconds * 1000 + (v.nanoseconds || 0) / 1e6;
  }
  if (typeof v === "string") {
    const parsed = Date.parse(v);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Invalidates the questions cache.
 * Call after saves/deletes to ensure fresh data on next load.
 */
export const invalidateQuestionsCache = async () => {
  _questionsCache = null;
  _questionsCacheTimestamp = 0;
  // Also clear IndexedDB cache
  try {
    await clearIndexedDBCache();
  } catch (error) {
    logger.warn("Failed to clear IndexedDB cache:", error);
  }
  logger.log("🗑️ Questions cache invalidated (memory + IndexedDB)");
};

/**
 * Retrieves questions created by the current user from Firestore.
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
  maxResults = FIRESTORE_LIMITS.FULL_SYNC_COUNT,
  forceRefresh = false,
  customLimit = null
) => {
  try {
    // Require authentication
    if (!auth.currentUser) {
      logger.log("⚠️ No user signed in, cannot load questions");
      return [];
    }

    // PERFORMANCE: Return in-memory cached data if fresh (within TTL)
    const now = Date.now();
    if (
      !forceRefresh &&
      !customLimit && // Don't use cache if a custom limit is requested (partial load)
      _questionsCache &&
      now - _questionsCacheTimestamp < CACHE_TTL_MS
    ) {
      logger.log(
        `⚡ Returning ${_questionsCache.length} cached questions (memory, ${Math.round(
          (now - _questionsCacheTimestamp) / 1000
        )}s old)`
      );
      return _questionsCache;
    }

    // PERFORMANCE: Try IndexedDB cache if memory cache is stale
    if (!forceRefresh && !customLimit) {
      try {
        const idbCacheValid = await isCacheValid();
        if (idbCacheValid) {
          const cachedQuestions = await getCachedQuestions();
          if (cachedQuestions.length > 0) {
            logger.log(
              `📦 Returning ${cachedQuestions.length} cached questions (IndexedDB)`
            );
            // Update memory cache from IndexedDB
            _questionsCache = cachedQuestions;
            _questionsCacheTimestamp = now;
            return cachedQuestions;
          }
        }
      } catch (idbError) {
        logger.warn(
          "IndexedDB cache check failed, falling back to Firestore:",
          idbError
        );
      }
    }

    const fetchLimit = customLimit || maxResults;
    logger.log(`🔄 Fetching ${fetchLimit} questions from Firestore...`);
    logger.log(`📍 Firebase Project: ${firebaseConfig.projectId}`);
    const startTime = performance.now();

    // NOTE: No orderBy here — Firestore silently excludes documents where
    // firestoreUpdatedAt is not a native Timestamp (e.g. legacy docs that stored
    // it as {seconds, nanoseconds} or an ISO string). Sort client-side instead.
    const allQuery = query(collection(getDb(), "questions"), limit(fetchLimit));
    const snapshot = await getDocs(allQuery);

    const questions = [];
    const disciplineCounts = {};
    snapshot.forEach((docSnapshot) => {
      const result = parseQuestionDoc({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      });

      if (result.valid) {
        const q = result.question;
        questions.push(q);

        // Track discipline counts for debugging
        const discipline = q.discipline || "Unknown";
        disciplineCounts[discipline] = (disciplineCounts[discipline] || 0) + 1;
      }
    });

    questions.sort(
      (a, b) => toMillis(b.firestoreUpdatedAt) - toMillis(a.firestoreUpdatedAt)
    );

    const duration = Math.round(performance.now() - startTime);
    logger.log(
      `✅ Loaded ${questions.length} questions from Firestore in ${duration}ms`
    );
    logger.log("📊 Discipline Breakdown:", disciplineCounts);

    // Only update cache if we performed a full fetch (no custom limit)
    if (!customLimit) {
      _questionsCache = questions;
      _questionsCacheTimestamp = now;
      // Also persist to IndexedDB for offline support
      try {
        await cacheQuestions(questions);
      } catch (idbError) {
        logger.warn("Failed to cache to IndexedDB:", idbError);
      }
    }

    return questions;
  } catch (error) {
    logger.error("Error getting all questions from Firestore:", error);
    return [];
  }
};

/**
 * Subscribe to real-time updates for all questions from Firestore.
 * This replaces the cache-based approach with live synchronization.
 * All authenticated users will see changes instantly across all devices.
 *
 * SCALABILITY: Firebase supports thousands of concurrent listeners.
 * PHASE 3.2: Real-time subscription to all questions in the database.
 *
 * This is the primary synchronization mechanism for keeping the client
 * in sync with Firestore updates across all language variants.
 *
 * @param {Function} onNext - Callback function receiving the latest questions array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToAllQuestions = (onNext) => {
  // Require authentication
  if (!auth.currentUser) {
    logger.log("⚠️ No user signed in, cannot subscribe to questions");
    onNext([]);
    return () => {};
  }

  logger.log("🔄 Setting up real-time question listener...");

  // NOTE: No orderBy here — Firestore silently excludes documents where
  // firestoreUpdatedAt is not a native Timestamp (e.g. bulk-imported docs
  // that stored it as a plain JSON object). The UI handles client-side sorting.
  const q = query(
    collection(getDb(), "questions"),
    limit(FIRESTORE_LIMITS.FULL_SYNC_COUNT)
  );

  // Register listener for observability
  const listenerId = registerListener("subscribeToAllQuestions");

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const questions = [];
      let skippedCount = 0;

      snapshot.docs.forEach((docSnapshot) => {
        // Q4b: Validate document structure before passing to UI
        const result = parseQuestionDoc({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        });

        if (result.valid) {
          questions.push(result.question);
        } else {
          skippedCount++;
        }
      });

      if (skippedCount > 0) {
        logger.warn(`Skipped ${skippedCount} malformed documents during sync`);
      }

      onNext(questions);
    },
    (error) => {
      logger.error("❌ Firestore real-time sync failed:", error);
      if (error.code === "permission-denied") {
        logger.warn("🔐 Permission denied - sync disabled for this session");
      }
    }
  );

  return () => {
    unregisterListener(listenerId);
    unsubscribe();
  };
};

/**
 * Paginated question loading for better performance.
 * @param {string} userId - User ID to filter by
 * @param {number} limitCount - Number of questions per page (default 20)
 * @param {DocumentSnapshot} lastDoc - Last document from previous page (for pagination)
 * @returns {Promise<{questions: Array, lastDoc: DocumentSnapshot, hasMore: boolean}>}
 */
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
 * Enhanced paginated question loading with flexible filtering.
 * PHASE 1.3: Supports status, discipline, and custom ordering for efficient queries.
 *
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status (optional)
 * @param {string} options.discipline - Filter by discipline (optional)
 * @param {number} options.pageSize - Number of docs per page (default 50)
 * @param {DocumentSnapshot} options.lastDoc - Last doc from previous page (optional)
 * @param {string} options.orderByField - Field to order by (default 'firestoreUpdatedAt')
 * @param {string} options.orderDirection - 'asc' or 'desc' (default 'desc')
 * @returns {Promise<{questions: Array, lastDoc: DocumentSnapshot, hasMore: boolean}>}
 */
export const getQuestionsPaginatedWithFilters = async ({
  status = null,
  discipline = null,
  pageSize = FIRESTORE_LIMITS.DEFAULT_PAGE_SIZE,
  lastDoc = null,
  orderByField = "firestoreUpdatedAt",
  orderDirection = "desc",
} = {}) => {
  try {
    if (!auth.currentUser) {
      logger.log("⚠️ No user signed in, cannot load questions");
      return { questions: [], lastDoc: null, hasMore: false };
    }

    const constraints = [];

    // Add filters
    if (status) {
      constraints.push(where("status", "==", status));
    }
    if (discipline) {
      constraints.push(where("discipline", "==", discipline));
    }

    // Add ordering
    constraints.push(orderBy(orderByField, orderDirection));

    // Add limit (+1 to check if more exist)
    constraints.push(limit(pageSize + 1));

    // Add pagination cursor
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(getDb(), "questions"), ...constraints);
    const startTime = performance.now();
    const snapshot = await getDocs(q);
    const duration = Math.round(performance.now() - startTime);

    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;

    // Remove the extra doc if we have more
    const questions = docs.slice(0, pageSize).map((doc) => ({
      id: doc.id,
      ...doc.data(),
      _source: QUESTION_SOURCES.DATABASE,
    }));

    logger.log(
      `✅ Paginated query: ${questions.length} questions in ${duration}ms ` +
        `(status=${status || "all"}, discipline=${discipline || "all"})`
    );

    return {
      questions,
      lastDoc: docs[pageSize - 1] || null,
      hasMore: hasMore,
    };
  } catch (error) {
    logger.error("Error in paginated query:", error);
    return { questions: [], lastDoc: null, hasMore: false };
  }
};

/**
 * Fetches all language variants for a specific question ID.
 * Useful for resolving stale state issues in DatabaseView.
 *
 * @param {string} uniqueId - The uniqueId shared by all variants.
 * @returns {Promise<Array>} Array of question variants.
 */
export const getQuestionVariantsForId = async (uniqueId) => {
  if (!uniqueId) return [];

  try {
    const q = query(
      collection(getDb(), "questions"),
      where("uniqueId", "==", uniqueId)
    );
    const snapshot = await getDocs(q);

    const variants = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      _source: QUESTION_SOURCES.DATABASE,
    }));

    return variants;
  } catch (error) {
    logger.error(`Error fetching variants for ${uniqueId}:`, error);
    return [];
  }
};

/**
 * PHASE 2.3: Get category-specific stats for a discipline using server-side aggregation.
 * Calculates counts for all 6 categories (Beginner MC, Beginner T/F, etc.) in one go.
 *
 * @param {string} discipline - The discipline to count for (e.g. "Tech Art")
 * @returns {Promise<Object>} Map of category keys to counts
 */
export const getCategoryStatsAggregated = async (discipline) => {
  try {
    const questionsRef = collection(getDb(), "questions");

    // We want counts for status: accepted OR pending
    // Firestore count() doesn't support 'OR' natively in a single count() call easily
    // without complex Query constraints, but we can query by discipline and filter status.
    // However, to keep it O(1) reads, we'll fetch counts for each category.

    const results = {};
    const categories = [
      { diff: "Beginner", type: "Multiple Choice", key: "Beginner MC" },
      { diff: "Beginner", type: "True/False", key: "Beginner T/F" },
      { diff: "Intermediate", type: "Multiple Choice", key: "Intermediate MC" },
      { diff: "Intermediate", type: "True/False", key: "Intermediate T/F" },
      { diff: "Expert", type: "Multiple Choice", key: "Expert MC" },
      { diff: "Expert", type: "True/False", key: "Expert T/F" },
    ];

    await Promise.all(
      categories.map(async (cat) => {
        // Query for both 'accepted' and 'pending' (merged logic)
        const qAccepted = query(
          questionsRef,
          where("discipline", "==", discipline),
          where("difficulty", "==", cat.diff),
          where("type", "==", cat.type),
          where("status", "==", "accepted")
        );

        const qPending = query(
          questionsRef,
          where("discipline", "==", discipline),
          where("difficulty", "==", cat.diff),
          where("type", "==", cat.type),
          where("status", "in", ["pending", ""]) // Handle missing status as pending
        );

        const [snapAccepted, snapPending] = await Promise.all([
          getCountFromServer(qAccepted),
          getCountFromServer(qPending),
        ]);

        results[cat.key] = snapAccepted.data().count + snapPending.data().count;
      })
    );

    return results;
  } catch (error) {
    logger.error(`Error getting category stats for ${discipline}:`, error);
    return {};
  }
};

/**
 * PHASE 2.1: Get token usage stats for a user using server-side aggregation.
 * Uses Firestore's getAggregateFromServer with sum() and count() for efficient
 * calculation without downloading documents.
 *
 * PERFORMANCE: 1 aggregation read vs 5000+ document reads
 * COST: ~0.0001¢ vs ~$0.18 per request
 *
 * @param {string} userId - The user's UID
 * @returns {Promise<{totalCost: number, questionCount: number, estimatedInputTokens: number, estimatedOutputTokens: number}>}
 */
export const getUserTokenUsageAggregated = async (userId) => {
  try {
    if (!userId) {
      logger.log("⚠️ No userId provided for token usage aggregation");
      return {
        totalCost: 0,
        questionCount: 0,
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
      };
    }

    const userQuery = query(
      collection(getDb(), "questions"),
      where("creatorId", "==", userId)
    );

    const snapshot = await getAggregateFromServer(userQuery, {
      totalCost: sum("estimatedCost"),
      questionCount: count(),
    });

    const data = snapshot.data();
    const avgInputTokensPerQuestion = 500;
    const avgOutputTokensPerQuestion = 200;

    const result = {
      totalCost: data.totalCost || 0,
      questionCount: data.questionCount || 0,
      estimatedInputTokens:
        (data.questionCount || 0) * avgInputTokensPerQuestion,
      estimatedOutputTokens:
        (data.questionCount || 0) * avgOutputTokensPerQuestion,
    };

    logger.log(
      `📊 User ${userId.slice(0, 8)}... token usage: ${result.questionCount} questions, $${result.totalCost.toFixed(4)}`
    );

    return result;
  } catch (error) {
    logger.error("Error getting user token usage:", error);
    return {
      totalCost: 0,
      questionCount: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
    };
  }
};

/**
 * PHASE 2.2: Get aggregate statistics for all questions.
 * Useful for dashboard stats without loading all documents.
 *
 * @returns {Promise<{total: number, byStatus: Object}>}
 */
export const getQuestionStatsAggregated = async () => {
  try {
    if (!auth.currentUser) {
      return { total: 0, byStatus: {} };
    }

    // Get total count
    const totalQuery = query(collection(getDb(), "questions"));
    const totalSnapshot = await getAggregateFromServer(totalQuery, {
      total: count(),
    });

    // Get counts by status (requires separate queries due to Firestore limitations)
    const statuses = ["pending", "accepted", "rejected"];
    const byStatus = {};

    for (const status of statuses) {
      const statusQuery = query(
        collection(getDb(), "questions"),
        where("status", "==", status)
      );
      const statusSnapshot = await getAggregateFromServer(statusQuery, {
        count: count(),
      });
      byStatus[status] = statusSnapshot.data().count || 0;
    }

    const result = {
      total: totalSnapshot.data().total || 0,
      byStatus,
    };

    logger.log(
      `📊 Question stats: ${result.total} total, ${JSON.stringify(result.byStatus)}`
    );

    return result;
  } catch (error) {
    logger.error("Error getting question stats:", error);
    return { total: 0, byStatus: {} };
  }
};

// --- Delete Operations ---

/**
 * Deletes all questions from Firestore for the current user.
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
    const { deleteDoc } = await import("firebase/firestore");
    const deletePromises = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(docSnapshot.ref));
      deletedCount++;
    });

    await Promise.all(deletePromises);
    logger.log(`Deleted ${deletedCount} questions from Firestore.`);
    invalidateQuestionsCache();
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

    const { deleteDoc } = await import("firebase/firestore");
    const deletePromises = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(docSnapshot.ref));
      deletedCount++;
    });

    await Promise.all(deletePromises);
    logger.log(
      `Successfully cleaned up ${deletedCount} soft-deleted questions.`
    );
    invalidateQuestionsCache();
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
    const { doc, deleteDoc } = await import("firebase/firestore");
    const docRef = doc(getDb(), "questions", uniqueId);
    await deleteDoc(docRef);
    logger.log(`Question ${uniqueId} deleted from Firestore.`);
    invalidateQuestionsCache();
  } catch (error) {
    logger.error("Error deleting question from Firestore:", error);
    throw error;
  }
};

// --- User Settings ---

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

    const { doc, setDoc, Timestamp } = await import("firebase/firestore");
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

    const { doc, getDoc } = await import("firebase/firestore");
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

/**
 * Retrieves pre-computed question statistics from the aggregate document.
 * This is FAR cheaper than counting all questions client-side.
 *
 * The aggregate doc is maintained by a Cloud Function trigger.
 *
 * @returns {Promise<Object|null>} Stats object or null if not found
 * @example
 * const stats = await getQuestionStats();
 * // stats = {
 * //   totalQuestions: 4500,
 * //   byStatus: { pending: 150, accepted: 3800, rejected: 500 },
 * //   byDiscipline: { blueprints: 1200, materials: 800, ... },
 * //   byType: { multiple_choice: 3000, true_false: 1500 },
 * //   byDifficulty: { easy: 1500, medium: 2000, hard: 1000 },
 * //   lastUpdated: Timestamp
 * // }
 */
export const getQuestionStats = async () => {
  try {
    const statsRef = doc(getDb(), "_aggregates", "questionStats");
    const statsSnap = await getDoc(statsRef);

    if (statsSnap.exists()) {
      logger.log("📊 Loaded question stats from aggregate doc");
      return statsSnap.data();
    }

    logger.warn("⚠️ No aggregate stats found - run backfill script");
    return null;
  } catch (error) {
    logger.error("Error getting question stats:", error);
    return null;
  }
};
