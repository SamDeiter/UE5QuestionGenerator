/**
 * Portkey Secure Service Wrapper
 *
 * This module provides a wrapper for Portkey.ai integration.
 * Portkey calls are now proxied through a Firebase Cloud Function,
 * so the API key never touches the client.
 *
 * Service Selection Priority:
 * 1. Firebase Cloud Functions (when authenticated)
 * 2. Portkey Gateway via Cloud Function (when VITE_AI_SERVICE=portkey)
 * 3. Direct Gemini API (fallback)
 */

import {
  generateContent as generateContentPortkey,
  generateCritique as generateCritiquePortkey,
  rewriteQuestion as rewriteQuestionPortkey,
  classifyQuestionDiscipline as classifyQuestionDisciplinePortkey,
  generateTagsForQuestion as generateTagsForQuestionPortkey,
} from "./portkey.js";
import { logger } from "../utils/logger";

/**
 * Check if Portkey mode is configured.
 * Note: The API key is now server-side, so we only check the service flag.
 * @returns {boolean}
 */
const shouldUsePortkey = () => {
  const aiService = import.meta.env.VITE_AI_SERVICE;
  return aiService === "portkey";
};

/**
 * Secure generate content wrapper with Portkey support.
 * Falls back gracefully if Portkey is not configured.
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
    logger.log("🌐 Using Portkey Gateway (Cloud Function proxy)");
    return await generateContentPortkey(
      effectiveKey,
      systemPrompt,
      userPrompt,
      setStatus,
      temperature,
      model
    );
  }

  // Graceful fallback: not configured for Portkey
  logger.warn(
    "Portkey not configured (VITE_AI_SERVICE !== 'portkey'), falling back to standard Gemini."
  );
  throw new Error(
    "portkeySecure should only be used when Portkey is configured"
  );
};

/**
 * Secure critique wrapper with Portkey support.
 */
export const generateCritiqueSecure = async (
  apiKey,
  question,
  model = "gemini-1.5-flash"
) => {
  if (shouldUsePortkey()) {
    logger.log("🌐 Using Portkey Gateway (Cloud Function proxy) for critique");
    return await generateCritiquePortkey(apiKey, question, model);
  }

  logger.warn("Portkey not configured, falling back to standard Gemini.");
  throw new Error(
    "portkeySecure should only be used when Portkey is configured"
  );
};

/**
 * Secure tags generator with Portkey support.
 */
export const generateTagsSecure = async (apiKey, questionText) => {
  if (shouldUsePortkey()) {
    logger.log("🌐 Using Portkey Gateway (Cloud Function proxy) for tags");
    return await generateTagsForQuestionPortkey(apiKey, questionText);
  }

  logger.warn("Portkey not configured, falling back to standard Gemini.");
  throw new Error(
    "portkeySecure should only be used when Portkey is configured"
  );
};

// Re-export Portkey functions
export {
  rewriteQuestionPortkey as rewriteQuestion,
  classifyQuestionDisciplinePortkey as classifyQuestionDiscipline,
};
