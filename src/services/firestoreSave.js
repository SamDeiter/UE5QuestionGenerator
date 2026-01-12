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
import { auth } from "./firebaseAuth";
import { logger } from "../utils/logger";
import { REVIEWER_ALLOWED_FIELDS } from "../utils/constants";

/**
 * Remove undefined values from object (Firestore rejects undefined)
 */
const removeUndefined = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, removeUndefined(v)])
  );
};

/**
 * Full save for question owners/creators.
 * Includes all fields and sets creatorId if missing.
 *
 * @param {Object} question - Complete question object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveQuestionAsOwner = async (question) => {
  if (!question?.uniqueId) {
    logger.error("[SaveAsOwner] Missing uniqueId", question);
    return { success: false, error: "Missing uniqueId" };
  }

  try {
    const docRef = doc(getDb(), "questions", question.uniqueId);

    const payload = removeUndefined({
      ...question,
      firestoreUpdatedAt: Timestamp.now(),
    });

    // Owners should have their ID set
    if (auth.currentUser && !payload.creatorId) {
      payload.creatorId = auth.currentUser.uid;
      payload.creatorEmail = auth.currentUser.email;
    }

    await setDoc(docRef, payload, { merge: true });
    logger.log(`[SaveAsOwner] Saved ${question.uniqueId}`);
    return { success: true };
  } catch (error) {
    logger.error(`[SaveAsOwner] Failed for ${question.uniqueId}:`, error);
    return { success: false, error: error.message };
  }
};

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

/**
 * Targeted save for status updates (accept/reject).
 * Sends only status-related fields.
 *
 * @param {string} questionId - The question's uniqueId
 * @param {string} status - New status ('accepted', 'rejected', 'pending')
 * @param {Object} metadata - Additional status metadata
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const saveQuestionStatusUpdate = async (
  questionId,
  status,
  metadata = {}
) => {
  const updates = {
    status,
    ...metadata,
  };

  return saveQuestionAsReviewer(questionId, updates);
};
