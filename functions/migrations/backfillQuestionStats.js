/**
 * Backfill Question Stats
 *
 * Admin-only callable function that initializes the `_aggregates/questionStats`
 * document from existing question data.
 *
 * This should be run once after deploying the updateQuestionStats trigger,
 * or any time you need to recalculate the aggregate stats.
 *
 * @module migrations/backfillQuestionStats
 */

const functions = require("firebase-functions");
const { getDb } = require("../db");
const admin = require("firebase-admin");

const db = getDb();
const STATS_DOC_PATH = "_aggregates/questionStats";

/**
 * Sanitizes a field name for use in Firestore.
 */
function sanitizeFieldName(name) {
  if (!name) return "unknown";
  return String(name).replace(/[./]/g, "_").replace(/\s+/g, "_").toLowerCase();
}

/**
 * Callable function to backfill question statistics.
 * Requires admin role to execute.
 */
exports.backfillQuestionStats = functions.https.onCall(
  async (data, context) => {
    // Verify caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to run backfill.",
      );
    }

    // Verify caller has admin role
    const callerClaims = context.auth.token;
    if (callerClaims.role !== "admin" && callerClaims.role !== "owner") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can run the backfill.",
      );
    }

    console.log(`[backfillQuestionStats] Started by ${context.auth.uid}`);

    try {
      const snapshot = await db.collection("questions").get();
      console.log(
        `[backfillQuestionStats] Processing ${snapshot.size} questions`,
      );

      const stats = {
        byStatus: {},
        byDiscipline: {},
        byType: {},
        byDifficulty: {},
        totalQuestions: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
        backfilledBy: context.auth.uid,
      };

      snapshot.forEach((doc) => {
        const docData = doc.data();
        stats.totalQuestions++;

        if (docData.status) {
          const key = sanitizeFieldName(docData.status);
          stats.byStatus[key] = (stats.byStatus[key] || 0) + 1;
        }

        if (docData.discipline) {
          const key = sanitizeFieldName(docData.discipline);
          stats.byDiscipline[key] = (stats.byDiscipline[key] || 0) + 1;
        }

        if (docData.type) {
          const key = sanitizeFieldName(docData.type);
          stats.byType[key] = (stats.byType[key] || 0) + 1;
        }

        if (docData.difficulty) {
          const key = sanitizeFieldName(docData.difficulty);
          stats.byDifficulty[key] = (stats.byDifficulty[key] || 0) + 1;
        }
      });

      await db.doc(STATS_DOC_PATH).set(stats);

      console.log(
        `[backfillQuestionStats] Complete: ${stats.totalQuestions} questions processed`,
      );

      return {
        success: true,
        totalQuestions: stats.totalQuestions,
        byStatus: stats.byStatus,
        byDiscipline: stats.byDiscipline,
        byType: stats.byType,
        byDifficulty: stats.byDifficulty,
      };
    } catch (error) {
      console.error("[backfillQuestionStats] Failed:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);
