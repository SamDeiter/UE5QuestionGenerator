/**
 * Firestore Migration: Add improvedScore to existing critique data
 */

import { db } from "../services/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { logger } from "../utils/logger";

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
    logger.log("🔄 Starting Firestore migration...");

    const questionsRef = collection(db, "questions");
    logger.log("📥 Fetching questions from Firestore...");
    const snapshot = await getDocs(questionsRef);
    logger.log(`📊 Found ${snapshot.size} total questions in Firestore`);

    let updatedCount = 0;
    let totalWithCritiques = 0;
    let alreadyMigrated = 0;
    const updates = [];

    snapshot.forEach((docSnap) => {
      const q = docSnap.data();

      // Track questions with critiques
      if (q.critiqueScore !== undefined && q.critiqueScore !== null) {
        totalWithCritiques++;
      }
      
      // Track already migrated
      if (q.improvedScore) {
        alreadyMigrated++;
      }
      
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

    // Log summary
    logger.log(`📋 Migration Summary:`);
    logger.log(`   - Total questions: ${snapshot.size}`);
    logger.log(`   - With critiques: ${totalWithCritiques}`);
    logger.log(`   - Already migrated: ${alreadyMigrated}`);
    logger.log(`   - Need migration: ${updatedCount}`);
    
    if (updatedCount === 0) {
      logger.log("✅ No questions need migration");
      if (showMessage) {
        showMessage("✅ All questions already have improved scores!", 3000);
      }
      return { success: true, updated: 0 };
    }
    
    // Execute all updates
    logger.log(`⏳ Updating ${updatedCount} questions...`);
    await Promise.all(updates);

    logger.log(`✅ Migrated ${updatedCount} questions in Firestore`);
    if (showMessage) {
      showMessage(
        `✅ Migrated ${updatedCount} questions with estimated improved scores`,
        5000
      );
    }

    return { success: true, updated: updatedCount };
  } catch (error) {
    logger.error("❌ Firestore migration failed:", error);
    if (showMessage) {
      showMessage(`❌ Migration failed: ${error.message}`, 5000);
    }
    return { success: false, error };
  }
};
