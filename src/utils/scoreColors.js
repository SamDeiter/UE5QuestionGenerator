/**
 * Score Color Utilities
 *
 * Provides consistent color styling based on quality scores.
 * Used across critique components to ensure uniform visual feedback.
 */

import { QUALITY_THRESHOLDS } from "./constants";

/**
 * Get Tailwind CSS classes for score-based background/border/text colors.
 * Used for simple color-coded containers.
 *
 * @param {number} score - Quality score (0-100)
 * @returns {string} Tailwind CSS classes
 */
export const getScoreColorClasses = (score) => {
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
 * @returns {Object} Style object with bg, border, text, icon, and label properties
 */
export const getSeverityStyles = (score) => {
  if (score === null || score === undefined)
    return {
      bg: "bg-slate-800",
      border: "border-slate-700",
      text: "text-slate-400",
      icon: "text-slate-500",
    };

  // 90-100: Green (Excellent/Perfect)
  if (score >= QUALITY_THRESHOLDS.EXCELLENT)
    return {
      bg: "bg-emerald-950/40",
      border: "border-emerald-500/50",
      text: "text-emerald-200",
      icon: "text-emerald-400",
      label: "Excellent",
    };

  // 70-89: Yellow (Good but flawed)
  if (score >= QUALITY_THRESHOLDS.PASS)
    return {
      bg: "bg-yellow-950/40",
      border: "border-yellow-500/50",
      text: "text-yellow-200",
      icon: "text-yellow-400",
      label: "Good",
    };

  // 50-69: Orange (Mediocre)
  if (score >= QUALITY_THRESHOLDS.MEDIOCRE)
    return {
      bg: "bg-orange-950/40",
      border: "border-orange-500/50",
      text: "text-orange-200",
      icon: "text-orange-400",
      label: "Mediocre",
    };

  // 0-49: Red (Critical)
  return {
    bg: "bg-red-950/40",
    border: "border-red-500/50",
    text: "text-red-200",
    icon: "text-red-400",
    label: "Critical",
  };
};
