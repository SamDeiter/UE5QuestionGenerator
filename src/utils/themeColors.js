/**
 * Theme Colors - Centralized color palette with colorblind-safe alternatives
 *
 * This module provides a single source of truth for all color-coded UI elements.
 * Each color set has a default and colorblind-safe variant.
 */

// =============================================================================
// SCORE COLORS - For quality scores (0-100)
// =============================================================================

export const SCORE_TIERS = {
  EXCEPTIONAL: "exceptional", // 90-100
  VERY_GOOD: "veryGood", // 80-89
  GOOD: "good", // 70-79
  ADEQUATE: "adequate", // 60-69
  NEEDS_WORK: "needsWork", // 0-59
};

const SCORE_COLORS = {
  exceptional: {
    default: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      border: "border-green-500/50",
      full: "bg-green-500/20 text-green-400 border-green-500/50",
    },
    colorblind: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/50",
      full: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    },
  },
  veryGood: {
    default: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/50",
      full: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    },
    colorblind: {
      bg: "bg-cyan-500/20",
      text: "text-cyan-400",
      border: "border-cyan-500/50",
      full: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
    },
  },
  good: {
    default: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/50",
      full: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    },
    colorblind: {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      border: "border-amber-500/50",
      full: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    },
  },
  adequate: {
    default: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      border: "border-orange-500/50",
      full: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    },
    colorblind: {
      bg: "bg-purple-500/20",
      text: "text-purple-400",
      border: "border-purple-500/50",
      full: "bg-purple-500/20 text-purple-400 border-purple-500/50",
    },
  },
  needsWork: {
    default: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/50",
      full: "bg-red-500/20 text-red-400 border-red-500/50",
    },
    colorblind: {
      bg: "bg-rose-500/20",
      text: "text-rose-400",
      border: "border-rose-500/50",
      full: "bg-rose-500/20 text-rose-400 border-rose-500/50",
    },
  },
};

// =============================================================================
// STATUS COLORS - For filter buttons (accepted, rejected, pending)
// =============================================================================

const STATUS_COLORS = {
  accepted: {
    default: "bg-green-900/20 text-green-400 hover:bg-green-900/30",
    colorblind: "bg-blue-900/20 text-blue-400 hover:bg-blue-900/30",
  },
  rejected: {
    default: "bg-red-900/20 text-red-400 hover:bg-red-900/30",
    colorblind: "bg-rose-900/20 text-rose-400 hover:bg-rose-900/30",
  },
  pending: {
    default: "bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30",
    colorblind: "bg-amber-900/20 text-amber-400 hover:bg-amber-900/30",
  },
  other: {
    default: "bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/30",
    colorblind: "bg-purple-900/20 text-purple-400 hover:bg-purple-900/30",
  },
};

// =============================================================================
// LOCK INDICATOR COLORS - For question lock status
// =============================================================================

const LOCK_COLORS = {
  hasLock: {
    default: {
      container: "bg-green-900/30 border border-green-500/50 text-green-400",
      icon: "text-green-400",
    },
    colorblind: {
      container: "bg-blue-900/30 border border-blue-500/50 text-blue-400",
      icon: "text-blue-400",
    },
  },
  locked: {
    default: {
      container: "bg-red-900/30 border border-red-500/50 text-red-400",
      icon: "text-red-400",
    },
    colorblind: {
      container: "bg-rose-900/30 border border-rose-500/50 text-rose-400",
      icon: "text-rose-400",
    },
  },
  connecting: {
    default: {
      container: "bg-amber-900/30 border border-amber-500/50 text-amber-400",
      icon: "text-amber-400 animate-spin",
    },
    colorblind: {
      container: "bg-amber-900/30 border border-amber-500/50 text-amber-400",
      icon: "text-amber-400 animate-spin",
    },
  },
};

// =============================================================================
// EVENT BADGE COLORS - For audit logs
// =============================================================================

const EVENT_COLORS = {
  generation: {
    default: "bg-green-900/50 text-green-300",
    colorblind: "bg-blue-900/50 text-blue-300",
  },
  critique: {
    default: "bg-purple-900/50 text-purple-300",
    colorblind: "bg-purple-900/50 text-purple-300",
  },
  api_call: {
    default: "bg-yellow-900/50 text-yellow-300",
    colorblind: "bg-amber-900/50 text-amber-300",
  },
  invite_attempt: {
    default: "bg-blue-900/50 text-blue-300",
    colorblind: "bg-cyan-900/50 text-cyan-300",
  },
  invite_lockout: {
    default: "bg-red-900/50 text-red-300",
    colorblind: "bg-rose-900/50 text-rose-300",
  },
};

// =============================================================================
// PUBLIC API - Getters for color values
// =============================================================================

/**
 * Get score tier based on numeric score
 */
export const getScoreTier = (score) => {
  if (score >= 90) return SCORE_TIERS.EXCEPTIONAL;
  if (score >= 80) return SCORE_TIERS.VERY_GOOD;
  if (score >= 70) return SCORE_TIERS.GOOD;
  if (score >= 60) return SCORE_TIERS.ADEQUATE;
  return SCORE_TIERS.NEEDS_WORK;
};

/**
 * Get score color classes
 * @param {string} tier - Score tier from SCORE_TIERS
 * @param {boolean} colorblindMode - Whether to use colorblind-safe palette
 * @param {string} property - 'full', 'bg', 'text', or 'border'
 */
export const getScoreColor = (
  tier,
  colorblindMode = false,
  property = "full"
) => {
  const mode = colorblindMode ? "colorblind" : "default";
  return SCORE_COLORS[tier]?.[mode]?.[property] || "";
};

/**
 * Get status filter color classes
 * @param {string} status - 'accepted', 'rejected', 'pending', 'other'
 * @param {boolean} colorblindMode - Whether to use colorblind-safe palette
 */
export const getStatusColor = (status, colorblindMode = false) => {
  const mode = colorblindMode ? "colorblind" : "default";
  return (
    STATUS_COLORS[status]?.[mode] ||
    "bg-slate-800 text-slate-400 hover:bg-slate-700/50"
  );
};

/**
 * Get lock indicator color classes
 * @param {boolean} hasLock - Whether user has the lock
 * @param {boolean} isLocked - Whether question is locked by another user
 * @param {boolean} colorblindMode - Whether to use colorblind-safe palette
 * @param {string} property - 'container' or 'icon'
 */
export const getLockColor = (
  hasLock,
  isLocked,
  colorblindMode = false,
  property = "container"
) => {
  const mode = colorblindMode ? "colorblind" : "default";
  let status = "connecting";
  if (hasLock && !isLocked) status = "hasLock";
  else if (isLocked) status = "locked";
  return LOCK_COLORS[status]?.[mode]?.[property] || "";
};

/**
 * Get event badge color classes
 * @param {string} event - Event type
 * @param {boolean} colorblindMode - Whether to use colorblind-safe palette
 */
export const getEventColor = (event, colorblindMode = false) => {
  const mode = colorblindMode ? "colorblind" : "default";
  return EVENT_COLORS[event]?.[mode] || "bg-slate-700 text-slate-300";
};
