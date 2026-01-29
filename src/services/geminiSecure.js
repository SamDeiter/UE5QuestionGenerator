/**
 * Secure Gemini Service Wrapper
 *
 * This module provides a secure interface for calling Gemini AI.
 * It automatically uses Cloud Functions when the user is authenticated,
 * otherwise falls back to direct API calls.
 */

import {
  isUserAuthenticated,
  generateContentViaCloudFunction,
  generateCritiqueViaCloudFunction,
} from "./cloudFunctions.js";
import {
  generateContent as generateContentDirect,
  generateCritique as generateCritiqueDirect,
} from "./gemini.js";
import { logger } from "../utils/logger";

/**
 * Secure generate content wrapper
 * Automatically chooses the most secure method available
 */
export const generateContentSecure = async (
  effectiveKey,
  systemPrompt,
  userPrompt,
  setStatus,
  temperature = 0.2,
  model = "gemini-2.0-flash"
) => {
  // DEBUG: Log authentication status
  logger.log("🔍 [geminiSecure] Checking authentication:", {
    isAuthenticated: isUserAuthenticated(),
    hasEffectiveKey: !!effectiveKey,
    effectiveKeyLength: effectiveKey?.length || 0,
  });

  // Try Cloud Functions first (most secure)
  if (isUserAuthenticated()) {
    try {
      logger.log("🔒 Using secure Cloud Function for generation");
      const result = await generateContentViaCloudFunction(
        systemPrompt,
        userPrompt,
        setStatus,
        temperature,
        model
      );
      logger.log("✅ Cloud Function succeeded");
      return result;
    } catch (error) {
      logger.error("❌ Cloud Function failed:", error);
      // Fail hard - do not fall back to insecure client-side key
      throw new Error(`Cloud Function generation failed: ${error.message}`);
    }
  } else {
    logger.log("❓ User not authenticated - using direct API");
  }

  // Fallback to direct API only if NOT authenticated
  logger.log(
    "📡 Calling direct API with key:",
    effectiveKey ? `${effectiveKey.substring(0, 10)}...` : "NONE"
  );
  return await generateContentDirect(
    effectiveKey,
    systemPrompt,
    userPrompt,
    setStatus,
    temperature,
    model
  );
};

/**
 * Secure critique wrapper
 * Automatically chooses the most secure method available
 */
export const generateCritiqueSecure = async (
  apiKey,
  question,
  model = "gemini-1.5-flash"
) => {
  // Validate question object before proceeding
  if (!question) {
    throw new Error("Critique failed: Question object is undefined or null");
  }

  if (!question.question) {
    logger.error("[CritiqueSecure] Missing 'question' property. Received:", {
      id: question.id,
      keys: Object.keys(question),
    });
    throw new Error(
      "Critique failed: Question text is missing. Check the 'question' property on the object."
    );
  }

  if (!question.options || typeof question.options !== "object") {
    logger.error(
      "[CritiqueSecure] Missing or invalid 'options' property. Received:",
      {
        id: question.id,
        options: question.options,
      }
    );
    throw new Error(
      "Critique failed: Question options are missing or invalid."
    );
  }

  if (!question.correct) {
    logger.error("[CritiqueSecure] Missing 'correct' property. Received:", {
      id: question.id,
      correct: question.correct,
    });
    throw new Error("Critique failed: Correct answer is missing.");
  }

  // Try Cloud Functions first (most secure)
  if (isUserAuthenticated()) {
    try {
      logger.log("🔒 [CritiqueSecure DEBUG] Using Cloud Function for critique");
      const result = await generateCritiqueViaCloudFunction(question, model);
      logger.log(
        "🔒 [CritiqueSecure DEBUG] Cloud Function returned score:",
        result.score,
        "improvedScore:",
        result.improvedScore
      );
      return result;
    } catch (error) {
      logger.error("❌ Cloud Function failed:", error);
      throw new Error(`Cloud Function critique failed: ${error.message}`);
    }
  } else {
    logger.log(
      "❓ [CritiqueSecure DEBUG] User not authenticated - using direct API for critique"
    );
  }

  // Fallback to direct API only if NOT authenticated
  logger.log("📡 [CritiqueSecure DEBUG] Calling direct API for critique");
  const result = await generateCritiqueDirect(apiKey, question);
  logger.log(
    "📡 [CritiqueSecure DEBUG] Direct API returned score:",
    result.score
  );
  return result;
};

/**
 * Secure Tags Generator
 * Uses the same pipeline as generateContentSecure
 */
// Secure Tags Generator
export const generateTagsSecure = async (apiKey, questionText) => {
  const systemPrompt = `You are an expert UE5 tagger.
    Generate 3-5 relevant technical tags for the provided question.
    - Tags should be specific (e.g., "Blueprints", "Lumen", "Niagara").
    - Return ONLY a valid JSON array of strings.
    - Example: ["Blueprints", "Actors", "Level Design"]`;

  const userPrompt = `Tags for: "${questionText}"`;

  try {
    // Reuse the secure generation pipeline (Cloud Function <-> Direct Fallback)
    const text = await generateContentSecure(
      apiKey,
      systemPrompt,
      userPrompt,
      () => {}, // No status updates needed for fast tagging
      0.3, // Temp
      "gemini-2.0-flash" // Model
    );

    // Parse result - try multiple extraction methods
    const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();

    // Try direct parse first
    try {
      return JSON.parse(cleanText);
    } catch {
      // Try to find JSON array within the text - use explicit character class to prevent backtracking
      const arrayMatch = cleanText.match(/\[[^[\]]*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }
      // If LLM returned conversational text, return empty array
      logger.warn("Tagging: Could not extract JSON array, returning empty");
      return [];
    }
  } catch (error) {
    logger.warn("Secure Tagging failed:", error);
    return [];
  }
};

// Re-export other functions from gemini.js for backward compatibility
export {
  rewriteQuestion,
  listModels,
  classifyQuestionDiscipline,
} from "./gemini.js";
