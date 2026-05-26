import { useMemo } from "react";

/**
 * Hook to calculate the total number of pending questions for the Review badge.
 * This count increases when questions are kicked back to review.
 *
 * @param {Map} allQuestionsMap - Map of all questions grouped by uniqueId
 * @param {string} [discipline] - Optional discipline filter. When provided, only
 *   questions whose canonical variant matches this discipline are counted.
 * @returns {number} Total count of pending questions
 */
export function usePendingCount(allQuestionsMap, discipline) {
  const totalPendingQuestions = useMemo(() => {
    let pending = 0;
    allQuestionsMap.forEach((variants) => {
      // Use the English version or first variant to determine status
      const canonical =
        variants.find((v) => (v.language || "English") === "English") ||
        variants[0];
      if (!canonical) return;
      if (discipline && canonical.discipline !== discipline) return;
      if (!canonical.status || canonical.status === "pending") {
        pending++;
      }
    });
    return pending;
  }, [allQuestionsMap, discipline]);

  return totalPendingQuestions;
}
