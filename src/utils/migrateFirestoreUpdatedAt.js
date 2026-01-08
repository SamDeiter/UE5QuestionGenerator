/**
 * Firebase Migration: Add firestoreUpdatedAt to questions missing it
 *
 * PROBLEM: getAllQuestionsFromFirestore uses orderBy("firestoreUpdatedAt", "desc")
 * which EXCLUDES questions that don't have this field.
 *
 * This explains why Tech Art, Look Dev, and Worldbuilding show fewer questions
 * on GitHub Pages - those older questions are missing firestoreUpdatedAt.
 *
 * SOLUTION: Add firestoreUpdatedAt to all questions that are missing it,
 * using their dateAdded or current timestamp as fallback.
 */

import { db } from "../services/firebase.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { logger } from "../utils/logger";

export const migrateFirestoreUpdatedAt = async () => {
  try {
    logger.log("🔄 Starting firestoreUpdatedAt migration...");

    const questionsRef = collection(db, "questions");
    const snapshot = await getDocs(questionsRef);

    let updatedCount = 0;
    let skippedCount = 0;
    const batch = [];

    snapshot.forEach((docSnap) => {
      const question = docSnap.data();

      // Check if firestoreUpdatedAt is missing or null
      if (!question.firestoreUpdatedAt) {
        // Use dateAdded as fallback, or current time if that's also missing
        const fallbackDate = question.dateAdded
          ? new Date(question.dateAdded)
          : new Date();

        batch.push(
          updateDoc(doc(db, "questions", docSnap.id), {
            firestoreUpdatedAt: Timestamp.fromDate(fallbackDate),
          })
        );
        updatedCount++;
      } else {
        skippedCount++;
      }
    });

    if (batch.length > 0) {
      logger.log(
        `📝 Updating ${batch.length} questions with missing firestoreUpdatedAt...`
      );
      await Promise.all(batch);
      logger.log(
        `✅ Migration complete: Updated ${updatedCount} questions, skipped ${skippedCount}`
      );
      return {
        updated: updatedCount,
        skipped: skippedCount,
        total: snapshot.size,
      };
    } else {
      logger.log(
        `✅ No migration needed: All ${snapshot.size} questions already have firestoreUpdatedAt`
      );
      return { updated: 0, skipped: snapshot.size, total: snapshot.size };
    }
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  }
};
