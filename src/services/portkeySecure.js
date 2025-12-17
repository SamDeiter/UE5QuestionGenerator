/**
 * Portkey Secure Service Wrapper
 *
 * This module provides a wrapper for Portkey.ai integration.
 * It can be used as an alternative to direct Gemini API or Cloud Functions.
 *
 * Service Selection Priority:
 * 1. Firebase Cloud Functions (when authenticated)
 * 2. Portkey Gateway (when VITE_AI_SERVICE=portkey)
 * 3. Direct Gemini API (fallback)
 */

import {
  generateContent as generateContentPortkey,
  generateCritique as generateCritiquePortkey,
  rewriteQuestion as rewriteQuestionPortkey,
  classifyQuestionDiscipline as classifyQuestionDisciplinePortkey,
  generateTagsForQuestion as generateTagsForQuestionPortkey,
} from "./portkey.js";

/**
 * Check if Portkey is configured and should be used
 * @returns {boolean}
 */
const shouldUsePortkey = () => {
  const aiService = import.meta.env.VITE_AI_SERVICE;
  const hasPortkeyKey = !!import.meta.env.VITE_PORTKEY_API_KEY;

  return aiService === "portkey" && hasPortkeyKey;
};

/**
 * Secure generate content wrapper with Portkey support
 */
export const generateContentSecure = async (
  effectiveKey,
  systemPrompt,
  userPrompt,
  setStatus,
  temperature = 0.2,
  model = "gemini-1.5-flash"
) => {
  if (shouldUsePortkey()) {
    console.log("🌐 Using Portkey Gateway for generation");
    return await generateContentPortkey(
      effectiveKey,
      systemPrompt,
      userPrompt,
      setStatus,
      temperature,
      model
    );
  }

  // This should not be reached - import from geminiSecure instead
  throw new Error(
    "portkeySecure should only be used when Portkey is configured"
  );
};

/**
 * Secure critique wrapper with Portkey support
 */
export const generateCritiqueSecure = async (
  apiKey,
  question,
  model = "gemini-1.5-flash"
) => {
  if (shouldUsePortkey()) {
    console.log("🌐 Using Portkey Gateway for critique");
    return await generateCritiquePortkey(apiKey, question, model);
  }

  throw new Error(
    "portkeySecure should only be used when Portkey is configured"
  );
};

/**
 * Secure tags generator with Portkey support
 */
export const generateTagsSecure = async (apiKey, questionText) => {
  if (shouldUsePortkey()) {
    console.log("🌐 Using Portkey Gateway for tags");
    return await generateTagsForQuestionPortkey(apiKey, questionText);
  }

  throw new Error(
    "portkeySecure should only be used when Portkey is configured"
  );
};

// Re-export Portkey functions
export {
  rewriteQuestionPortkey as rewriteQuestion,
  classifyQuestionDisciplinePortkey as classifyQuestionDiscipline,
};
