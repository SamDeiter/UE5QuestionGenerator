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

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();
const STATS_DOC_PATH = "_aggregates/questionStats";

/**
 * Firestore trigger that updates aggregate stats when questions change.
 * Handles create, update, and delete operations.
 */
exports.updateQuestionStats = onDocumentWritten(
  {
    document: "questions/{questionId}",
    region: "us-central1",
  },
  async (event) => {
    const statsRef = db.doc(STATS_DOC_PATH);

    const before = event.data?.before?.exists ? event.data.before.data() : null;
    const after = event.data?.after?.exists ? event.data.after.data() : null;

    const updates = {};

    // Handle status changes
    if (before?.status !== after?.status) {
      if (before?.status) {
        updates[`byStatus.${before.status}`] = FieldValue.increment(-1);
      }
      if (after?.status) {
        updates[`byStatus.${after.status}`] = FieldValue.increment(1);
      }
    }

    // Handle discipline changes
    if (before?.discipline !== after?.discipline) {
      if (before?.discipline) {
        // Sanitize discipline name for Firestore field path
        const sanitizedBefore = sanitizeFieldName(before.discipline);
        updates[`byDiscipline.${sanitizedBefore}`] = FieldValue.increment(-1);
      }
      if (after?.discipline) {
        const sanitizedAfter = sanitizeFieldName(after.discipline);
        updates[`byDiscipline.${sanitizedAfter}`] = FieldValue.increment(1);
      }
    }

    // Handle type changes
    if (before?.type !== after?.type) {
      if (before?.type) {
        const sanitizedBefore = sanitizeFieldName(before.type);
        updates[`byType.${sanitizedBefore}`] = FieldValue.increment(-1);
      }
      if (after?.type) {
        const sanitizedAfter = sanitizeFieldName(after.type);
        updates[`byType.${sanitizedAfter}`] = FieldValue.increment(1);
      }
    }

    // Handle difficulty changes
    if (before?.difficulty !== after?.difficulty) {
      if (before?.difficulty) {
        const sanitizedBefore = sanitizeFieldName(before.difficulty);
        updates[`byDifficulty.${sanitizedBefore}`] = FieldValue.increment(-1);
      }
      if (after?.difficulty) {
        const sanitizedAfter = sanitizeFieldName(after.difficulty);
        updates[`byDifficulty.${sanitizedAfter}`] = FieldValue.increment(1);
      }
    }

    // Handle doc creation/deletion
    if (!before && after) {
      updates.totalQuestions = FieldValue.increment(1);
    } else if (before && !after) {
      updates.totalQuestions = FieldValue.increment(-1);
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      updates.lastUpdated = FieldValue.serverTimestamp();

      try {
        await statsRef.set(updates, { merge: true });
        console.log(
          `[updateQuestionStats] Updated stats for question ${event.params.questionId}`,
        );
      } catch (error) {
        console.error("[updateQuestionStats] Failed to update stats:", error);
        throw error;
      }
    }
  },
);

/**
 * Sanitizes a field name for use in Firestore document paths.
 * Replaces invalid characters with underscores.
 *
 * @param {string} name - The field name to sanitize
 * @returns {string} - Sanitized field name
 */
function sanitizeFieldName(name) {
  if (!name) return "unknown";
  // Replace periods and slashes with underscores (invalid in field paths)
  return String(name).replace(/[./]/g, "_").replace(/\s+/g, "_").toLowerCase();
}
