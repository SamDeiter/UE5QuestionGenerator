import { useState, useEffect } from "react";
import { logger } from "../utils/logger";
import { getUserTokenUsageAggregated } from "../services/firebaseQueries";
import { TIMING } from "../utils/constants";

/**
 * Hook to calculate token usage from loaded questions.
 * v2.4.31: Transitioned to server-side aggregation for scalability.
 *
 * @param {string|undefined} userId - The user's UID
 * @returns {Object} Token usage data in format expected by TokenUsageDisplay
 */
export function useTokenUsage(userId) {
  const [tokenUsage, setTokenUsage] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    questionCount: 0,
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    const fetchUsage = async () => {
      try {
        const usage = await getUserTokenUsageAggregated(userId);

        setTokenUsage({
          inputTokens: usage.estimatedInputTokens || 0,
          outputTokens: usage.estimatedOutputTokens || 0,
          totalCost: usage.totalCost || 0,
          questionCount: usage.questionCount || 0,
        });
      } catch (error) {
        logger.error("Failed to fetch aggregated token usage:", error);
      } finally {
        // loading state removed to satisfy lint
      }
    };

    // Initial fetch
    fetchUsage();

    // Set up polling for real-time updates (e.g. every 30s)
    const interval = setInterval(
      fetchUsage,
      TIMING.ANALYTICS_REFRESH_MS || 30000
    );

    return () => clearInterval(interval);
  }, [userId]);

  return tokenUsage;
}

export default useTokenUsage;
