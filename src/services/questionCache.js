/**
 * Question Cache Service
 *
 * Provides IndexedDB-based caching for questions to reduce Firestore reads.
 * Questions are cached locally and served from cache when valid,
 * dramatically reducing bandwidth and improving offline support.
 *
 * @module services/questionCache
 */

import { openDB } from "idb";
import { logger } from "../utils/logger";
import { FIRESTORE_LIMITS } from "../utils/constants";

const DB_NAME = "ue5-questions-cache";
const QUESTIONS_STORE = "questions";
const META_STORE = "meta";
// v2 (Tier 3b): compact `questionIndex` shape.
// v3: keyPath changed from "uniqueId" to "id" (the Firestore doc ID) so that
// all language variants of the same question can coexist in the cache —
// previously they all collided at the same "uniqueId" key and only one variant
// survived per question group, breaking language switching on warm loads.
const DB_VERSION = 3;

/** @type {Promise<IDBDatabase>|null} */
let dbPromise = null;

/**
 * Gets or creates the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        const createQuestionsStore = () => {
          const store = db.createObjectStore(QUESTIONS_STORE, {
            keyPath: "id",
          });
          store.createIndex("status", "status");
          store.createIndex("discipline", "discipline");
          store.createIndex("firestoreUpdatedAt", "firestoreUpdatedAt");
        };

        // v2 (Tier 3b): drop heavy-shape store for compact index shape.
        // v3: drop uniqueId-keyed store to switch to id-keyed store so all
        //     language variants coexist (previously they collided at the same key).
        if (oldVersion < 3 && db.objectStoreNames.contains(QUESTIONS_STORE)) {
          db.deleteObjectStore(QUESTIONS_STORE);
        }

        // Questions store with indexes (fresh install or post-drop recreate).
        if (!db.objectStoreNames.contains(QUESTIONS_STORE)) {
          createQuestionsStore();
        }
        // Meta store for cache timestamps + incremental-sync watermark.
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Caches an array of questions to IndexedDB.
 * @param {Array<Object>} questions - Questions to cache
 * @returns {Promise<void>}
 */
export const cacheQuestions = async (questions) => {
  if (!questions?.length) return;

  try {
    const db = await getDB();
    const tx = db.transaction(QUESTIONS_STORE, "readwrite");

    await Promise.all([...questions.map((q) => tx.store.put(q)), tx.done]);

    // Update cache timestamp
    const metaTx = db.transaction(META_STORE, "readwrite");
    await metaTx.store.put(Date.now(), "lastCached");

    logger.log(`📦 Cached ${questions.length} questions to IndexedDB`);
  } catch (error) {
    logger.error("Failed to cache questions:", error);
    // Don't throw - caching failures shouldn't break the app
  }
};

/**
 * Retrieves questions from the cache.
 * @param {Object} options - Filter options
 * @param {string} [options.status] - Filter by status
 * @param {number} [options.limit] - Maximum questions to return
 * @returns {Promise<Array<Object>>}
 */
export const getCachedQuestions = async ({
  status = null,
  limit = null,
} = {}) => {
  try {
    const db = await getDB();

    let questions;
    if (status) {
      questions = await db.getAllFromIndex(QUESTIONS_STORE, "status", status);
    } else {
      questions = await db.getAll(QUESTIONS_STORE);
    }

    // Apply limit if specified
    if (limit && questions.length > limit) {
      questions = questions.slice(0, limit);
    }

    return questions;
  } catch (error) {
    logger.error("Failed to read from cache:", error);
    return [];
  }
};

/**
 * Checks if the cache is still valid based on TTL.
 * @param {number} [maxAgeMs] - Maximum cache age in milliseconds (default: from constants)
 * @returns {Promise<boolean>}
 */
export const isCacheValid = async (
  maxAgeMs = FIRESTORE_LIMITS.CACHE_TTL_MS
) => {
  try {
    const db = await getDB();
    const lastCached = await db.get(META_STORE, "lastCached");

    if (!lastCached) return false;
    return Date.now() - lastCached < maxAgeMs;
  } catch (error) {
    logger.error("Failed to check cache validity:", error);
    return false;
  }
};

/**
 * Clears all cached questions.
 * @returns {Promise<void>}
 */
export const clearCache = async () => {
  try {
    const db = await getDB();
    await db.clear(QUESTIONS_STORE);
    await db.clear(META_STORE);
    logger.log("🗑️ Cache cleared");
  } catch (error) {
    logger.error("Failed to clear cache:", error);
  }
};

/**
 * Caches generic metadata to IndexedDB.
 * @param {string} key - The metadata key
 * @param {any} data - The data to cache
 * @returns {Promise<void>}
 */
export const cacheMetadata = async (key, data) => {
  if (!key) return;
  try {
    const db = await getDB();
    await db.put(META_STORE, data, key);
  } catch (error) {
    logger.error(`Failed to cache metadata [${key}]:`, error);
  }
};

/**
 * Retrieves cached metadata from IndexedDB.
 * @param {string} key - The metadata key
 * @returns {Promise<any|null>}
 */
export const getCachedMetadata = async (key) => {
  if (!key) return null;
  try {
    const db = await getDB();
    return (await db.get(META_STORE, key)) || null;
  } catch (error) {
    logger.error(`Failed to read metadata [${key}] from cache:`, error);
    return null;
  }
};

/**
 * Reads the high-water mark for incremental sync.
 *
 * Stores the millisecond epoch of the newest `firestoreUpdatedAt` value we
 * have ever observed from a server fetch. The next sync only requests docs
 * with `firestoreUpdatedAt > lastSyncTime`, turning routine page reloads
 * from a ~19,580-doc full re-fetch into a tiny incremental delta query.
 *
 * Returns `null` when the cache is fresh / never synced — callers should
 * fall back to a full load in that case (we have no baseline to diff from).
 *
 * @returns {Promise<number|null>}
 */
export const getLastSyncTime = async () => {
  try {
    const db = await getDB();
    const value = await db.get(META_STORE, "lastSyncTime");
    return typeof value === "number" ? value : null;
  } catch (error) {
    logger.error("Failed to read lastSyncTime:", error);
    return null;
  }
};

/**
 * Writes the high-water mark for incremental sync.
 *
 * Only advances the watermark — never moves it backwards — so a sync that
 * returns older docs (e.g. after a clock anomaly) cannot regress the
 * baseline and trigger redundant re-fetches.
 *
 * @param {number} timestampMs
 * @returns {Promise<void>}
 */
export const setLastSyncTime = async (timestampMs) => {
  if (typeof timestampMs !== "number" || !Number.isFinite(timestampMs)) return;
  try {
    const db = await getDB();
    const existing = await db.get(META_STORE, "lastSyncTime");
    if (typeof existing === "number" && existing >= timestampMs) return;
    await db.put(META_STORE, timestampMs, "lastSyncTime");
  } catch (error) {
    logger.error("Failed to write lastSyncTime:", error);
  }
};

/**
 * Updates a single question in the cache.
 * @param {Object} question - The question to update
 * @returns {Promise<void>}
 */
export const updateCachedQuestion = async (question) => {
  if (!question?.id) return;

  try {
    const db = await getDB();
    await db.put(QUESTIONS_STORE, question);
  } catch (error) {
    logger.error("Failed to update cached question:", error);
  }
};

/**
 * Deletes a question from the cache.
 * @param {string} uniqueId - The question's unique ID
 * @returns {Promise<void>}
 */
export const deleteCachedQuestion = async (uniqueId) => {
  try {
    const db = await getDB();
    await db.delete(QUESTIONS_STORE, uniqueId);
  } catch (error) {
    logger.error("Failed to delete cached question:", error);
  }
};

/**
 * Gets cache statistics.
 * @returns {Promise<{count: number, lastUpdated: number|null, isValid: boolean}>}
 */
export const getCacheStats = async () => {
  try {
    const db = await getDB();
    const count = await db.count(QUESTIONS_STORE);
    const lastCached = await db.get(META_STORE, "lastCached");
    const valid = await isCacheValid();

    return {
      count,
      lastUpdated: lastCached || null,
      isValid: valid,
    };
  } catch {
    return { count: 0, lastUpdated: null, isValid: false };
  }
};

export default {
  cacheQuestions,
  getCachedQuestions,
  cacheMetadata,
  getCachedMetadata,
  updateCachedQuestion,
  deleteCachedQuestion,
  isCacheValid,
  getLastSyncTime,
  setLastSyncTime,
  clearCache,
  getCacheStats,
};
