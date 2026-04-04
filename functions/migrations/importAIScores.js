const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Import utility functions
const { isAdminUser } = require("../utils/isAdminUser");

/**
 * Cloud Function: importAIScores
 * Bulk import AI quality scores (ADMIN ONLY)
 */

exports.importAIScores = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" }) // 9 minute timeout for large imports
  .https.onCall(async (data, context) => {
    // ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isAdmin = await isAdminUser(context.auth.uid);
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required to import scores"
      );
    }

    const { scores } = data;

    if (!scores || !Array.isArray(scores)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Scores must be an array"
      );
    }

    const db = admin.firestore();
    const timestamp = admin.firestore.Timestamp.now();

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    try {
      // Process in chunks of 500 (Firestore batch limit)
      for (let i = 0; i < scores.length; i += 500) {
        const chunk = scores.slice(i, i + 500);
        const batchOp = db.batch();

        for (const entry of chunk) {
          try {
            const questionTimestampId = Number(entry.id);
            const score = entry.originalScore;

            // Query for the question by its id field (not Firestore doc ID)
            const querySnapshot = await db
              .collection("questions")
              .where("id", "==", questionTimestampId)
              .limit(1)
              .get();

            if (!querySnapshot.empty) {
              const docRef = querySnapshot.docs[0].ref;
              batchOp.update(docRef, {
                aiScore: score,
                scoredAt: timestamp,
                scoreSource: "Strict_AI_Batch_Import",
              });
              updated++;
            } else {
              notFound++;
            }
          } catch (err) {
            console.error(`Error preparing update for ${entry.id}:`, err);
            errors++;
          }
        }

        // Commit this batch
        await batchOp.commit();
        console.log(
          `Imported batch ${Math.floor(i / 500) + 1}/${Math.ceil(
            scores.length / 500
          )}`
        );
      }

      return {
        success: true,
        updated,
        notFound,
        errors,
        total: scores.length,
      };
    } catch (error) {
      console.error("Error importing scores:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to import scores: ${error.message}`
      );
    }
  });
