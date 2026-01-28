/**
 * Helper functions for lock status display in QuestionItem.
 * Extracted from QuestionItem.jsx to reduce component complexity.
 */

/**
 * Get CSS classes for lock status container or icon
 * @param {boolean} hasLock - Whether current user has the lock
 * @param {boolean} isLocked - Whether question is locked by another user
 * @param {string} type - "container" or "icon"
 * @param {boolean} colorblindMode - Whether colorblind mode is enabled
 * @returns {string} Tailwind CSS classes
 */
export const getLockColor = (
  hasLock,
  isLocked,
  type,
  colorblindMode = false
) => {
  const cb = colorblindMode;

  if (hasLock) {
    if (type === "container") {
      return cb
        ? "bg-blue-900/30 border border-blue-500/50"
        : "bg-green-900/30 border border-green-500/50";
    }
    return cb ? "text-blue-400" : "text-green-400";
  }

  if (isLocked) {
    if (type === "container") {
      return cb
        ? "bg-rose-900/30 border border-rose-500/50"
        : "bg-red-900/30 border border-red-500/50";
    }
    return cb ? "text-rose-400" : "text-red-400";
  }

  if (type === "container") {
    return "bg-slate-800/50 border border-slate-600/50";
  }
  return "text-slate-400";
};

/**
 * Get tooltip text for lock status
 * @param {boolean} hasLock - Whether current user has the lock
 * @param {boolean} isLocked - Whether question is locked by another user
 * @param {string} lockedByEmail - Email of user who has the lock
 * @returns {string} Tooltip text
 */
export const getLockTooltip = (hasLock, isLocked, lockedByEmail) => {
  if (hasLock) return "You have the edit lock";
  if (isLocked) return `Locked by ${lockedByEmail || "another user"}`;
  return "Available for editing";
};

/**
 * Get icon name for lock status
 * @param {boolean} hasLock - Whether current user has the lock
 * @param {boolean} isLocked - Whether question is locked by another user
 * @returns {string} Icon name
 */
export const getLockIcon = (hasLock, isLocked) => {
  if (hasLock) return "edit-3";
  if (isLocked) return "lock";
  return "unlock";
};

/**
 * Get label text for lock status
 * @param {boolean} hasLock - Whether current user has the lock
 * @param {boolean} isLocked - Whether question is locked by another user
 * @returns {string} Label text
 */
export const getLockLabel = (hasLock, isLocked) => {
  if (hasLock) return "Editing";
  if (isLocked) return "Locked";
  return "Available";
};

/**
 * Get CSS classes for question status styling
 * @param {string} status - Question status constant
 * @returns {string} Tailwind CSS classes
 */
export const getStatusStyle = (status) => {
  switch (status) {
    case "accepted":
      return "ring-1 ring-green-500/50";
    case "rejected":
      return "border-red-900/50 bg-slate-950/80 opacity-50 grayscale";
    default:
      return "";
  }
};

/**
 * Get CSS classes for difficulty gradient background
 * @param {string} difficulty - Question difficulty level
 * @returns {string} Tailwind CSS classes
 */
export const getDifficultyGradient = (difficulty) => {
  const d = difficulty?.toLowerCase();

  if (d === "easy" || d === "beginner") {
    return "bg-gradient-to-br from-slate-900/50 to-green-950 border-green-700 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]";
  }
  if (d === "medium" || d === "intermediate") {
    return "bg-gradient-to-br from-slate-900/50 to-yellow-950 border-yellow-700 shadow-[0_0_15px_-5px_rgba(234,179,8,0.3)]";
  }
  if (d === "hard" || d === "expert") {
    return "bg-gradient-to-br from-slate-900/50 to-red-950 border-red-700 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]";
  }

  return "bg-slate-900 border-slate-800";
};

/**
 * Get CSS classes for difficulty badge
 * @param {string} difficulty - Question difficulty level
 * @param {boolean} colorblindMode - Whether colorblind mode is enabled
 * @returns {string} Tailwind CSS classes
 */
export const getDiffBadgeColor = (difficulty, colorblindMode = false) => {
  const diff = difficulty?.toLowerCase();
  const cb = colorblindMode;

  if (diff === "beginner" || diff === "easy") {
    return cb
      ? "bg-blue-950 text-blue-400 border-blue-800"
      : "bg-green-950 text-green-400 border-green-800";
  }
  if (diff === "intermediate" || diff === "medium") {
    return "bg-yellow-950 text-yellow-400 border-yellow-800";
  }
  if (diff === "expert" || diff === "hard") {
    return cb
      ? "bg-rose-950 text-rose-400 border-rose-800"
      : "bg-red-950 text-red-400 border-red-800";
  }

  return "bg-slate-800 text-slate-400 border-slate-700";
};

// ============================================
// VERIFICATION DATA BUILDERS
// ============================================

/**
 * Build update data for "Verified via Docs" action
 * @param {string} userEmail - Email of the verifier
 * @param {Object} clickInfo - Click tracking info
 * @returns {Object} Update data for Firestore
 */
export const buildVerifyDocsData = (userEmail, clickInfo = {}) => ({
  humanVerified: true,
  humanVerifiedBy: userEmail || "Unknown",
  humanVerifiedAt: new Date().toISOString(),
  verificationSource: "epic_docs",
  verificationClickedDocs: clickInfo.clickedDocs || false,
  verificationClickedSearch: clickInfo.clickedSearch || false,
});

/**
 * Build update data for "Verified via Search" action
 * @param {string} userEmail - Email of the verifier
 * @param {Object} clickInfo - Click tracking info
 * @returns {Object} Update data for Firestore
 */
export const buildVerifySearchData = (userEmail, clickInfo = {}) => ({
  humanVerified: true,
  humanVerifiedBy: userEmail || "Unknown",
  humanVerifiedAt: new Date().toISOString(),
  verificationSource: "google_search",
  verificationClickedDocs: clickInfo.clickedDocs || false,
  verificationClickedSearch: clickInfo.clickedSearch || false,
});

/**
 * Build update data for "Reject Verification" action
 * @param {string} userEmail - Email of the rejector
 * @param {string} reasonId - Rejection reason ID
 * @param {Object} clickInfo - Click tracking info
 * @returns {Object} Update data for Firestore
 */
export const buildRejectVerificationData = (
  userEmail,
  reasonId,
  clickInfo = {}
) => ({
  humanVerified: false,
  verificationRejected: true,
  verificationRejectedBy: userEmail || "Unknown",
  verificationRejectedAt: new Date().toISOString(),
  verificationRejectReason: reasonId,
  verificationClickedDocs: clickInfo.clickedDocs || false,
  verificationClickedSearch: clickInfo.clickedSearch || false,
});

/**
 * Build update data for "Flag as Unverified" action
 * @param {string} userEmail - Email of the flagger
 * @param {Object} clickInfo - Click tracking info
 * @returns {Object} Update data for Firestore
 */
export const buildFlagUnverifiedData = (userEmail, clickInfo = {}) => ({
  // Mark as verified so it advances to Accept step
  humanVerified: true,
  humanVerifiedBy: userEmail || "Unknown",
  humanVerifiedAt: new Date().toISOString(),
  verificationSource: "flagged_unverified",
  // But also flag as source unverified
  sourceUnverified: true,
  sourceUnverifiedBy: userEmail || "Unknown",
  sourceUnverifiedAt: new Date().toISOString(),
  sourceUnverifiedReason: "not_found_anywhere",
  verificationClickedDocs: clickInfo.clickedDocs || false,
  verificationClickedSearch: clickInfo.clickedSearch || false,
});
