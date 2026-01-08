/**
 * Load Agent
 *
 * Responsibility: Load questions from Firestore and record their base version.
 *
 * Key Behavior:
 * - Fetches question document
 * - Records the current version as "baseVersion"
 * - This baseVersion is later used for optimistic concurrency control
 */

import { doc, getDoc } from "firebase/firestore";
import { logger } from "../utils/logger";

export class LoadAgent {
  /**
   * @param {Firestore} db - Firestore database instance
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Load a question and record its base version
   * @param {string} questionId - Question document ID
   * @returns {Promise<{success: boolean, question?: object, baseVersion?: number, error?: string}>}
   */
  async loadQuestion(questionId) {
    try {
      const questionRef = doc(this.db, "questions", questionId);
      const questionSnap = await getDoc(questionRef);

      if (!questionSnap.exists()) {
        return {
          success: false,
          error: "Question not found",
        };
      }

      const question = {
        id: questionSnap.id,
        ...questionSnap.data(),
      };

      // Get the version field (default to 1 if missing)
      const baseVersion = question.version || 1;

      logger.log(
        `[LoadAgent] Loaded question ${questionId} at version ${baseVersion}`
      );

      return {
        success: true,
        question,
        baseVersion,
      };
    } catch (error) {
      logger.error("[LoadAgent] loadQuestion failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Load multiple questions and record their base versions
   * @param {string[]} questionIds - Array of question document IDs
   * @returns {Promise<{success: boolean, questions?: object[], error?: string}>}
   */
  async loadQuestions(questionIds) {
    try {
      const loadPromises = questionIds.map((id) => this.loadQuestion(id));
      const results = await Promise.all(loadPromises);

      const questions = results
        .filter((r) => r.success)
        .map((r) => ({ ...r.question, baseVersion: r.baseVersion }));

      const failures = results.filter((r) => !r.success);

      if (failures.length > 0) {
        logger.warn(`[LoadAgent] Failed to load ${failures.length} questions`);
      }

      return {
        success: true,
        questions,
        failedCount: failures.length,
      };
    } catch (error) {
      logger.error("[LoadAgent] loadQuestions failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Reload a question to get the latest version
   * (Used after conflict detection)
   * @param {string} questionId - Question document ID
   * @returns {Promise<{success: boolean, question?: object, latestVersion?: number, error?: string}>}
   */
  async reloadQuestion(questionId) {
    const result = await this.loadQuestion(questionId);

    if (result.success) {
      logger.log(
        `[LoadAgent] Reloaded question ${questionId} - latest version: ${result.baseVersion}`
      );
      return {
        ...result,
        latestVersion: result.baseVersion,
      };
    }

    return result;
  }
}
