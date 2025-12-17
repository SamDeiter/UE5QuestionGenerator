const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

/**
 * Import AI scores from client-provided batch data
 * Admin-only function
 */
exports.importAIScores = onCall(
  {
    region: "us-central1",
    cors: true,
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

      for (const entry of chunk) {
        const questionId = String(entry.id);
        const score = entry.originalScore;
        const docRef = db.collection("questions").doc(questionId);

        // Check if document exists first
        const doc = await docRef.get();
        if (doc.exists) {
          batchOp.update(docRef, {
            aiScore: score,
            scoredAt: timestamp,
            scoreSource: "Strict_AI_Batch_Import",
          });
          updated++;
        } else {
          notFound++;
        }
      }

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
