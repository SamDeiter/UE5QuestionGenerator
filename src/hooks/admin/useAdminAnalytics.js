import { useState, useCallback } from "react";
import { getReviewerAnalytics } from "../../utils/reviewerAnalytics";
import { logger } from "../../utils/logger";
import { TOAST_DURATION } from "../../utils/constants";

/**
 * useAdminAnalytics Hook
 *
 * Manages reviewer analytics data for the Admin Panel.
 */
export const useAdminAnalytics = (showMessage) => {
  const [reviewerAnalytics, setReviewerAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadReviewerAnalytics = useCallback(async (options = {}) => {
    setAnalyticsLoading(true);
    try {
      const data = await getReviewerAnalytics(options);
      setReviewerAnalytics(data);
    } catch (error) {
      logger.error("Failed to load reviewer analytics:", error);
      showMessage(
        `❌ Failed to load analytics: ${error.message}`,
        TOAST_DURATION.EXTENDED
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }, [showMessage]);

  return {
    reviewerAnalytics,
    analyticsLoading,
    loadReviewerAnalytics,
  };
};

export default useAdminAnalytics;
