const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Import utility functions
const { isAdminUser } = require("../utils/isAdminUser");

/**
 * Cloud Function: migrateTranslations
 * Links existing translated questions with their English originals via uniqueId
 * Uses Firebase Admin SDK for efficient bulk operations
 * SUPER ADMIN ONLY
 */

exports.migrateTranslations = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" }) // 9 minutes max
  .https.onCall(async (data, context) => {
    // SUPER ADMIN CHECK
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in"
      );
    }

    const isSuperAdmin = await isAdminUser(context.auth.uid);
    if (!isSuperAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only super admins can run migrations"
      );
    }

    console.log(
      `🔄 Translation migration started by ${context.auth.uid} (${context.auth.token.email})`
    );

    try {
      const db = admin.firestore();
      const questionsRef = db.collection("questions");

      // 1. Fetch all questions
      const snapshot = await questionsRef.get();
      const allQuestions = snapshot.docs.map((doc) => ({
        firestoreId: doc.id,
        ...doc.data(),
      }));

      console.log(`📊 Found ${allQuestions.length} total questions`);

      // 2. Find all translations (non-English questions)
      const translations = allQuestions.filter(
        (q) => q.language && q.language !== "English"
      );

      console.log(`🌍 Found ${translations.length} translated questions`);

      let fixedCount = 0;
      let alreadyLinkedCount = 0;
      let orphanedCount = 0;
      const batch = db.batch();
      let batchCount = 0;

      // 3. Process each translation
      for (const translation of translations) {
        // Skip if already has a uniqueId (already linked)
        if (translation.uniqueId) {
          alreadyLinkedCount++;

          // Verify English original exists
          const englishOriginal = allQuestions.find(
            (q) =>
              q.uniqueId === translation.uniqueId &&
              (q.language === "English" || !q.language)
          );

          if (!englishOriginal) {
            console.warn(
              `⚠️ Orphaned translation (has uniqueId but no English original):`,
              {
                id: translation.id,
                uniqueId: translation.uniqueId,
                language: translation.language,
              }
            );
            orphanedCount++;
          }
          continue;
        }

        // Find English original by matching key attributes
        const englishOriginal = allQuestions.find(
          (q) =>
            (q.language === "English" || !q.language) &&
            q.discipline === translation.discipline &&
            q.type === translation.type &&
            q.difficulty === translation.difficulty &&
            q.correct === translation.correct
        );

        if (englishOriginal) {
          // Generate or use existing uniqueId
          const sharedUniqueId =
            englishOriginal.uniqueId || crypto.randomUUID();

          console.log(`🔗 Linking translation to original:`, {
            originalId: englishOriginal.id,
            translationId: translation.id,
            translationLanguage: translation.language,
            sharedUniqueId,
          });

          // Update English original if it doesn't have uniqueId
          if (!englishOriginal.uniqueId) {
            const englishRef = questionsRef.doc(englishOriginal.firestoreId);
            batch.update(englishRef, {
              uniqueId: sharedUniqueId,
              language: "English", // Ensure language is set
            });
            batchCount++;
          }

          // Update translation with uniqueId
          const translationRef = questionsRef.doc(translation.firestoreId);
          batch.update(translationRef, {
            uniqueId: sharedUniqueId,
          });
          batchCount++;

          fixedCount++;

          // Firestore batch limit is 500 operations
          if (batchCount >= 450) {
            console.log(`📦 Committing batch of ${batchCount} updates...`);
            await batch.commit();
            batchCount = 0;
          }
        } else {
          console.warn(`⚠️ No English original found for translation:`, {
            id: translation.id,
            language: translation.language,
            discipline: translation.discipline,
          });
          orphanedCount++;
        }
      }

      // Commit remaining batch
      if (batchCount > 0) {
        console.log(`📦 Committing final batch of ${batchCount} updates...`);
        await batch.commit();
      }

      const stats = {
        totalQuestions: allQuestions.length,
        totalTranslations: translations.length,
        alreadyLinked: alreadyLinkedCount,
        newlyLinked: fixedCount,
        orphaned: orphanedCount,
      };

      console.log("✅ Migration complete!", stats);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Migration failed: ${error.message}`
      );
    }
  });
