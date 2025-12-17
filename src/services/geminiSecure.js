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
  console.log("🔍 [geminiSecure] Checking authentication:", {
    isAuthenticated: isUserAuthenticated(),
    hasEffectiveKey: !!effectiveKey,
    effectiveKeyLength: effectiveKey?.length || 0,
  });

  // Try Cloud Functions first (most secure)
  if (isUserAuthenticated()) {
    try {
      console.log("🔒 Using secure Cloud Function for generation");
      const result = await generateContentViaCloudFunction(
        systemPrompt,
        userPrompt,
        setStatus,
        temperature,
        model
      );
      console.log("✅ Cloud Function succeeded");
      return result;
    } catch (error) {
      console.error("❌ Cloud Function failed:", error);
      // Fail hard - do not fall back to insecure client-side key
      throw new Error(`Cloud Function generation failed: ${error.message}`);
    }
  } else {
    console.log("❓ User not authenticated - using direct API");
  }

  // Fallback to direct API only if NOT authenticated
  console.log(
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
  // Try Cloud Functions first (most secure)
  if (isUserAuthenticated()) {
    try {
      console.log(
        "🔒 [CritiqueSecure DEBUG] Using Cloud Function for critique"
      );
      const result = await generateCritiqueViaCloudFunction(question, model);
      console.log(
        "🔒 [CritiqueSecure DEBUG] Cloud Function returned score:",
        result.score
      );
      return result;
    } catch (error) {
      console.error("❌ Cloud Function failed:", error);
      throw new Error(`Cloud Function critique failed: ${error.message}`);
    }
  } else {
    console.log(
      "❓ [CritiqueSecure DEBUG] User not authenticated - using direct API for critique"
    );
  }

  // Fallback to direct API only if NOT authenticated
  console.log("📡 [CritiqueSecure DEBUG] Calling direct API for critique");
  const result = await generateCritiqueDirect(apiKey, question);
  console.log(
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
      "gemini-2.0-flash-exp" // Model
    );

    // Parse result
    const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.warn("Secure Tagging failed:", error);
    return [];
  }
};

// Re-export other functions from gemini.js for backward compatibility
export {
  rewriteQuestion,
  listModels,
  classifyQuestionDiscipline,
} from "./gemini.js";
