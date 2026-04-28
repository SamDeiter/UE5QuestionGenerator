import { useState, useCallback } from "react";
import { logger } from "../utils/logger";

/**
 * Hook for managing bulk translation operations.
 *
 * @param {Object} params - Hook parameters
 * @param {Function} params.onTranslateSingle - Function to translate a single question
 * @param {Function} params.showMessage - Function to display toast messages
 * @returns {Object} Bulk translation state and handlers
 */

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries a function with exponential backoff.
 */
const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Only retry on 429 (Too Many Requests) or network errors
      const isRateLimit = error.message?.includes('429') || error.status === 429;
      const isNetworkError = !error.status && error.message?.includes('fetch');
      
      if (isRateLimit || isNetworkError) {
        const waitTime = baseDelay * Math.pow(2, i);
        logger.warn(`⚠️ [Retry] Rate limit hit. Retrying in ${waitTime}ms (Attempt ${i + 1}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }
      throw error; // Rethrow other errors immediately
    }
  }
  throw lastError;
};

export const useBulkTranslation = (onTranslateSingle, showMessage, onComplete) => {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  /**
   * Translates a list of questions to a target language sequentially.
   *
   * @param {Array} questions - Questions to translate
   * @param {string} targetLanguage - Language to translate into
   */
  const handleBulkTranslate = useCallback(
    async (questions, targetLanguage) => {
      if (!questions || questions.length === 0) {
        showMessage("No questions selected for translation.", 3000);
        return;
      }

      if (isBulkProcessing) return;

      const confirmed = window.confirm(
        `Are you sure you want to translate ${questions.length} questions to ${targetLanguage}? This will use Gemini API tokens.`
      );

      if (!confirmed) return;

      setIsBulkProcessing(true);
      setProgress({ current: 0, total: questions.length });

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        try {
          setProgress((prev) => ({ ...prev, current: i + 1 }));
          // Wrap in retry logic with exponential backoff
          await withRetry(() => onTranslateSingle(q, targetLanguage));
          successCount++;
        } catch (error) {
          logger.error(
            `❌ [BulkTranslate] Failed for ID ${q.uniqueId}:`,
            error
          );
          failCount++;
          // Continue with next instead of failing entire batch
        }
      }

      setIsBulkProcessing(false);
      if (onComplete) onComplete();
      setProgress({ current: 0, total: 0 });

      if (failCount > 0) {
        showMessage(
          `Bulk translation complete: ${successCount} success, ${failCount} failed.`,
          5000
        );
      } else {
        showMessage(
          `✓ Successfully translated ${successCount} questions to ${targetLanguage}!`,
          5000
        );
      }
    },
    [onTranslateSingle, showMessage, isBulkProcessing]
  );

  return {
    handleBulkTranslate,
    isBulkProcessing,
    progress,
  };
};
