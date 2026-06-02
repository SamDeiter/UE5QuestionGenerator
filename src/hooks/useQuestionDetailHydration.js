import { useEffect, useRef } from "react";
import { USE_INDEX, getFullQuestionDoc } from "../services/firebase";
import { INDEX_OMITTED_FIELDS } from "../utils/constants";
import { logger } from "../utils/logger";

/**
 * useQuestionDetailHydration — Tier 3b lazy-fill.
 *
 * When the bulk loader sources from the compact `questionIndex` mirror
 * (USE_INDEX === true), in-memory questions are missing the 5 large
 * detail-only fields in INDEX_OMITTED_FIELDS (sourceExcerpt, sourceUrl,
 * explanation, groundingSources, editHistory). This hook resolves the FULL
 * `questions/{docId}` doc for the question(s) currently in focus and merges
 * ONLY those missing fields back into app state, so the card (and its
 * language-variant tabs) render complete detail.
 *
 * Design notes:
 *   • No-op when USE_INDEX is false — questions already carry every field, so
 *     the whole feature is gated on the single flag. This is why shipping with
 *     the flag off is risk-free.
 *   • Keys on the DOC ID (`q.id`), which parseQuestionDoc set to the real
 *     Firestore doc id — bare uniqueId for English, `{uniqueId}_{lang}` for a
 *     translation. Fetching by doc id returns the CORRECT per-language source
 *     text; keying on uniqueId would bleed English source onto translation tabs.
 *   • Merges only the absent detail fields (never overwrites fields already
 *     present in memory), so an unsaved local edit is never clobbered.
 *   • Dedups per doc id for the hook's lifetime, and skips any question that
 *     already has all detail fields (e.g. locally-created/edited questions).
 *
 * @param {Array<Object>|Object|null} questionsOrQuestion - focused question(s)
 *   to hydrate (the current review card + its variants, a quiz set, etc.)
 * @param {Function} mergeQuestion - (docId, partialFields) => void; a LOCAL
 *   state merge (e.g. handleManualUpdate / updateQuestionInState). Must NOT
 *   persist to Firestore.
 */
export const useQuestionDetailHydration = (
  questionsOrQuestion,
  mergeQuestion
) => {
  const requestedRef = useRef(new Set());

  useEffect(() => {
    if (!USE_INDEX || typeof mergeQuestion !== "function") return;

    let list = [];
    if (Array.isArray(questionsOrQuestion)) {
      list = questionsOrQuestion;
    } else if (questionsOrQuestion) {
      list = [questionsOrQuestion];
    }

    const targets = list.filter((q) => {
      if (!q?.id) return false;
      if (requestedRef.current.has(q.id)) return false;
      // Skip if the question already carries every detail field (already
      // hydrated, or a full-doc-sourced / locally-created question).
      const missing = INDEX_OMITTED_FIELDS.some((f) => q[f] === undefined);
      return missing;
    });

    if (targets.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const q of targets) {
        // Mark eagerly so a re-render mid-fetch doesn't double-request.
        requestedRef.current.add(q.id);
        try {
          const full = await getFullQuestionDoc(q.id);
          if (cancelled || !full) continue;

          // Build a patch of ONLY the missing detail fields.
          const patch = {};
          for (const f of INDEX_OMITTED_FIELDS) {
            if (q[f] === undefined && full[f] !== undefined) {
              patch[f] = full[f];
            }
          }
          if (Object.keys(patch).length > 0) {
            mergeQuestion(q.id, patch);
          }
        } catch (error) {
          // On failure, allow a later retry by un-marking this id.
          requestedRef.current.delete(q.id);
          logger.warn(`Detail hydration failed for ${q.id}:`, error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [questionsOrQuestion, mergeQuestion]);
};

export default useQuestionDetailHydration;
