import { useState, useEffect } from "react";
import { getCategoryStatsAggregated } from "../services/firebaseQueries";
import { logger } from "../utils/logger";
import { TIMING } from "../utils/constants";

/**
 * Hook to fetch server-side category stats for a discipline.
 * Used to provide "Ground Truth" counts even when local data is limited.
 *
 * @param {string} discipline - Current discipline
 * @returns {Object} { categoryStats, loading }
 */
export function useCategoryStats(discipline) {
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!discipline) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const stats = await getCategoryStatsAggregated(discipline);
        setCategoryStats(stats);
      } catch (error) {
        logger.error(
          `Failed to fetch category stats for ${discipline}:`,
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Poll for updates every 60 seconds (or constant defined in TIMING)
    const interval = setInterval(
      fetchStats,
      TIMING.ANALYTICS_REFRESH_MS || 60000
    );

    return () => clearInterval(interval);
  }, [discipline]);

  return { categoryStats, loading };
}
