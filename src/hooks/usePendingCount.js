import { useMemo } from "react";
import { logger } from "../utils/logger";

/**
 * Hook to calculate the total number of pending questions for the Review badge.
 * This count increases when questions are kicked back to review.
 *
 * @param {Map} allQuestionsMap - Map of all questions grouped by uniqueId
 * @returns {number} Total count of pending questions
 */
export function usePendingCount(allQuestionsMap) {
  const totalPendingQuestions = useMemo(() => {
    let pending = 0;
    allQuestionsMap.forEach((variants) => {
      // Use the English version or first variant to determine status
      const canonical =
        variants.find((v) => (v.language || "English") === "English") ||
        variants[0];
      if (canonical && (!canonical.status || canonical.status === "pending")) {
        pending++;
      }
    });
    return pending;
  }, [allQuestionsMap]);

  return totalPendingQuestions;
}
