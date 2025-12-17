/**
 * Quick Migration Runner
 *
 * Run this in the browser console to fix existing translations:
 *
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire file
 * 3. Call: runMigration()
 */

import { db } from "./firebase.js";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

window.runTranslationMigration = async function () {
  console.log("🔄 Starting translation migration...");

  try {
    // Fetch all questions
    const questionsRef = collection(db, "questions");
    const snapshot = await getDocs(questionsRef);
    const allQuestions = snapshot.docs.map((d) => ({
      firestoreId: d.id,
      ...d.data(),
    }));

    console.log(`📊 Found ${allQuestions.length} total questions`);

    const translations = allQuestions.filter(
      (q) => q.language && q.language !== "English"
    );

    console.log(`🌍 Found ${translations.length} translated questions`);

    let fixedCount = 0;

    for (const translation of translations) {
      if (translation.uniqueId) continue; // Already linked

      // Find English original
      const englishOriginal = allQuestions.find(
        (q) =>
          (q.language === "English" || !q.language) &&
          q.discipline === translation.discipline &&
          q.type === translation.type &&
          q.difficulty === translation.difficulty &&
          q.correct === translation.correct
      );

      if (englishOriginal) {
        const sharedUniqueId = englishOriginal.uniqueId || crypto.randomUUID();

        // Update English original
        if (!englishOriginal.uniqueId) {
          await updateDoc(doc(db, "questions", englishOriginal.firestoreId), {
            uniqueId: sharedUniqueId,
            language: "English",
          });
        }

        // Update translation
        await updateDoc(doc(db, "questions", translation.firestoreId), {
          uniqueId: sharedUniqueId,
        });

        console.log(
          `✅ Linked: ${
            translation.language
          } ← English (${sharedUniqueId.substring(0, 8)})`
        );
        fixedCount++;
      }
    }

    console.log(`\n✅ Migration complete! Fixed ${fixedCount} translations`);
    alert(
      `Migration complete! Fixed ${fixedCount} translations. Refresh the page.`
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    alert(`Migration failed: ${error.message}`);
  }
};

console.log("✅ Migration function loaded. Run: runTranslationMigration()");
