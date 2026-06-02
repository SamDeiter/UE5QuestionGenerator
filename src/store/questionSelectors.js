import { useMemo } from "react";
import { useQuestionStore } from "./questionStore";
import { QUESTION_SOURCES } from "../utils/constants";

/**
 * Pure, store-derivable selectors over `allQuestions`.
 *
 * These derive views that depend ONLY on the raw question array (no Firestore
 * stats), so they can be computed straight from the question store. The pure
 * builder functions are shared with `useQuestionDerivedData` to guarantee a
 * single implementation (no divergence between the store path and the hook).
 *
 * Stats-dependent values (approvedCounts, totalApproved, overallPercentage,
 * isTargetMet, …) intentionally live ONLY in useQuestionDerivedData because they
 * also need categoryStats / globalStats from Firestore.
 */

/** Group every question by uniqueId/id into language-variant arrays. */
export const buildAllQuestionsMap = (allQuestions) => {
  const newMap = new Map();

  allQuestions.forEach((q) => {
    const id = q.uniqueId || q.id;
    if (!id) return;
    if (!newMap.has(id)) newMap.set(id, []);

    const variants = newMap.get(id);
    const lang = q.language || "English";

    if (!variants.some((v) => (v.language || "English") === lang)) {
      variants.push(q);
    }
  });

  return newMap;
};

/** Map each uniqueId to the Set of languages present (derived from the map). */
export const buildTranslationMap = (allQuestions) => {
  const allQuestionsMap = buildAllQuestionsMap(allQuestions);
  const map = new Map();
  Array.from(allQuestionsMap.keys()).forEach((uniqueId) => {
    const variants = allQuestionsMap.get(uniqueId);
    const langSet = new Set(variants.map((v) => v.language || "English"));
    map.set(uniqueId, langSet);
  });
  return map;
};

/** Session-scoped questions (the create-mode working set). */
export const buildSessionQuestions = (allQuestions) =>
  allQuestions.filter((q) => q._source === QUESTION_SOURCES.SESSION);

/**
 * Read the all-questions map directly from the store, memoized on the raw
 * question array so the Map reference stays stable between unrelated renders.
 */
export const useAllQuestionsMap = () => {
  const allQuestions = useQuestionStore((s) => s.allQuestions);
  return useMemo(() => buildAllQuestionsMap(allQuestions), [allQuestions]);
};

/** Translation (language-coverage) map, read from the store and memoized. */
export const useTranslationMap = () => {
  const allQuestions = useQuestionStore((s) => s.allQuestions);
  return useMemo(() => buildTranslationMap(allQuestions), [allQuestions]);
};

/** Session questions, read from the store and memoized. */
export const useSessionQuestions = () => {
  const allQuestions = useQuestionStore((s) => s.allQuestions);
  return useMemo(() => buildSessionQuestions(allQuestions), [allQuestions]);
};
