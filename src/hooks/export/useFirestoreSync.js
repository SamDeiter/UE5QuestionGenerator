import { useCallback } from "react";
import { logger } from "../../utils/logger";
import {
  getAllQuestionsFromFirestore,
  getQuestionsUpdatedSince,
} from "../../services/firebase";
import { logError } from "../../utils/AppError";
import {
  QUESTION_SOURCES,
  QUESTION_STATUS,
  FIRESTORE_LIMITS,
} from "../../utils/constants";
import { toMillis } from "../../utils/firestoreHelpers";

const { FULL_SYNC_COUNT } = FIRESTORE_LIMITS;

/**
 * useFirestoreSync — handleLoadFromFirestore with three tiers:
 *
 *   1. Instantly hydrate from IndexedDB cache (0ms perceived load).
 *   2. INCREMENTAL: when there is a watermark and a warm cache, fetch
 *      only docs updated since that watermark and merge by uniqueId.
 *   3. FULL SYNC: cold cache, missing watermark, or explicit refresh —
 *      fetches everything from Firestore and seeds the watermark. This
 *      is also the only path that catches deletions.
 */
export const useFirestoreSync = ({
  showMessage,
  setStatus,
  setIsProcessing,
  setShowExportMenu,
  replaceQuestions,
}) => {
  const handleLoadFromFirestore = useCallback(
    async (silent = false, fullSync = false, onProgress = null) => {
      setIsProcessing(true);
      if (setShowExportMenu) setShowExportMenu(false);

      const processQuestions = (data) => {
        return data.map((q, index) => ({
          ...q,
          // eslint-disable-next-line sonarjs/pseudo-random
          id: q.id || Date.now() + index + Math.random(),
          status: q.status || QUESTION_STATUS.PENDING,
        }));
      };

      try {
        // TIER 1: Instantly display from IndexedDB cache (0ms perceived load).
        // We always do this — it's free and gives the user something to look
        // at while we figure out whether we need a full sync or just a delta.
        const {
          getCachedQuestions,
          cacheQuestions,
          getLastSyncTime,
          setLastSyncTime,
        } = await import("../../services/questionCache");
        const cachedData = await getCachedQuestions();

        if (cachedData.length > 0) {
          const cachedQuestions = processQuestions(cachedData);
          if (replaceQuestions) {
            replaceQuestions(cachedQuestions, QUESTION_SOURCES.DATABASE);
            replaceQuestions(cachedQuestions, QUESTION_SOURCES.IMPORT);
          }
          logger.log(
            `⚡ TIER 1: Instantly loaded ${cachedQuestions.length} cached questions`
          );
        }

        // INCREMENTAL SYNC PATH (the fast common case).
        //
        // When we already have IDB data and a recorded high-water mark, the
        // ONLY thing we need from Firestore is docs updated since that
        // watermark. For a typical reload that's 0–handful of docs instead
        // of a full ~19,580-doc re-fetch (which is what the old 3-tier loader
        // did unconditionally and made reload feel "slow forever").
        //
        // Skipped when:
        //   • fullSync: caller explicitly requested a full refresh (e.g. the
        //     "Refresh" button) — that path catches deletions, which a
        //     `firestoreUpdatedAt > X` query cannot.
        //   • !cachedData.length: cold cache, no baseline to diff from.
        //   • lastSyncTime missing: this is the user's first load after this
        //     code shipped — fall through to the full-sync path to establish
        //     a baseline.
        const lastSyncTime = !fullSync ? await getLastSyncTime() : null;
        const canIncrementalSync =
          !fullSync && cachedData.length > 0 && lastSyncTime !== null;

        if (canIncrementalSync) {
          if (!silent) setStatus("Checking for updates...");

          const updated = await getQuestionsUpdatedSince(lastSyncTime);

          if (updated.length === 0) {
            // Cache already represents the latest state.
            if (!silent) showMessage("Up to date", 1500);
            // Advance the watermark to now() so the next reload also sees a
            // clean delta query. Server clock isn't needed for correctness —
            // we only require monotonicity, and clamping to >= existing keeps
            // it monotonic across machines.
            await setLastSyncTime(Date.now());
            return;
          }

          // Merge incoming updates into the cached set by uniqueId.
          const byUniqueId = new Map();
          for (const q of cachedData) {
            if (q?.uniqueId) byUniqueId.set(q.uniqueId, q);
          }
          let maxUpdated = lastSyncTime;
          for (const q of updated) {
            if (q?.uniqueId) byUniqueId.set(q.uniqueId, q);
            const ts = toMillis(q?.firestoreUpdatedAt);
            if (ts > maxUpdated) maxUpdated = ts;
          }
          const merged = Array.from(byUniqueId.values());
          const mergedQuestions = processQuestions(merged);

          if (replaceQuestions) {
            replaceQuestions(mergedQuestions, QUESTION_SOURCES.DATABASE);
            replaceQuestions(mergedQuestions, QUESTION_SOURCES.IMPORT);
          }
          // Only the changed docs need to be written back — IDB upsert by key.
          await cacheQuestions(updated);
          await setLastSyncTime(maxUpdated);

          logger.log(
            `⚡ INCREMENTAL: applied ${updated.length} update(s), total ${mergedQuestions.length}`
          );
          if (!silent) {
            showMessage(
              updated.length === 1
                ? "1 question updated"
                : `${updated.length} questions updated`,
              2000
            );
          }
          return;
        }

        // FULL-SYNC PATH — runs when:
        //   • Caller asked for it (fullSync=true, e.g. the Refresh button)
        //   • IDB cache is cold (first-ever load or after manual clear)
        //   • Watermark missing (first reload after the incremental-sync
        //     feature shipped) — establishes the baseline
        //
        // This is also the only path that catches deletions, since the
        // incremental `firestoreUpdatedAt > sinceMs` query can't see docs
        // that no longer exist.
        if (!silent) {
          setStatus(cachedData.length > 0 ? "Syncing latest..." : "Loading...");
        }

        // PERF: stream partial results into the UI as each page resolves so
        // the first questions render after one round-trip instead of after
        // the entire ~19,580-doc fetch + sort. getAllQuestionsFromFirestore
        // includes the shared, growing `questions` array on every
        // onProgress({ done:false }) tick; we render a snapshot of it.
        //
        // Gated on a COLD cache only (`cachedData.length === 0`). On warm /
        // Refresh paths the cached list is already on screen, and replacing
        // it with a growing partial would make the list visibly shrink then
        // regrow. The final (sorted) replace below still runs in all cases.
        const shouldStream = cachedData.length === 0 && !!replaceQuestions;
        const progressCb = shouldStream
          ? (progress) => {
              if (onProgress) {
                try {
                  onProgress(progress);
                } catch (cbError) {
                  logger.warn("onProgress callback threw:", cbError);
                }
              }
              if (
                progress &&
                progress.done === false &&
                Array.isArray(progress.questions) &&
                progress.questions.length > 0
              ) {
                const partial = processQuestions(progress.questions.slice());
                replaceQuestions(partial, QUESTION_SOURCES.DATABASE);
                replaceQuestions(partial, QUESTION_SOURCES.IMPORT);
              }
            }
          : onProgress;

        // Pass null as customLimit so getAllQuestionsFromFirestore writes
        // the result to both in-memory cache and IndexedDB. Without this,
        // every cold load (Ctrl+Shift+R, first login) re-fetches all
        // 19,580 docs from Firestore because IDB is never populated.
        const freshData = await getAllQuestionsFromFirestore(
          FULL_SYNC_COUNT,
          true,
          null,
          progressCb
        );
        const freshQuestions = processQuestions(freshData);

        // Guard: never overwrite an existing in-memory list with an empty one.
        // A failed/timed-out Firestore call resolves to [] in our catch path,
        // and replacing state with [] silently wipes everything the user just had.
        if (replaceQuestions && freshQuestions.length > 0) {
          replaceQuestions(freshQuestions, QUESTION_SOURCES.DATABASE);
          replaceQuestions(freshQuestions, QUESTION_SOURCES.IMPORT);
        }

        // Seed the incremental-sync watermark from the highest server
        // timestamp we just saw. Skipped when freshData is empty (no docs
        // or fetch failure) so we don't jump the watermark forward past
        // real data we haven't loaded.
        if (freshQuestions.length > 0) {
          const maxFromFull = freshQuestions.reduce((max, q) => {
            const ts = toMillis(q.firestoreUpdatedAt);
            return ts > max ? ts : max;
          }, 0);
          if (maxFromFull > 0) await setLastSyncTime(maxFromFull);
        }

        logger.log(
          `⚡ FULL SYNC: Fetched ${freshQuestions.length} questions from Firestore`
        );

        if (!silent) {
          let msg;
          if (freshQuestions.length === 0) {
            msg = "Sync returned 0 questions — keeping existing data.";
          } else if (cachedData.length > 0) {
            msg = `Synced ${freshQuestions.length} questions`;
          } else {
            msg = `Loaded ${freshQuestions.length} questions!`;
          }
          showMessage(msg, 3000);
        }
      } catch (e) {
        logError(e, { operation: "loadFromFirestore", silent, fullSync });
        if (!silent) {
          showMessage(`Load Failed: ${e.message}`, 7000);
        }
      } finally {
        setIsProcessing(false);
        setStatus("");
      }
    },

    [
      setIsProcessing,
      setStatus,
      setShowExportMenu,
      showMessage,
      replaceQuestions,
    ]
  );

  return { handleLoadFromFirestore };
};
