/**
 * Migration Script: Link Existing Translations with Original Questions
 *
 * This script fixes existing translations in the database by ensuring:
 * 1. All English originals have a uniqueId
 * 2. All translations share the same uniqueId as their original
 * 3. Both can be found by createUniqueFilteredQuestions for language switching
 */

import { db } from "../services/firebase.js";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

async function migrateTranslations() {
  console.log("🔄 Starting translation migration...");

  try {
    // 1. Fetch all questions from Firestore
    const questionsRef = collection(db, "questions");
    const snapshot = await getDocs(questionsRef);
    const allQuestions = snapshot.docs.map((doc) => ({
      firestoreId: doc.id,
      ...doc.data(),
    }));

    console.log(`📊 Found ${allQuestions.length} total questions`);

    // 2. Group questions by their content similarity (same question text = same original)
    const translationGroups = new Map();

    // Find all non-English questions (translations)
    const translations = allQuestions.filter(
      (q) => q.language && q.language !== "English"
    );

    console.log(`🌍 Found ${translations.length} translated questions`);

    // 3. For each translation, find its English original
    let fixedCount = 0;
    let alreadyLinkedCount = 0;

    for (const translation of translations) {
      // Skip if already has a uniqueId (already linked)
      if (translation.uniqueId) {
        alreadyLinkedCount++;

        // Check if the English original also has this uniqueId
        const englishOriginal = allQuestions.find(
          (q) =>
            q.uniqueId === translation.uniqueId &&
            (q.language === "English" || !q.language)
        );

        if (!englishOriginal) {
          console.warn(
            `⚠️ Translation has uniqueId but no English original found:`,
            {
              id: translation.id,
              uniqueId: translation.uniqueId,
              language: translation.language,
            }
          );
        }
        continue;
      }

      // Find English original by matching discipline, type, difficulty, and similar question structure
      const englishOriginal = allQuestions.find(
        (q) =>
          (q.language === "English" || !q.language) &&
          q.discipline === translation.discipline &&
          q.type === translation.type &&
          q.difficulty === translation.difficulty &&
          q.correct === translation.correct // Same correct answer
      );

      if (englishOriginal) {
        // Generate or use existing uniqueId
        const sharedUniqueId = englishOriginal.uniqueId || crypto.randomUUID();

        console.log(`🔗 Linking translation to original:`, {
          originalId: englishOriginal.id,
          translationId: translation.id,
          translationLanguage: translation.language,
          sharedUniqueId,
        });

        // Update English original if it doesn't have uniqueId
        if (!englishOriginal.uniqueId) {
          await updateDoc(doc(db, "questions", englishOriginal.firestoreId), {
            uniqueId: sharedUniqueId,
            language: "English", // Ensure language is set
          });
          console.log(`  ✅ Updated English original with uniqueId`);
        }

        // Update translation with uniqueId
        await updateDoc(doc(db, "questions", translation.firestoreId), {
          uniqueId: sharedUniqueId,
        });
        console.log(`  ✅ Updated translation with uniqueId`);

        fixedCount++;
      } else {
        console.warn(`⚠️ No English original found for translation:`, {
          id: translation.id,
          language: translation.language,
          discipline: translation.discipline,
        });
      }
    }

    console.log("\n✅ Migration complete!");
    console.log(`📊 Statistics:`);
    console.log(`   - Already linked: ${alreadyLinkedCount}`);
    console.log(`   - Newly linked: ${fixedCount}`);
    console.log(`   - Total translations: ${translations.length}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Export for use in admin panel or run directly
export { migrateTranslations };

// Uncomment to run directly:
// migrateTranslations().then(() => console.log('Done')).catch(console.error);
