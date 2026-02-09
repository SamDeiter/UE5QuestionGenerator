import { useState, useEffect } from "react";
import { logger } from "../utils/logger";
import { getUserTokenUsageAggregated } from "../services/firebaseQueries";
import { getCachedMetadata, cacheMetadata } from "../services/questionCache";
import { TIMING } from "../utils/constants";

/**
 * Hook to calculate token usage from loaded questions.
 * v2.4.31: Transitioned to server-side aggregation for scalability.
 * v2.4.33: Added IndexedDB caching for instant header population.
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

  const cacheKey = userId ? `token_usage_${userId}` : null;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const fetchUsage = async () => {
      try {
        const usage = await getUserTokenUsageAggregated(userId);
        const newData = {
          inputTokens: usage.estimatedInputTokens || 0,
          outputTokens: usage.estimatedOutputTokens || 0,
          totalCost: usage.totalCost || 0,
          questionCount: usage.questionCount || 0,
        };

        setTokenUsage(newData);
        if (cacheKey) {
          await cacheMetadata(cacheKey, newData);
        }
      } catch (error) {
        logger.error("Failed to fetch aggregated token usage:", error);
      }
    };

    const initUsage = async () => {
      // 1. Load from cache first
      if (cacheKey) {
        const cached = await getCachedMetadata(cacheKey);
        if (cached) {
          setTokenUsage(cached);
        }
      }

      // 2. Fetch fresh data
      await fetchUsage();
    };

    // Initial fetch
    initUsage();

    // Set up polling for real-time updates (e.g. every 30s)
    const interval = setInterval(
      fetchUsage,
      TIMING.ANALYTICS_REFRESH_MS || 30000
    );

    return () => clearInterval(interval);
  }, [userId, cacheKey]);

  return tokenUsage;
}

export default useTokenUsage;
