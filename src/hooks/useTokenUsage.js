import { useState, useEffect } from "react";
import { logger } from "../utils/logger";
import { getTokenUsageFromQuestions } from "../utils/analyticsStore";

/**
 * Hook to calculate token usage from loaded questions.
 * Uses client-side calculation for reliability.
 *
 * @param {string|undefined} userId - The user's UID
 * @param {Array} databaseQuestions - Questions loaded from Firestore
 * @returns {Object} Token usage data in format expected by TokenUsageDisplay
 */
export function useTokenUsage(userId, databaseQuestions = []) {
  const [tokenUsage, setTokenUsage] = useState({
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    questionCount: 0,
  });

  useEffect(() => {
    if (!userId || databaseQuestions.length === 0) {
      return;
    }

    // Client-side calculation from loaded questions
    const userQuestions = databaseQuestions.filter(
      (q) => q.creatorId === userId
    );

    const usage = getTokenUsageFromQuestions(userQuestions);

    setTokenUsage({
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      totalCost: usage.totalCost || 0,
      questionCount: userQuestions.length,
    });

    logger.log(
      `📊 Token usage calculated: ${userQuestions.length} questions, $${(usage.totalCost || 0).toFixed(4)}`
    );
  }, [userId, databaseQuestions]);

  return tokenUsage;
}

export default useTokenUsage;
