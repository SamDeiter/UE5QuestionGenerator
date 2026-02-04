/**
 * Question Stats Updater - Firestore Trigger
 *
 * Maintains a real-time aggregate document at `_aggregates/questionStats`
 * that tracks question counts by status and discipline.
 *
 * This eliminates the need to count documents client-side, reducing
 * Firestore reads from 5000+ to 1 for dashboard stats.
 *
 * @module triggers/questionStatsUpdater
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();
const STATS_DOC_PATH = "_aggregates/questionStats";

/**
 * Sanitizes a field name for use in Firestore document paths.
 * @param {string} name - The field name to sanitize
 * @returns {string} - Sanitized field name
 */
function sanitizeFieldName(name) {
  if (!name) return "unknown";
  return String(name).replace(/[./]/g, "_").replace(/\s+/g, "_").toLowerCase();
}

/**
 * Builds the update object for a field change.
 * @param {string} fieldPath - The aggregate field path (e.g., 'byStatus')
 * @param {*} before - Previous value
 * @param {*} after - New value
 * @returns {Object} Updates to apply
 */
function buildFieldUpdates(fieldPath, before, after) {
  const updates = {};

  if (before !== after) {
    if (before) {
      const key = sanitizeFieldName(before);
      updates[`${fieldPath}.${key}`] = admin.firestore.FieldValue.increment(-1);
    }
    if (after) {
      const key = sanitizeFieldName(after);
      updates[`${fieldPath}.${key}`] = admin.firestore.FieldValue.increment(1);
    }
  }

  return updates;
}

/**
 * Firestore trigger that updates aggregate stats when questions change.
 * Handles create, update, and delete operations.
 */
exports.updateQuestionStats = functions.firestore
  .document("questions/{questionId}")
  .onWrite(async (change, context) => {
    const statsRef = db.doc(STATS_DOC_PATH);

    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    let updates = {};

    // Handle status changes
    Object.assign(
      updates,
      buildFieldUpdates("byStatus", before?.status, after?.status),
    );

    // Handle discipline changes
    Object.assign(
      updates,
      buildFieldUpdates("byDiscipline", before?.discipline, after?.discipline),
    );

    // Handle type changes
    Object.assign(
      updates,
      buildFieldUpdates("byType", before?.type, after?.type),
    );

    // Handle difficulty changes
    Object.assign(
      updates,
      buildFieldUpdates("byDifficulty", before?.difficulty, after?.difficulty),
    );

    // Handle doc creation/deletion
    if (!before && after) {
      updates.totalQuestions = admin.firestore.FieldValue.increment(1);
    } else if (before && !after) {
      updates.totalQuestions = admin.firestore.FieldValue.increment(-1);
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      updates.lastUpdated = admin.firestore.FieldValue.serverTimestamp();

      try {
        await statsRef.set(updates, { merge: true });
        console.log(
          `[updateQuestionStats] Updated stats for question ${context.params.questionId}`,
        );
      } catch (error) {
        console.error("[updateQuestionStats] Failed to update stats:", error);
        throw error;
      }
    }

    return null;
  });
