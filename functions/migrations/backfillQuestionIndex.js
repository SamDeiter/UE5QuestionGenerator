/**
 * Backfill Question Index
 *
 * Admin-only callable that populates the compact `questionIndex` mirror
 * collection from the existing `questions` corpus. Run ONCE after deploying the
 * maintainQuestionIndex trigger; the trigger keeps the mirror current for all
 * writes thereafter.
 *
 * Idempotent and re-runnable: each index doc is a full set() of the projection,
 * so re-running (or overlapping with live trigger writes during the backfill)
 * converges to the same result. Safe to re-run if it times out partway.
 *
 * @module migrations/backfillQuestionIndex
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getDb } = require("../db");
const { projectQuestionIndex } = require("../triggers/questionIndexProjection");

const db = getDb();
const SOURCE_COLLECTION = "questions";
const INDEX_COLLECTION = "questionIndex";
// Firestore caps a WriteBatch at 500 ops; 400 leaves headroom and keeps each
// page's memory footprint small.
const BATCH_SIZE = 400;

exports.backfillQuestionIndex = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to run backfill."
      );
    }

    const callerClaims = context.auth.token;
    if (callerClaims.role !== "admin" && callerClaims.role !== "owner") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can run the backfill."
      );
    }

    console.log(`[backfillQuestionIndex] Started by ${context.auth.uid}`);

    try {
      let processed = 0;
      let batches = 0;
      let lastDoc = null;

      // Cursor-paginate by document id so we never hold the whole corpus in
      // memory at once.
      while (true) {
        let query = db
          .collection(SOURCE_COLLECTION)
          .orderBy(admin.firestore.FieldPath.documentId())
          .limit(BATCH_SIZE);
        if (lastDoc) query = query.startAfter(lastDoc);

        const snapshot = await query.get();
        if (snapshot.empty) break;

        const writeBatch = db.batch();
        snapshot.forEach((doc) => {
          const indexRef = db.collection(INDEX_COLLECTION).doc(doc.id);
          writeBatch.set(indexRef, projectQuestionIndex(doc.data()));
        });
        await writeBatch.commit();

        processed += snapshot.size;
        batches += 1;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        console.log(
          `[backfillQuestionIndex] Batch ${batches}: ${processed} processed`
        );

        if (snapshot.size < BATCH_SIZE) break; // last (short) page
      }

      console.log(
        `[backfillQuestionIndex] Complete: ${processed} questions mirrored in ${batches} batch(es)`
      );

      return { success: true, totalProcessed: processed, batches };
    } catch (error) {
      console.error("[backfillQuestionIndex] Failed:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);
