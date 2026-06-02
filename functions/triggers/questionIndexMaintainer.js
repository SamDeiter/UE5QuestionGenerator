/**
 * Question Index Maintainer - Firestore Trigger
 *
 * Mirrors every `questions/{id}` write into a compact `questionIndex/{id}`
 * document (see questionIndexProjection.js for the field set). The client
 * bulk-loads the lighter index collection for the Review/Database list,
 * filters, counts, and search; the heavy detail-only fields are fetched on
 * demand from the full `questions` doc when a card is expanded.
 *
 * Mirrors the structure of questionStatsUpdater.js (v2 onDocumentWritten,
 * named database via db.js). Writes to a DIFFERENT collection than it triggers
 * on, so there is no recursive-trigger loop.
 *
 * @module triggers/questionIndexMaintainer
 */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { getDb, databaseId } = require("../db");
const { projectQuestionIndex } = require("./questionIndexProjection");

const INDEX_COLLECTION = "questionIndex";

exports.maintainQuestionIndex = onDocumentWritten(
  {
    document: "questions/{questionId}",
    database: databaseId,
    region: "us-central1",
  },
  async (event) => {
    const { questionId } = event.params;
    const indexRef = getDb().collection(INDEX_COLLECTION).doc(questionId);

    const after = event.data?.after?.exists ? event.data.after.data() : null;

    try {
      if (!after) {
        // Source doc deleted -> drop the mirror.
        await indexRef.delete();
      } else {
        // Create or update -> full overwrite of the projected fields. Using
        // set() without merge keeps the mirror an exact projection (so a field
        // cleared on the source is also cleared here) and is idempotent, which
        // makes the trigger safe to retry and the backfill safe to re-run.
        await indexRef.set(projectQuestionIndex(after));
      }
    } catch (error) {
      console.error(
        `[maintainQuestionIndex] Failed for question ${questionId}:`,
        error
      );
      throw error; // allow Cloud Functions to retry
    }

    return null;
  }
);
