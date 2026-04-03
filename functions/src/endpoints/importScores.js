const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Import AI scores from client-provided batch data
 * Admin-only function
 */
exports.importAIScores = onCall(
  {
    region: "us-central1",
    cors: ["https://samdeiter.github.io", "https://ue5-questions-prod.web.app"],
  },
  async (request) => {
    // Verify admin
    if (!request.auth || request.auth.token.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can import scores"
      );
    }

    const { scores } = request.data;

    if (!scores || !Array.isArray(scores)) {
      throw new HttpsError("invalid-argument", "Scores must be an array");
    }

    const db = admin.firestore();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    let updated = 0;
    let notFound = 0;

    // Process in chunks of 500 (Firestore batch limit)
    for (let i = 0; i < scores.length; i += 500) {
      const chunk = scores.slice(i, i + 500);
      const batchOp = db.batch();

      // PERFORMANCE: Fetch all docs in one round-trip instead of N+1 queries
      const docRefs = chunk.map((entry) =>
        db.collection("questions").doc(String(entry.id))
      );
      const docs = await db.getAll(...docRefs);

      docs.forEach((doc, idx) => {
        if (doc.exists) {
          batchOp.update(doc.ref, {
            aiScore: chunk[idx].originalScore,
            scoredAt: timestamp,
            scoreSource: "Strict_AI_Batch_Import",
          });
          updated++;
        } else {
          notFound++;
        }
      });

      // Commit this batch
      await batchOp.commit();
      console.log(`Imported batch ${Math.floor(i / 500) + 1}`);
    }

    return {
      success: true,
      updated,
      notFound,
      total: scores.length,
    };
  }
);
