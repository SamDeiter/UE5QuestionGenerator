/**
 * useThemeColors Hook - Easy access to theme colors with colorblind mode support
 *
 * This hook provides convenient access to the centralized color system
 * and automatically handles colorblind mode based on AccessibilityContext.
 */

import { useAccessibility } from "../contexts/AccessibilityContext";
import {
  getScoreTier,
  getScoreColor,
  getStatusColor,
  getLockColor,
  getEventColor,
  getActionColor,
  getSeverityStylesFromScore,
  SCORE_TIERS,
} from "../utils/themeColors";

/**
 * Hook that provides theme colors with automatic colorblind mode support
 * @returns {Object} Color getter functions
 */
export const useThemeColors = () => {
  const { colorblindMode } = useAccessibility();

  return {
    /**
     * Get score tier from numeric score
     */
    getScoreTier,

    /**
     * Score tier constants
     */
    SCORE_TIERS,

    /**
     * Get score color by tier name
     * @param {string} tier - Score tier (exceptional, veryGood, good, adequate, needsWork)
     * @param {string} property - 'full', 'bg', 'text', or 'border'
     */
    scoreColor: (tier, property = "full") =>
      getScoreColor(tier, colorblindMode, property),

    /**
     * Get score color by numeric score
     * @param {number} score - Numeric score (0-100)
     * @param {string} property - 'full', 'bg', 'text', or 'border'
     */
    scoreColorByValue: (score, property = "full") => {
      const tier = getScoreTier(score);
      return getScoreColor(tier, colorblindMode, property);
    },

    /**
     * Get status filter button color
     * @param {string} status - 'accepted', 'rejected', 'pending', 'other'
     */
    statusColor: (status) => getStatusColor(status, colorblindMode),

    /**
     * Get lock indicator color
     * @param {boolean} hasLock - Whether user has the lock
     * @param {boolean} isLocked - Whether question is locked by another user
     * @param {string} property - 'container' or 'icon'
     */
    lockColor: (hasLock, isLocked, property = "container") =>
      getLockColor(hasLock, isLocked, colorblindMode, property),

    /**
     * Get event badge color
     * @param {string} event - Event type
     */
    eventColor: (event) => getEventColor(event, colorblindMode),

    /**
     * Get action button color
     * @param {string} action - 'success', 'danger', 'warning', 'info'
     */
    actionColor: (action) => getActionColor(action, colorblindMode),

    /**
     * Get severity styles object (returns object with bg, border, text, icon, etc.)
     * @param {number|null} score - Quality score (0-100)
     */
    severityStyles: (score) =>
      getSeverityStylesFromScore(score, colorblindMode),

    /**
     * Current colorblind mode state (for components that need raw access)
     */
    colorblindMode,
  };
};

export default useThemeColors;
