/**
 * Cloud Functions Service
 * Secure wrapper for calling Firebase Cloud Functions
 * This replaces direct Gemini API calls to keep the API key server-side
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { app, auth } from "./firebase";
import { refreshAuthToken, isAuthPotentiallyStale } from "./firebaseAuth";
import { logger } from "../utils/logger";
import { logError } from "../utils/AppError";

/**
 * Ensures auth token is fresh before making Cloud Function calls
 * This prevents 401 errors from expired tokens
 */
const ensureFreshToken = async () => {
  if (!auth.currentUser) {
    throw new Error("User not authenticated. Please sign in.");
  }

  // Always refresh if token might be stale (older than 30 minutes)
  if (isAuthPotentiallyStale()) {
    logger.log("[CloudFunctions] Token potentially stale, refreshing...");
    const result = await refreshAuthToken();
    if (!result.success) {
      logger.warn("[CloudFunctions] Token refresh failed:", result.reason);
      // Force a hard refresh if soft refresh failed
      try {
        await auth.currentUser.getIdToken(true);
        logger.log("[CloudFunctions] Hard token refresh succeeded");
      } catch (e) {
        logError(e, { operation: "hardTokenRefresh" });
        throw new Error("Session expired. Please sign in again.");
      }
    }
  }
};

// Initialize Cloud Functions
const functions = getFunctions(app, "us-central1");

/**
 * Calls the generateQuestions Cloud Function
 * @param {string} systemPrompt - System instruction for the AI
 * @param {string} userPrompt - User's question/request
 * @param {function} setStatus - Optional status callback
 * @param {number} temperature - Temperature for generation (default 0.2)
 * @param {string} model - Model name (default 'gemini-2.5-flash')
 * @returns {Promise<string>} Generated text response
 */
export const generateContentViaCloudFunction = async (
  systemPrompt,
  userPrompt,
  setStatus = () => {},
  temperature = 0.2,
  model = "gemini-2.5-flash"
) => {
  try {
    // Ensure token is fresh before calling Cloud Function
    await ensureFreshToken();

    setStatus("Calling secure Cloud Function...");

    const generateQuestions = httpsCallable(functions, "generateQuestions");

    const result = await generateQuestions({
      systemPrompt,
      userPrompt,
      temperature,
      model,
    });

    if (!result.data.success) {
      throw new Error(result.data.error || "Cloud Function failed");
    }

    setStatus("Response received!");

    // Store grounding sources globally (for backward compatibility)
    if (
      result.data.groundingSources &&
      result.data.groundingSources.length > 0
    ) {
      logger.log("📚 Grounding sources found:", result.data.groundingSources);
      window.__lastGroundingSources = result.data.groundingSources;
    }

    return result.data.textResponse;
  } catch (error) {
    logError(error, { operation: "generateContentViaCloudFunction", model });
    setStatus(`Error: ${error.message}`);
    throw error;
  }
};

/**
 * Calls the generateCritique Cloud Function
 * @param {object} question - Question object { question, options, correct, modeLabel }
 * @returns {Promise<{score: number, text: string, rewrite: object, changes: string}>}
 */
export const generateCritiqueViaCloudFunction = async (
  question,
  model = "gemini-2.5-flash"
) => {
  try {
    // Defensive validation - catch malformed data before Cloud Function call
    if (!question || typeof question !== "object") {
      throw new Error(
        "Invalid question object: received undefined or non-object"
      );
    }

    if (!question.question) {
      throw new Error(
        `Invalid question: missing 'question' text property. Keys present: ${Object.keys(
          question
        ).join(", ")}`
      );
    }

    if (!question.options || typeof question.options !== "object") {
      throw new Error(
        "Invalid question: missing or invalid 'options' property"
      );
    }

    if (!question.correct) {
      throw new Error("Invalid question: missing 'correct' answer property");
    }

    // Ensure token is fresh before calling Cloud Function
    await ensureFreshToken();

    const generateCritique = httpsCallable(functions, "generateCritique");

    const result = await generateCritique({
      question: question.question,
      options: question.options,
      correct: question.correct,
      type: question.type || "Multiple Choice", // Preserve question type
      modeLabel: question.modeLabel,
      model: model,
    });

    if (!result.data.success) {
      throw new Error(result.data.error || "Critique failed");
    }

    logger.log(
      "[CloudFunction DEBUG] Raw result.data:",
      JSON.stringify(result.data).substring(0, 200)
    );
    logger.log("[CloudFunction DEBUG] Extracted score:", result.data.score);
    logger.log(
      "[CloudFunction DEBUG] Extracted improvedScore:",
      result.data.improvedScore
    );

    return {
      score: result.data.score,
      improvedScore: result.data.improvedScore || null,
      text: result.data.text,
      rewrite: result.data.rewrite,
      changes: result.data.changes,
    };
  } catch (error) {
    logError(error, { operation: "generateCritiqueViaCloudFunction", model });
    throw error;
  }
};

/**
 * Helper to check if user is authenticated (required for Cloud Functions)
 * @returns {boolean}
 */
export const isUserAuthenticated = () => {
  return !!auth.currentUser;
};

/**
 * Calls the migrateTranslations Cloud Function
 * Links existing translated questions with their English originals via uniqueId
 * SUPER ADMIN ONLY
 * @returns {Promise<{success: boolean, stats: object}>}
 */
export const migrateTranslationsViaCloudFunction = async () => {
  try {
    // Ensure token is fresh before calling Cloud Function
    await ensureFreshToken();

    const migrateTranslations = httpsCallable(functions, "migrateTranslations");

    const result = await migrateTranslations();

    if (!result.data.success) {
      throw new Error(result.data.error || "Migration failed");
    }

    return {
      success: true,
      stats: result.data.stats,
    };
  } catch (error) {
    logError(error, { operation: "migrateTranslationsViaCloudFunction" });
    throw error;
  }
};

/**
 * Calls the sendReviewerInvites Cloud Function
 * Sends personalized invite emails to reviewers via SendGrid
 * ADMIN ONLY
 * @param {Array} invites - Array of invite objects { email, inviteUrl, code, note }
 * @returns {Promise<{success: boolean, sent: string[], failed: object[], total: number}>}
 */
export const sendReviewerInvitesViaEmail = async (invites) => {
  try {
    // Ensure token is fresh before calling Cloud Function
    await ensureFreshToken();

    const sendReviewerInvites = httpsCallable(functions, "sendReviewerInvites");

    const result = await sendReviewerInvites({ invites });

    if (!result.data.success) {
      throw new Error(result.data.error || "Email send failed");
    }

    return {
      success: true,
      sent: result.data.sent,
      failed: result.data.failed,
      total: result.data.total,
    };
  } catch (error) {
    logError(error, {
      operation: "sendReviewerInvitesViaEmail",
      inviteCount: invites?.length,
    });
    throw error;
  }
};
