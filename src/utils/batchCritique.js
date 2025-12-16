/**
 * Batch Critique Utility - Critiques all questions in Firestore
 *
 * Features:
 * - Processes in batches to avoid overwhelming the API
 * - Rate limiting to respect Gemini API limits
 * - Progress tracking and resumption
 * - Incremental saves to Firestore
 */

import { db } from "../services/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { generateCritiqueSecure } from "../services/geminiSecure";

const BATCH_SIZE = 10; // Process 10 questions at a time
const DELAY_BETWEEN_BATCHES = 2000; // 2 second delay between batches (rate limiting)

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Batch critique all uncritiqued questions
 */
export const batchCritiqueAllQuestions = async (
  apiKey,
  onProgress,
  onComplete
) => {
  try {
    console.log("🔄 Starting batch critique...");

    // Get all questions that DON'T have a critique yet
    const questionsRef = collection(db, "questions");
    const snapshot = await getDocs(questionsRef);

    const uncritiquedQuestions = [];
    snapshot.forEach((docSnap) => {
      const q = docSnap.data();
      if (!q.critiqueScore && !q.critique) {
        uncritiquedQuestions.push({ id: docSnap.id, ...q });
      }
    });

    console.log(
      `📊 Found ${uncritiquedQuestions.length} questions without critiques`
    );
    console.log(`📊 Total questions in database: ${snapshot.size}`);

    if (uncritiquedQuestions.length === 0) {
      onComplete({
        success: true,
        processed: 0,
        message: "All questions already critiqued!",
      });
      return;
    }

    let processed = 0;
    let errors = 0;
    const totalToProcess = uncritiquedQuestions.length;

    // Process in batches
    for (let i = 0; i < uncritiquedQuestions.length; i += BATCH_SIZE) {
      const batch = uncritiquedQuestions.slice(i, i + BATCH_SIZE);

      console.log(
        `⏳ Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          uncritiquedQuestions.length / BATCH_SIZE
        )}`
      );

      // Process batch in parallel
      const batchPromises = batch.map(async (q) => {
        try {
          console.log(`🔍 Critiquing question ${q.id}...`);

          // Call the AI to critique
          const result = await generateCritiqueSecure(apiKey, q);

          // Update Firestore with critique results
          await updateDoc(doc(db, "questions", q.id), {
            critique: result.text,
            critiqueScore: result.score,
            suggestedRewrite: result.rewrite,
            rewriteChanges: result.changes,
            improvedScore: result.improvedScore,
            critiqueAttempts: 1,
            lastCritiquedAt: new Date().toISOString(),
          });

          processed++;

          // Report progress
          if (onProgress) {
            onProgress({
              processed,
              total: totalToProcess,
              percent: Math.round((processed / totalToProcess) * 100),
              currentQuestion: q.question?.substring(0, 50) + "...",
            });
          }

          console.log(`✅ Critiqued ${q.id} - Score: ${result.score}/100`);
          return { success: true, id: q.id, score: result.score };
        } catch (error) {
          errors++;
          console.error(`❌ Failed to critique ${q.id}:`, error.message);
          return { success: false, id: q.id, error: error.message };
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);

      // Rate limiting: wait before next batch
      if (i + BATCH_SIZE < uncritiquedQuestions.length) {
        console.log(
          `⏸️ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`
        );
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    console.log(`✅ Batch critique complete!`);
    console.log(`   - Processed: ${processed}/${totalToProcess}`);
    console.log(`   - Errors: ${errors}`);

    if (onComplete) {
      onComplete({
        success: true,
        processed,
        errors,
        total: totalToProcess,
      });
    }

    return {
      success: true,
      processed,
      errors,
      total: totalToProcess,
    };
  } catch (error) {
    console.error("❌ Batch critique failed:", error);
    if (onComplete) {
      onComplete({ success: false, error: error.message });
    }
    throw error;
  }
};
