/**
 * Score Color Utilities
 *
 * Provides consistent color styling based on quality scores.
 * Used across critique components to ensure uniform visual feedback.
 * Includes colorblind-safe alternatives for accessibility.
 */

import { QUALITY_THRESHOLDS, COLORBLIND_COLORS } from "./constants";

/**
 * Get Tailwind CSS classes for score-based background/border/text colors.
 * Used for simple color-coded containers.
 *
 * @param {number} score - Quality score (0-100)
 * @param {boolean} colorblindMode - Whether to use colorblind-safe palette
 * @returns {string} Tailwind CSS classes
 */
export const getScoreColorClasses = (score, colorblindMode = false) => {
  if (colorblindMode) {
    if (score >= QUALITY_THRESHOLDS.EXCELLENT) {
      const c = COLORBLIND_COLORS.EXCELLENT;
      return `${c.bg} ${c.border} ${c.text}`;
    }
    if (score >= QUALITY_THRESHOLDS.PASS) {
      const c = COLORBLIND_COLORS.GOOD;
      return `${c.bg} ${c.border} ${c.text}`;
    }
    if (score >= QUALITY_THRESHOLDS.MEDIOCRE) {
      const c = COLORBLIND_COLORS.MEDIOCRE;
      return `${c.bg} ${c.border} ${c.text}`;
    }
    const c = COLORBLIND_COLORS.CRITICAL;
    return `${c.bg} ${c.border} ${c.text}`;
  }

  // Default colors
  if (score >= QUALITY_THRESHOLDS.EXCELLENT)
    return "bg-green-900/30 border-green-700/50 text-green-300";
  if (score >= QUALITY_THRESHOLDS.PASS)
    return "bg-yellow-900/30 border-yellow-700/50 text-yellow-300";
  if (score >= QUALITY_THRESHOLDS.MEDIOCRE)
    return "bg-orange-900/30 border-orange-700/50 text-orange-300";
  return "bg-red-900/30 border-red-700/50 text-red-300";
};

/**
 * Get detailed severity style object for modals and detailed views.
 * Returns separate CSS classes for bg, border, text, icon, and a label.
 *
 * @param {number|null} score - Quality score (0-100) or null
 * @param {boolean} colorblindMode - Whether to use colorblind-safe palette
 * @returns {Object} Style object with bg, border, text, icon, iconSymbol, and label properties
 */
export const getSeverityStyles = (score, colorblindMode = false) => {
  if (score === null || score === undefined)
    return {
      bg: "bg-slate-800",
      border: "border-slate-700",
      text: "text-slate-400",
      icon: "text-slate-500",
      iconSymbol: "",
    };

  if (colorblindMode) {
    if (score >= QUALITY_THRESHOLDS.EXCELLENT) {
      const c = COLORBLIND_COLORS.EXCELLENT;
      return {
        bg: c.bg,
        border: c.border,
        text: c.text,
        icon: c.text,
        iconSymbol: c.icon,
        label: c.label,
      };
    }
    if (score >= QUALITY_THRESHOLDS.PASS) {
      const c = COLORBLIND_COLORS.GOOD;
      return {
        bg: c.bg,
        border: c.border,
        text: c.text,
        icon: c.text,
        iconSymbol: c.icon,
        label: c.label,
      };
    }
    if (score >= QUALITY_THRESHOLDS.MEDIOCRE) {
      const c = COLORBLIND_COLORS.MEDIOCRE;
      return {
        bg: c.bg,
        border: c.border,
        text: c.text,
        icon: c.text,
        iconSymbol: c.icon,
        label: c.label,
      };
    }
    const c = COLORBLIND_COLORS.CRITICAL;
    return {
      bg: c.bg,
      border: c.border,
      text: c.text,
      icon: c.text,
      iconSymbol: c.icon,
      label: c.label,
    };
  }

  // Default colors (original)
  // 90-100: Green (Excellent/Perfect)
  if (score >= QUALITY_THRESHOLDS.EXCELLENT)
    return {
      bg: "bg-emerald-950/40",
      border: "border-emerald-500/50",
      text: "text-emerald-200",
      icon: "text-emerald-400",
      iconSymbol: "✓",
      label: "Excellent",
    };

  // 70-89: Yellow (Good but flawed)
  if (score >= QUALITY_THRESHOLDS.PASS)
    return {
      bg: "bg-yellow-950/40",
      border: "border-yellow-500/50",
      text: "text-yellow-200",
      icon: "text-yellow-400",
      iconSymbol: "⚠",
      label: "Good",
    };

  // 50-69: Orange (Mediocre)
  if (score >= QUALITY_THRESHOLDS.MEDIOCRE)
    return {
      bg: "bg-orange-950/40",
      border: "border-orange-500/50",
      text: "text-orange-200",
      icon: "text-orange-400",
      iconSymbol: "⊛",
      label: "Mediocre",
    };

  // 0-49: Red (Critical)
  return {
    bg: "bg-red-950/40",
    border: "border-red-500/50",
    text: "text-red-200",
    icon: "text-red-400",
    iconSymbol: "✗",
    label: "Critical",
  };
};

/**
 * Get the icon symbol for a given score tier
 * @param {number} score - Quality score
 * @returns {string} Icon symbol character
 */
export const getScoreIcon = (score) => {
  if (score >= QUALITY_THRESHOLDS.EXCELLENT) return "✓";
  if (score >= QUALITY_THRESHOLDS.PASS) return "⚠";
  if (score >= QUALITY_THRESHOLDS.MEDIOCRE) return "⊛";
  return "✗";
};
