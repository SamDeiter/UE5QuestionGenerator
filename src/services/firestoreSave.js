/**
 * firestoreSave.js - Role-Aware Firestore Save Functions
 *
 * Provides typed save functions that enforce Firestore security rules:
 * - Owners can update all fields
 * - Reviewers can only update specific allowed fields
 *
 * This prevents permission-denied errors from sending unauthorized fields.
 */

import { doc, setDoc, Timestamp } from "firebase/firestore";
import { getDb } from "./firebase";
import { logger } from "../utils/logger";
import { REVIEWER_ALLOWED_FIELDS } from "../utils/constants";
import { removeUndefined } from "../utils/firestoreHelpers";

/**
 * Restricted save for reviewers.
 * Only sends fields that reviewers are allowed to modify per Firestore rules.
 *
 * @param {string} questionId - The question's uniqueId
 * @param {Object} updates - Object containing only reviewer-allowed field updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveQuestionAsReviewer = async (questionId, updates) => {
  if (!questionId) {
    logger.error("[SaveAsReviewer] Missing questionId");
    return { success: false, error: "Missing questionId" };
  }

  // Filter to only allowed fields
  const allowedUpdates = {};
  for (const field of REVIEWER_ALLOWED_FIELDS) {
    if (field in updates) {
      allowedUpdates[field] = updates[field];
    }
  }

  // Warn if caller tried to send non-allowed fields
  const attemptedFields = Object.keys(updates);
  const blockedFields = attemptedFields.filter(
    (f) => !REVIEWER_ALLOWED_FIELDS.includes(f) && f !== "uniqueId"
  );
  if (blockedFields.length > 0) {
    logger.warn(
      `[SaveAsReviewer] Blocked non-allowed fields: ${blockedFields.join(", ")}`
    );
  }

  try {
    const docRef = doc(getDb(), "questions", questionId);

    const payload = removeUndefined({
      ...allowedUpdates,
      firestoreUpdatedAt: Timestamp.now(),
    });

    await setDoc(docRef, payload, { merge: true });
    logger.log(
      `[SaveAsReviewer] Saved ${questionId} with fields: ${Object.keys(
        payload
      ).join(", ")}`
    );
    return { success: true };
  } catch (error) {
    logger.error(`[SaveAsReviewer] Failed for ${questionId}:`, error);
    return { success: false, error: error.message };
  }
};
