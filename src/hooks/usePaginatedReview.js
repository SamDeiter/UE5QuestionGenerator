import { useState, useRef, useEffect, useCallback } from "react";
import { getQuestionsPaginatedWithFilters } from "../services/firebaseQueries";
import { APP_MODES } from "../utils/constants";
import { logger } from "../utils/logger";

/**
 * usePaginatedReview — Tier 2 first-paint pagination for Review mode.
 *
 * On a cold load the global in-memory question list is empty until the
 * background 3-tier sync finishes streaming. This hook fetches just the first
 * page(s) of the default Review slice straight from Firestore so the first
 * cards render after a single ~25-doc round-trip instead of waiting on the
 * bulk fetch. The moment the in-memory list becomes available the caller
 * switches back to it (see ViewRouter), and this hook clears itself.
 *
 * Deliberately conservative — it only activates for the "clean default" filter
 * state (status pill only, no search/tags/score/reviewer/creator filters),
 * because getQuestionsPaginatedWithFilters can only express status + discipline
 * server-side. Anything else falls back to the Tier 1 streaming path, which is
 * always correct. `all` is excluded too: an (`all` + specific discipline)
 * query would need a (discipline, firestoreUpdatedAt) composite index that does
 * not exist, so we restrict to the three concrete statuses whose indexes are
 * verified present: (status, firestoreUpdatedAt) and
 * (discipline, status, firestoreUpdatedAt).
 */

const PAGE_SIZE = 25;
// Statuses with verified composite-index coverage (with and without discipline).
const PAGINATED_MODES = new Set(["pending", "accepted", "rejected"]);

export function usePaginatedReview({
  appMode,
  filterMode,
  discipline,
  hasMemoryData,
  cleanDefault,
}) {
  const active =
    appMode === APP_MODES.REVIEW &&
    !!cleanDefault &&
    PAGINATED_MODES.has(filterMode);

  const [questions, setQuestions] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const cursorRef = useRef(null);
  const seenRef = useRef(new Set());
  const fetchingRef = useRef(false);
  // Monotonic key so a page response that resolves after a reset (filter or
  // discipline change) is discarded instead of being merged into the new set.
  const requestKeyRef = useRef(0);

  const loadPage = useCallback(
    async (reset) => {
      if (!active || hasMemoryData) return;
      if (fetchingRef.current) return;
      if (!reset && !hasMore) return;

      fetchingRef.current = true;
      if (reset) {
        requestKeyRef.current += 1;
        cursorRef.current = null;
        seenRef.current = new Set();
      }
      const myKey = requestKeyRef.current;
      setLoading(true);

      try {
        const {
          questions: page,
          lastDoc,
          hasMore: more,
        } = await getQuestionsPaginatedWithFilters({
          status: filterMode, // pending | accepted | rejected (never "all" here)
          discipline: discipline || null,
          pageSize: PAGE_SIZE,
          lastDoc: reset ? null : cursorRef.current,
        });

        // Drop stale responses from before a reset.
        if (myKey !== requestKeyRef.current) return;

        cursorRef.current = lastDoc;
        setHasMore(more);

        // Dedup by uniqueId, preserving the query's recency order. This is a
        // transient slice — it's replaced by the fully-filtered in-memory list
        // as soon as the background load completes — so a simple first-wins
        // dedup is enough (no need for language-variant selection here).
        const fresh = [];
        for (const q of page) {
          const key = q.uniqueId || q.id;
          if (key && !seenRef.current.has(key)) {
            seenRef.current.add(key);
            fresh.push(q);
          }
        }
        setQuestions((prev) => (reset ? fresh : [...prev, ...fresh]));
      } catch (e) {
        logger.warn("usePaginatedReview: page fetch failed", e);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [active, hasMemoryData, hasMore, filterMode, discipline]
  );

  // (Re)load page 1 when the hook activates or the status/discipline changes;
  // clear when it deactivates (e.g. the in-memory list arrived) to free memory.
  useEffect(() => {
    if (active && !hasMemoryData) {
      loadPage(true);
    } else {
      setQuestions([]);
      setHasMore(false);
      cursorRef.current = null;
      seenRef.current = new Set();
    }
    // loadPage is intentionally omitted: we only want to reset on the inputs
    // below, not on every loadPage identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hasMemoryData, filterMode, discipline]);

  const fetchNextPage = useCallback(() => loadPage(false), [loadPage]);

  return { questions, hasMore, fetchNextPage, loading };
}

export default usePaginatedReview;
