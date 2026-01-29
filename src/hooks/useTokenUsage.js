import { useState, useEffect } from "react";
import { logger } from "../utils/logger";
import { getTokenUsageFromQuestions } from "../utils/analyticsStore";
import { getUserTokenUsageAggregated } from "../services/firebaseQueries";

/**
 * Hook to fetch and manage token usage data from Firestore.
 * Uses server-side aggregation for efficiency (1 read vs 5000+).
 *
 * @param {string|undefined} userId - The user's UID
 * @param {Array} databaseQuestions - Fallback question list for client-side calculation
 * @returns {Object|null} Token usage data in format expected by TokenUsageDisplay
 */
export function useTokenUsage(userId, databaseQuestions = []) {
  const [tokenUsage, setTokenUsage] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTokenUsage = async () => {
      if (!userId) {
        setTokenUsage(null);
        return;
      }

      try {
        const aggregatedUsage = await getUserTokenUsageAggregated(userId);
        if (isMounted) {
          // Return flat structure expected by Header/TokenUsageDisplay
          setTokenUsage({
            inputTokens: aggregatedUsage.estimatedInputTokens || 0,
            outputTokens: aggregatedUsage.estimatedOutputTokens || 0,
            totalCost: aggregatedUsage.totalCost || 0,
            questionCount: aggregatedUsage.questionCount || 0,
          });
        }
      } catch (error) {
        logger.error("Failed to fetch aggregated token usage:", error);
        // Fallback to client-side calculation if aggregation fails
        if (isMounted && databaseQuestions.length > 0) {
          const userQuestions = databaseQuestions.filter(
            (q) => q.creatorId === userId
          );
          setTokenUsage(getTokenUsageFromQuestions(userQuestions));
        }
      }
    };

    fetchTokenUsage();

    return () => {
      isMounted = false;
    };
  }, [userId, databaseQuestions]);

  return tokenUsage;
}

export default useTokenUsage;
