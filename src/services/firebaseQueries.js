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
  documentId,
  Timestamp,
} from "firebase/firestore";
import { logger } from "../utils/logger";
import {
  TIMING,
  FIRESTORE_LIMITS,
  QUESTION_SOURCES,
  INDEX_OMITTED_FIELDS,
} from "../utils/constants";
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

// --- Compact-index read switch (Tier 3b) ---
//
// When true, the BULK read paths (full sync, incremental delta, paginated
// Review) source from the compact `questionIndex` mirror instead of the full
// `questions` collection. The mirror omits 5 large detail-only fields
// (sourceExcerpt, sourceUrl, explanation, groundingSources, editHistory; see
// functions/triggers/questionIndexProjection.js), shrinking the bulk payload
// ~30-50%. Those fields are resolved on demand from the full `questions/{id}`
// doc via getFullQuestionDoc() when a card is expanded / on export / on
// translate.
//
// SAFETY: keep this `false` until the questionIndex composite indexes are
// deployed AND report Enabled in prod — index-backed queries error otherwise.
// Flipping it is a one-line, fully reversible change. All WRITES/DELETES and
// single-doc/variant fetches always stay on `questions` (the mirror is
// read-only to clients).
export const USE_INDEX = false;
const QUESTIONS_COLLECTION = "questions";
const INDEX_COLLECTION = "questionIndex";
// Source collection for bulk reads only. Never use this for writes.
const READ_COLLECTION = USE_INDEX ? INDEX_COLLECTION : QUESTIONS_COLLECTION;

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
  // Drop any memoized full doc so the next on-demand fetch sees the new values.
  // Evict by both doc id and uniqueId (equal for English, differ for variants).
  invalidateFullDocMemo(question.id, question.uniqueId);
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
  for (const q of questions) invalidateFullDocMemo(q?.id, q?.uniqueId);
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
  invalidateFullDocMemo(uniqueId);
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
  for (const id of uniqueIds) invalidateFullDocMemo(id);
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
    // Tier 3b: bulk-read from the compact mirror when USE_INDEX is on.
    const collRef = collection(getDb(), READ_COLLECTION);

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
          onProgress({
            pages,
            loaded: questions.length,
            done: false,
            questions,
          });
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
        onProgress({ pages, loaded: questions.length, done: true, questions });
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
    // Tier 3b: bulk delta read from the compact mirror when USE_INDEX is on.
    const q = query(
      collection(getDb(), READ_COLLECTION),
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
  //
  // PERF: this listener no longer starts until the initial 3-tier load
  // completes (gated by isInitialLoading in useQuestionSync), so it never
  // competes with the cold full-sync. The limit is also kept modest because
  // the merge is additive (it only updates/adds the docs it sees, never
  // removes), and the watermark-based incremental sync on the next reload is
  // the real freshness mechanism — this is best-effort live cross-user
  // updates, which (with no orderBy) already only ever watched an arbitrary
  // subset of the corpus.
  const LISTENER_LIMIT = 1000;
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

    // Tier 3b: paginated Review read from the compact mirror when USE_INDEX
    // is on. The (status, …) / (discipline, status, …) composites exist on
    // questionIndex too (config/firestore/firestore.indexes.json).
    const q = query(collection(getDb(), READ_COLLECTION), ...constraints);
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

// --- On-demand full-doc resolver (Tier 3b) ---
//
// When the bulk loader sources from the compact `questionIndex` mirror, the
// in-memory questions are missing 5 detail-only fields (sourceExcerpt,
// sourceUrl, explanation, groundingSources, editHistory). These helpers fetch
// the FULL doc from `questions/{docId}` on demand — used by the expanded card
// detail, export, and translation. Always reads `questions`, regardless of
// USE_INDEX, so it works identically whether or not the flag is flipped.
//
// IMPORTANT — key on the DOC ID, not the uniqueId. A question's Firestore doc
// id is the bare uniqueId for the English canonical, but `{uniqueId}_{language}`
// for each translation variant (verified against prod data). All variants share
// the same `uniqueId` FIELD as a group key. parseQuestionDoc sets the in-memory
// `q.id` to the doc id, so callers pass `q.id` to fetch the CORRECT per-language
// doc — keying on uniqueId would collapse every variant onto the English doc and
// bleed English source text onto translation tabs.

// Small in-process memo so re-opening the same card (or re-running an export)
// doesn't re-fetch. Keyed by DOC ID; bounded to avoid unbounded growth.
const _fullDocMemo = new Map();
const FULL_DOC_MEMO_MAX = 500;

const memoizeFullDoc = (docId, question) => {
  if (!docId || !question) return;
  // Cheap LRU-ish bound: drop the oldest insertion when over capacity.
  if (_fullDocMemo.size >= FULL_DOC_MEMO_MAX) {
    const oldest = _fullDocMemo.keys().next().value;
    if (oldest !== undefined) _fullDocMemo.delete(oldest);
  }
  _fullDocMemo.set(docId, question);
};

/**
 * Drop a doc from the full-doc memo. Call after a save/delete so a stale full
 * doc can't be served. Safe to call with unknown / undefined keys.
 * @param {...string} docIds - one or more doc ids / uniqueIds to evict
 */
export const invalidateFullDocMemo = (...docIds) => {
  for (const id of docIds) {
    if (id) _fullDocMemo.delete(id);
  }
};

/**
 * Fetch one full question document (with all detail fields) by its DOC ID.
 * For English this is the bare uniqueId; for translations `{uniqueId}_{lang}`.
 * Pass the in-memory question's `q.id` (which parseQuestionDoc set to the doc
 * id), NOT its `uniqueId`.
 *
 * @param {string} docId - the Firestore document id (== in-memory q.id)
 * @param {boolean} [forceRefresh=false] - bypass the memo
 * @returns {Promise<Object|null>} parsed full question, or null if missing
 */
export const getFullQuestionDoc = async (docId, forceRefresh = false) => {
  if (!docId) return null;
  if (!forceRefresh && _fullDocMemo.has(docId)) {
    return _fullDocMemo.get(docId);
  }
  if (!auth.currentUser) {
    logger.log("⚠️ No user signed in, cannot fetch full question doc");
    return null;
  }
  try {
    const snap = await getDoc(doc(getDb(), QUESTIONS_COLLECTION, docId));
    if (!snap.exists()) return null;
    const result = parseQuestionDoc({ id: snap.id, ...snap.data() });
    const question = result?.valid ? result.question : null;
    if (question) memoizeFullDoc(docId, question);
    return question;
  } catch (error) {
    logger.error(`Error fetching full question doc ${docId}:`, error);
    return null;
  }
};

/**
 * Fetch many full question documents by doc id. Used by export to round-trip
 * the full set before formatting. Resolves missing docs to nothing (skipped),
 * so the result may be shorter than the input.
 *
 * @param {Array<string>} docIds - Firestore document ids (== in-memory q.id)
 * @returns {Promise<Array<Object>>} parsed full questions (order not guaranteed)
 */
export const getFullQuestionDocs = async (docIds) => {
  if (!Array.isArray(docIds) || docIds.length === 0) return [];
  const results = await Promise.all(docIds.map((id) => getFullQuestionDoc(id)));
  return results.filter(Boolean);
};

/**
 * Return `list` with the 5 omitted detail fields filled in from each item's
 * full `questions/{docId}` doc. Order-preserving, and a NO-OP when USE_INDEX is
 * false (the in-memory questions already carry every field). Used by export,
 * which must round-trip the full source/excerpt/explanation that the compact
 * index drops. Items whose full doc can't be fetched are left as-is (so an
 * export degrades to index-only fields rather than failing outright).
 *
 * @param {Array<Object>} list - questions (with `.id` doc ids) to hydrate
 * @returns {Promise<Array<Object>>} same length/order, detail fields merged in
 */
export const hydrateQuestionDetails = async (list) => {
  if (!USE_INDEX || !Array.isArray(list) || list.length === 0) return list;
  const fulls = await getFullQuestionDocs(list.map((q) => q?.id));
  const byId = new Map(fulls.map((f) => [f.id, f]));
  return list.map((q) => {
    const full = byId.get(q?.id);
    if (!full) return q;
    const patch = {};
    for (const f of INDEX_OMITTED_FIELDS) {
      if (full[f] !== undefined) patch[f] = full[f];
    }
    return Object.keys(patch).length > 0 ? { ...q, ...patch } : q;
  });
};

// Stats / aggregation queries moved to firebaseStats.js. Re-exported
// below for API parity so existing consumers keep working unchanged.
export {
  getCategoryStatsAggregated,
  getUserTokenUsageAggregated,
  getQuestionStats,
} from "./firebaseStats";

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
