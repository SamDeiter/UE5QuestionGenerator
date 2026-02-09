import { useState, useEffect } from "react";
import { getQuestionStats } from "../services/firebaseQueries";
import { getCachedMetadata, cacheMetadata } from "../services/questionCache";
import { logger } from "../utils/logger";
import { TIMING } from "../utils/constants";

const CACHE_KEY = "global_stats";

/**
 * Hook to fetch and poll global project statistics from Firestore.
 * This document is maintained by a Cloud Function trigger.
 *
 * @returns {Object} { globalStats, statsLoading, error, refreshStats }
 */
export const useGlobalStats = () => {
  const [globalStats, setGlobalStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      const data = await getQuestionStats();
      if (data) {
        setGlobalStats(data);
        await cacheMetadata(CACHE_KEY, data);
      }
      setError(null);
    } catch (err) {
      logger.error("Error fetching global stats:", err);
      setError(err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    const initStats = async () => {
      // 1. Load from cache first for instant feedback
      const cached = await getCachedMetadata(CACHE_KEY);
      if (cached) {
        setGlobalStats(cached);
        setStatsLoading(false);
      }

      // 2. Fetch fresh data
      await fetchStats();
    };

    initStats();

    // Poll every 5 minutes (300,000ms)
    const interval = setInterval(
      fetchStats,
      TIMING?.STATS_POLL_INTERVAL || 300000
    );
    return () => clearInterval(interval);
  }, []);

  return {
    globalStats,
    statsLoading,
    error,
    refreshStats: fetchStats,
  };
};

export default useGlobalStats;
