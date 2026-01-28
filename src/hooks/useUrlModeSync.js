import { useEffect } from "react";
import { APP_MODES, QUESTION_STATUS } from "../utils/constants";
import { logger } from "../utils/logger";

/**
 * Hook to synchronize app state when mode is set via URL parameters
 *
 * When the app loads with ?mode=review or ?mode=translate in the URL,
 * this hook ensures the filter and history states match the expected mode.
 *
 * @param {Object} options - Hook options
 * @param {string} options.appMode - Current app mode
 * @param {boolean} options.showHistory - Whether history view is shown
 * @param {Function} options.setShowHistory - Setter for showHistory
 * @param {Function} options.setFilterMode - Setter for filter mode
 * @param {Function} options.setCurrentReviewIndex - Setter for review index
 */
export function useUrlModeSync({
  appMode,
  showHistory,
  setShowHistory,
  setFilterMode,
  setCurrentReviewIndex,
}) {
  useEffect(() => {
    // If the appMode was set via URL (detected in useAppConfig)
    // we need to ensure the filters and history visibility are initialized correctly
    if (appMode === APP_MODES.REVIEW && !showHistory) {
      logger.log("🎯 Initializing Review Mode from URL parameters");
      setShowHistory(true);
      setFilterMode(QUESTION_STATUS.PENDING);
      setCurrentReviewIndex(0);
    } else if (appMode === APP_MODES.TRANSLATE && !showHistory) {
      logger.log("🎯 Initializing Translate Mode from URL parameters");
      setShowHistory(true);
      setFilterMode(QUESTION_STATUS.ACCEPTED);
      setCurrentReviewIndex(0);
    }
  }, [
    appMode,
    setShowHistory,
    setFilterMode,
    setCurrentReviewIndex,
    showHistory,
  ]);
}
