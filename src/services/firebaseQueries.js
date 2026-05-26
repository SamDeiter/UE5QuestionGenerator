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
  documentId,
  Timestamp,
} from "firebase/firestore";
import { logger } from "../utils/logger";
import { TIMING, FIRESTORE_LIMITS, QUESTION_SOURCES } from "../utils/constants";
import { toMillis } from "../utils/firestoreHelpers";
import { auth, firebaseConfig } from "./firebaseAuth";
import { getDb } from "./firebaseSave";
import {
  getCachedQuestions,
  cacheQuestions,
  isCacheValid,
  clearCache as clearIndexedDBCache,
  updateCachedQuestion as updateIDBQuestion,
  deleteCachedQuestion as deleteIDBQuestion,
  setLastSyncTime,
} from "./questionCache";
import { parseQuestionDoc } from "../utils/questionDocParser";
import { registerListener, unregisterListener } from "../utils/listenerTracker";

// --- Cache Management ---
let _questionsCache = null;
let _questionsCacheTimestamp = 0;
const CACHE_TTL_MS = TIMING.CACHE_TTL_MS;

/**
 * Nuke both memory and IndexedDB caches.
 *
 * Use ONLY for true wipe-everything operations (e.g. clearAllQuestionsFromFirestore,
 * mass deletions). For individual saves and deletes, use the surgical
 * helpers below — wiping the whole IDB cache on every single save was
 * the root cause of "extraordinarily slow reload after I save anything":
 * the next load saw an empty IDB, fell out of the incremental path, and
 * did a cold full sync of all ~19,580 docs.
 */
export const invalidateQuestionsCache = async () => {
  _questionsCache = null;
  _questionsCacheTimestamp = 0;
  try {
    await clearIndexedDBCache();
  } catch (error) {
    logger.warn("Failed to clear IndexedDB cache:", error);
  }
  logger.log("🗑️ Questions cache invalidated (memory + IndexedDB)");
};

/**
 * Drop the in-memory cache only; leave IndexedDB intact.
 * Used internally by the surgical save/delete paths so the next
 * getAllQuestionsFromFirestore() call sees a fresh memory snapshot
 * while IndexedDB (and the incremental-sync watermark) stay warm.
 */
const invalidateMemoryQuestionsCache = () => {
  _questionsCache = null;
  _questionsCacheTimestamp = 0;
};

/**
 * Surgical IDB write after a single Firestore save.
 *
 * Replaces the previous "wipe everything" behavior on save. Updates the
 * one doc in IDB and advances the incremental-sync watermark so the next
 * reload still takes the fast incremental path (Tier 1 from IDB, plus a
 * delta query that returns 0 or near-0 docs).
 *
 * @param {Object} question - The just-saved question, with firestoreUpdatedAt set
 */
export const cacheSavedQuestion = async (question) => {
  invalidateMemoryQuestionsCache();
  if (!question?.uniqueId) return;
  try {
    await updateIDBQuestion(question);
    const ts = toMillis(question.firestoreUpdatedAt);
    if (ts > 0) await setLastSyncTime(ts);
  } catch (error) {
    // Cache-write failures must not break the save itself — log and continue.
    logger.warn("Failed to update IndexedDB cache after save:", error);
  }
};

/**
 * Surgical IDB writes after a batch Firestore save.
 *
 * @param {Array<Object>} questions - Just-saved questions with firestoreUpdatedAt
 */
export const cacheSavedQuestions = async (questions) => {
  invalidateMemoryQuestionsCache();
  if (!Array.isArray(questions) || questions.length === 0) return;
  try {
    await cacheQuestions(questions);
    let maxTs = 0;
    for (const q of questions) {
      const ts = toMillis(q?.firestoreUpdatedAt);
      if (ts > maxTs) maxTs = ts;
    }
    if (maxTs > 0) await setLastSyncTime(maxTs);
  } catch (error) {
    logger.warn("Failed to bulk-update IndexedDB cache after save:", error);
  }
};

/**
 * Surgical IDB removal after a single Firestore delete.
 *
 * @param {string} uniqueId
 */
export const removeCachedQuestion = async (uniqueId) => {
  invalidateMemoryQuestionsCache();
  if (!uniqueId) return;
  try {
    await deleteIDBQuestion(uniqueId);
  } catch (error) {
    logger.warn("Failed to delete from IndexedDB cache:", error);
  }
};

/**
 * Surgical IDB removals after batch Firestore deletes.
 *
 * @param {Array<string>} uniqueIds
 */
export const removeCachedQuestions = async (uniqueIds) => {
  invalidateMemoryQuestionsCache();
  if (!Array.isArray(uniqueIds) || uniqueIds.length === 0) return;
  try {
    // questionCache.deleteCachedQuestion is one-by-one but cheap (IDB key
    // delete). For really large bulk deletes a transactional batch would
    // be nicer, but soft-delete cleanups are rare and small enough that
    // this is fine for now.
    await Promise.all(uniqueIds.map((id) => deleteIDBQuestion(id)));
  } catch (error) {
    logger.warn("Failed to bulk-delete from IndexedDB cache:", error);
  }
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
  customLimit = null,
  onProgress = null
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
    logger.log(`🔄 Fetching up to ${fetchLimit} questions from Firestore...`);
    logger.log(`📍 Firebase Project: ${firebaseConfig.projectId}`);
    const startTime = performance.now();

    // PERF: Sliding-window concurrent pagination by document ID.
    //
    // Previous implementation was a single while-loop that awaited each
    // getDocs() before firing the next, so wall-clock = N_pages × RTT.
    // With ~19.5k docs at 2500/page that's 8 sequential round-trips ≈ 2s.
    //
    // Strategy: split the work across CONCURRENCY=4 cursor-paginated
    // "lanes", each running concurrently. Each lane pages through a
    // disjoint segment of the document-ID space using cursor pagination
    // (orderBy(documentId()) + startAfter), so cursor semantics — and
    // their reliability — are preserved within each lane.
    //
    // Lane boundaries are chosen on the document-ID alphabet. Doc IDs in
    // this collection are crypto.randomUUID() v4 values (lowercase hex with
    // dashes), which are uniformly distributed across the leading hex
    // nibble. We split into 4 buckets at "4", "8", "c" — the natural
    // quartiles of the hex space — each bucket holding ~25% of docs.
    //
    // Each lane internally does cursor pagination just like before, so:
    //   • we still terminate cleanly on short / empty pages,
    //   • we still honor a per-fetch cap by accumulating into a shared
    //     counter and short-circuiting other lanes once the cap is hit,
    //   • onProgress fires per page as it resolves (pages may complete
    //     out of order across lanes — documented contract).
    //
    // Expected speedup: ~4× wall-clock for full fetches when docs are
    // roughly evenly distributed, since lanes run in parallel and each
    // does ~1/4 the round-trips of the original sequential loop.
    const PAGE_SIZE = 2500;
    const CONCURRENCY = 4;
    // Quartile boundaries for UUIDv4 hex space. Each lane handles
    //   [start, end)  where start/end are tested via where(documentId() …).
    // Open-ended bounds at the extremes (no `where` constraint) cover
    // any non-UUID legacy IDs that fall outside the hex range.
    const LANE_BOUNDS = [
      { start: null, end: "4" }, // covers "0"-"3" plus anything before "0"
      { start: "4", end: "8" }, // "4"-"7"
      { start: "8", end: "c" }, // "8"-"b"
      { start: "c", end: null }, // "c"-"f" plus anything past "f"
    ];

    const questions = [];
    const disciplineCounts = {};
    let pages = 0;
    let capReached = false; // global stop flag once we hit fetchLimit
    const collRef = collection(getDb(), "questions");

    const ingestSnapshot = (snapshot) => {
      snapshot.forEach((docSnapshot) => {
        if (capReached) return;
        if (questions.length >= fetchLimit) {
          capReached = true;
          return;
        }
        const result = parseQuestionDoc({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        });
        if (result.valid) {
          const q = result.question;
          questions.push(q);
          const discipline = q.discipline || "Unknown";
          disciplineCounts[discipline] =
            (disciplineCounts[discipline] || 0) + 1;
        }
      });
      pages++;
      if (onProgress) {
        try {
          onProgress({ pages, loaded: questions.length, done: false });
        } catch (cbError) {
          logger.warn("onProgress callback threw:", cbError);
        }
      }
    };

    // Run one lane: cursor-paginate within [start, end), pushing into the
    // shared `questions` / `disciplineCounts`. Stops when its range is
    // exhausted or when capReached flips true.
    const runLane = async ({ start, end }) => {
      let cursor = null;
      while (!capReached && questions.length < fetchLimit) {
        // Reserve up to PAGE_SIZE per fetch but never more than the slack
        // remaining under the global cap. This prevents one lane from
        // single-handedly overshooting fetchLimit by a full page.
        const slack = fetchLimit - questions.length;
        if (slack <= 0) break;
        const pageLimit = Math.min(PAGE_SIZE, Math.max(slack, 1));

        const constraints = [orderBy(documentId())];
        if (start !== null) {
          constraints.push(where(documentId(), ">=", start));
        }
        if (end !== null) {
          constraints.push(where(documentId(), "<", end));
        }
        if (cursor) constraints.push(startAfter(cursor));
        constraints.push(limit(pageLimit));

        const snapshot = await getDocs(query(collRef, ...constraints));

        if (snapshot.empty) break;

        // Capture cursor BEFORE ingest so subsequent iterations can fire
        // even if ingestSnapshot trips capReached mid-page.
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        const isShortPage = snapshot.size < pageLimit;

        ingestSnapshot(snapshot);

        if (isShortPage) break; // lane's range fully drained
        cursor = lastDoc;
      }
    };

    await Promise.all(LANE_BOUNDS.map((b) => runLane(b)));

    if (onProgress) {
      try {
        onProgress({ pages, loaded: questions.length, done: true });
      } catch (cbError) {
        logger.warn("onProgress callback threw:", cbError);
      }
    }

    logger.log(
      `📄 Paginated fetch: ${pages} page(s) across ${CONCURRENCY} lanes`
    );

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
 * Incremental sync — fetch only docs whose `firestoreUpdatedAt` is strictly
 * after a high-water-mark timestamp.
 *
 * On every page reload, the original 3-tier loader (useExport.js) re-fetched
 * all ~19,580 docs from Firestore via 4-lane cursor pagination, even though
 * IndexedDB already had a fresh copy and only a handful of docs had changed.
 * That round-trip is what made reload feel like "the read takes forever."
 *
 * This function does the cheap thing instead: a single ordered query
 * `firestoreUpdatedAt > sinceMs ORDER BY firestoreUpdatedAt ASC`. The
 * existing Firestore index on `firestoreUpdatedAt` makes this O(deltas).
 * Returns `[]` when nothing has changed since `sinceMs`.
 *
 * Caller is responsible for:
 *   - merging the returned docs into IndexedDB and React state
 *   - advancing the high-water mark to max(firestoreUpdatedAt) of the response
 *     (use setLastSyncTime in questionCache.js)
 *
 * Does NOT detect deletions — a separate periodic full sync is needed for
 * that. The existing "Refresh" UI button (which calls
 * getAllQuestionsFromFirestore with forceRefresh=true) covers this use case.
 *
 * @param {number} sinceMs - High-water mark in millisecond epoch. Required.
 * @returns {Promise<Array>} Questions updated after `sinceMs`. May be empty.
 */
export const getQuestionsUpdatedSince = async (sinceMs) => {
  if (
    typeof sinceMs !== "number" ||
    !Number.isFinite(sinceMs) ||
    sinceMs <= 0
  ) {
    logger.warn("getQuestionsUpdatedSince called without a valid sinceMs");
    return [];
  }

  if (!auth.currentUser) {
    logger.log("⚠️ No user signed in, cannot fetch incremental updates");
    return [];
  }

  try {
    const startTime = performance.now();
    const sinceTs = Timestamp.fromMillis(sinceMs);
    const q = query(
      collection(getDb(), "questions"),
      where("firestoreUpdatedAt", ">", sinceTs),
      orderBy("firestoreUpdatedAt", "asc")
    );

    const snapshot = await getDocs(q);
    const questions = [];
    snapshot.forEach((d) => {
      const parsed = parseQuestionDoc(d);
      if (parsed) questions.push(parsed);
    });

    const elapsed = Math.round(performance.now() - startTime);
    logger.log(
      `⚡ Incremental sync: ${questions.length} updated doc(s) since ${new Date(
        sinceMs
      ).toISOString()} (${elapsed}ms)`
    );
    return questions;
  } catch (error) {
    logger.error("Error getting incremental updates from Firestore:", error);
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
  // Limit kept intentionally small: a single onSnapshot trying to deliver
  // 20k+ docs has been observed to fail. Bulk loading is handled by the
  // paginated getAllQuestionsFromFirestore; this listener carries live deltas.
  const LISTENER_LIMIT = 5000;
  const q = query(collection(getDb(), "questions"), limit(LISTENER_LIMIT));

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
    const deletedUniqueIds = [];

    const { deleteDoc } = await import("firebase/firestore");
    const deletePromises = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(docSnapshot.ref));
      // Track uniqueIds so we can mirror the deletes in the IDB cache.
      // Doc IDs in this collection ARE the uniqueIds (see firebaseSave.js
      // which uses `doc(getDb(), "questions", question.uniqueId)`).
      deletedUniqueIds.push(docSnapshot.id);
      deletedCount++;
    });

    await Promise.all(deletePromises);
    logger.log(
      `Successfully cleaned up ${deletedCount} soft-deleted questions.`
    );
    // Surgical bulk removal from IDB — keeps the rest of the cache warm.
    if (deletedUniqueIds.length > 0) {
      await removeCachedQuestions(deletedUniqueIds);
    }
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
    // Surgical IDB removal — keeps the rest of the ~19,580-doc cache warm
    // so the next reload still hits the fast incremental path.
    await removeCachedQuestion(uniqueId);
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
