/**
 * Firebase Query Functions
 *
 * Read-only functions for retrieving questions from Firestore.
 * These functions are separated from the main firebase.js to improve modularity.
 */
import {
  getFirestore,
  query,
  where,
  getDocs,
  collection,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
} from "firebase/firestore";
import { logger } from "../utils/logger";
import { TIMING } from "../utils/constants";
import { app, auth, firebaseConfig } from "./firebaseAuth";

// Lazy-load Firestore (shared with firebase.js)
let _db = null;
const getDb = () => {
  if (!_db) {
    _db = getFirestore(app);
  }
  return _db;
};

// --- Cache Management ---
let _questionsCache = null;
let _questionsCacheTimestamp = 0;
const CACHE_TTL_MS = TIMING.CACHE_TTL_MS;

/**
 * Invalidates the questions cache.
 * Call after saves/deletes to ensure fresh data on next load.
 */
export const invalidateQuestionsCache = () => {
  _questionsCache = null;
  _questionsCacheTimestamp = 0;
  logger.log("🗑️ Questions cache invalidated");
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
  maxResults = 5000,
  forceRefresh = false
) => {
  try {
    // Require authentication
    if (!auth.currentUser) {
      logger.log("⚠️ No user signed in, cannot load questions");
      return [];
    }

    // PERFORMANCE: Return cached data if fresh (within TTL)
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
