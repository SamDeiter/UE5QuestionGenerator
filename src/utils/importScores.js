/**
 * Import AI scores from batch JSON files into Firestore
 * Run this from the browser console in the app
 */

import { getDb } from "../services/firebase";
import { doc, writeBatch } from "firebase/firestore";

// Import all score batches
import batch_0_199 from "../../Scores/strict_scored_batch_0_199.json";
import batch_200_399 from "../../Scores/strict_scored_batch_200_399.json";
import batch_400_599 from "../../Scores/strict_scored_batch_400_599.json";
import batch_600_799 from "../../Scores/strict_scored_batch_600_799.json";
import batch_800_999 from "../../Scores/strict_scored_batch_800_999.json";
import batch_1000_1199 from "../../Scores/strict_scored_batch_1000_1199.json";
import batch_1200_1399 from "../../Scores/strict_scored_batch_1200_1399.json";
import batch_1400_1599 from "../../Scores/strict_scored_batch_1400_1599.json";
import batch_1600_1695 from "../../Scores/strict_scored_batch_1600_1695.json";
import { logger } from "../utils/logger";

const allBatches = [
  ...batch_0_199,
  ...batch_200_399,
  ...batch_400_599,
  ...batch_600_799,
  ...batch_800_999,
  ...batch_1000_1199,
  ...batch_1200_1399,
  ...batch_1400_1599,
  ...batch_1600_1695,
];

/**
 * Apply scores to Firestore in batches of 500 (Firestore limit)
 */
export async function applyScoresToFirestore(onProgress) {
  logger.log(`🔥 Starting score import for ${allBatches.length} questions...`);

  const db = getDb(); // Initialize db here

  let updated = 0;
  let errors = 0;
  const BATCH_SIZE = 500;

  // Process in chunks
  for (let i = 0; i < allBatches.length; i += BATCH_SIZE) {
    const chunk = allBatches.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const entry of chunk) {
      const questionId = String(entry.id);
      const score = entry.originalScore;

      try {
        const docRef = doc(db, "questions", questionId);
        batch.update(docRef, {
          aiScore: score,
          scoredAt: new Date(),
          scoreSource: "Strict_AI_Batch_Import",
        });
        updated++;
      } catch (error) {
        logger.error(`❌ Error preparing update for ${questionId}:`, error);
        errors++;
      }
    }

    // Commit batch
    try {
      await batch.commit();
      logger.log(
        `✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} committed (${
          chunk.length
        } questions)`
      );
      if (onProgress) {
        onProgress({
          current: i + chunk.length,
          total: allBatches.length,
          updated,
          errors,
        });
      }
    } catch (error) {
      logger.error(`❌ Failed to commit batch:`, error);
      errors += chunk.length;
    }
  }

  logger.log(`\n✅ Score import complete!`);
  logger.log(`   Updated: ${updated}`);
  logger.log(`   Errors: ${errors}`);

  return { updated, errors };
}

/**
 * Get score distribution
 */
export function getScoreDistribution() {
  const ranges = {
    "90-100 (Exceptional)": 0,
    "80-89 (Very Good)": 0,
    "70-79 (Good)": 0,
    "60-69 (Adequate)": 0,
    "50-59 (Weak)": 0,
    "Below 50 (Poor)": 0,
  };

  allBatches.forEach((entry) => {
    const score = entry.originalScore;
    if (score >= 90) ranges["90-100 (Exceptional)"]++;
    else if (score >= 80) ranges["80-89 (Very Good)"]++;
    else if (score >= 70) ranges["70-79 (Good)"]++;
    else if (score >= 60) ranges["60-69 (Adequate)"]++;
    else if (score >= 50) ranges["50-59 (Weak)"]++;
    else ranges["Below 50 (Poor)"]++;
  });

  return ranges;
}
