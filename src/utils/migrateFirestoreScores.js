/**
 * Firestore Migration: Add improvedScore to existing critique data
 */

import { db } from "../services/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

/**
 * Estimates improved score based on original critique score
 */
const estimateImprovedScore = (originalScore) => {
  if (!originalScore || originalScore >= 95) {
    return Math.min(originalScore + 5, 100);
  } else if (originalScore >= 80) {
    return Math.min(originalScore + 10, 100);
  } else if (originalScore >= 60) {
    return Math.min(originalScore + 15, 100);
  } else {
    return Math.min(originalScore + 20, 100);
  }
};

/**
 * Migrates Firestore questions to add improvedScore
 */
export const migrateFirestoreScores = async (showMessage) => {
  try {
    console.log("🔄 Starting Firestore migration...");

    const questionsRef = collection(db, "questions");
    const snapshot = await getDocs(questionsRef);

    let updatedCount = 0;
    const updates = [];

    snapshot.forEach((docSnap) => {
      const q = docSnap.data();

      // Only migrate if has critique, suggested rewrite, and no improvedScore
      if (
        q.critiqueScore !== undefined &&
        q.critiqueScore !== null &&
        q.suggestedRewrite &&
        !q.improvedScore
      ) {
        const improvedScore = estimateImprovedScore(q.critiqueScore);
        updates.push(
          updateDoc(doc(db, "questions", docSnap.id), {
            improvedScore: improvedScore,
          })
        );
        updatedCount++;
      }
    });

    // Execute all updates
    await Promise.all(updates);

    console.log(`✅ Migrated ${updatedCount} questions in Firestore`);
    if (showMessage) {
      showMessage(
        `✅ Migrated ${updatedCount} questions with estimated improved scores`,
        5000
      );
    }

    return { success: true, updated: updatedCount };
  } catch (error) {
    console.error("❌ Firestore migration failed:", error);
    if (showMessage) {
      showMessage(`❌ Migration failed: ${error.message}`, 5000);
    }
    return { success: false, error };
  }
};
