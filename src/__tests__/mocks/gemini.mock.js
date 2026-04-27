/**
 * Mock implementation for Gemini API
 * Used in integration tests to simulate AI responses
 */

import { vi } from "vitest";
import { mockGeminiResponses } from "../testHelpers";

// Track API calls for assertions
export const apiCallHistory = [];

/**
 * Mock generateContent function
 */
export const generateContent = vi.fn(
  async (apiKey, systemPrompt, userPrompt) => {
    // Record the call
    apiCallHistory.push({
      apiKey,
      systemPrompt,
      userPrompt,
      timestamp: Date.now(),
    });

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Determine response based on prompt content
    // Check both systemPrompt and userPrompt for keywords
    const combinedPrompt = `${systemPrompt} ${userPrompt || ""}`;

    if (
      combinedPrompt.includes("translate") ||
      combinedPrompt.includes("Translator") ||
      combinedPrompt.includes("翻译")
    ) {
      return mockGeminiResponses.translation.text();
    }

    if (combinedPrompt.includes("explain") || combinedPrompt.includes("解释")) {
      return mockGeminiResponses.explanation.text();
    }

    // Check for variation requests BEFORE critique (since variation prompts often contain "critique")
    if (
      combinedPrompt.includes("variation") ||
      combinedPrompt.includes("variate") ||
      combinedPrompt.includes("IMPROVED") ||
      combinedPrompt.includes("alternative")
    ) {
      // Return 2 variations in table format
      return `| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Graphics | Multiple Choice | Medium | How does Unreal Engine 5's rendering pipeline handle dynamic lighting? | | Forward Rendering | Deferred Rendering | Ray Tracing | Hybrid Rendering | B | https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine | UE5's deferred rendering pipeline processes lighting in screen space for optimal performance. |
| 2 | Graphics | Multiple Choice | Medium | Which rendering technique is used by default in UE5 for handling multiple light sources? | | Forward Shading | Deferred Shading | Clustered Forward | Tile-based Deferred | B | https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine | Deferred shading allows UE5 to efficiently process numerous dynamic lights. |`;
    }

    if (
      combinedPrompt.includes("critique") ||
      combinedPrompt.includes("评价")
    ) {
      return mockGeminiResponses.critique.text();
    }

    if (combinedPrompt.includes("batch") || combinedPrompt.includes("批量")) {
      return `| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | General | Multiple Choice | Easy | What does UE5 stand for? | | Unreal Engine 5 | Unity Engine 5 | Unreal Editor 5 | Universal Engine 5 | A | https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-basics-of-unreal-engine | Unreal Engine 5 is the latest version of the game engine developed by Epic Games. |
| 2 | Graphics | True/False | Medium | Lumen provides real-time global illumination. | | True | False | | | A | https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-global-illumination-and-reflections-in-unreal-engine | Lumen is Unreal Engine 5's fully dynamic global illumination and reflections system. |`;
    }

    // Default to single question
    return mockGeminiResponses.singleQuestion.text();
  }
);

/**
 * Mock generateCritique function
 */
export const generateCritique = vi.fn(async (apiKey, question) => {
  apiCallHistory.push({
    type: "critique",
    apiKey,
    question,
    timestamp: Date.now(),
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  return {
    score: 85,
    text: mockGeminiResponses.critique.text(),
    rewrite: null,
    changes: null,
  };
});

/**
 * Mock rewriteQuestion function
 */
export const rewriteQuestion = vi.fn(async (apiKey, question, critique) => {
  apiCallHistory.push({
    type: "rewrite",
    apiKey,
    question,
    critique,
    timestamp: Date.now(),
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockGeminiResponses.singleQuestion.text();
});

/**
 * Mock listModels function
 */
export const listModels = vi.fn(async (_apiKey) => {
  return ["gemini-2.5-flash", "gemini-2.5-pro"];
});

/**
 * Mock classifyQuestionDiscipline
 */
export const classifyQuestionDiscipline = vi.fn(async (_apiKey, _text) => {
  return "Programming";
});

/**
 * Mock generateTagsForQuestion
 */
export const generateTagsForQuestion = vi.fn(async (_apiKey, _text) => {
  return ["Blueprints", "C++", "Editor"];
});

/**
 * Mock checkApiKey
 */
export const checkApiKey = vi.fn(async (key) => {
  if (!key) return { isAuthenticated: false, hasEffectiveKey: false };
  return {
    isAuthenticated: true,
    hasEffectiveKey: true,
    effectiveKeyLength: key.length,
  };
});

/**
 * Reset mock state
 */
export const resetMock = () => {
  apiCallHistory.length = 0;
  generateContent.mockReset();
  generateCritique.mockReset();
  rewriteQuestion.mockReset();
  listModels.mockReset();
  classifyQuestionDiscipline.mockReset();
  generateTagsForQuestion.mockReset();

  // Restore default implementations
  generateContent.mockImplementation(
    async (apiKey, systemPrompt, userPrompt) => {
      // Record the call
      apiCallHistory.push({
        apiKey,
        systemPrompt,
        userPrompt,
        timestamp: Date.now(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const combinedPrompt = `${systemPrompt} ${userPrompt || ""}`;

      if (
        combinedPrompt.includes("translate") ||
        combinedPrompt.includes("Translator") ||
        combinedPrompt.includes("翻译")
      ) {
        return mockGeminiResponses.translation.text();
      }

      if (
        combinedPrompt.includes("explain") ||
        combinedPrompt.includes("解释")
      ) {
        return mockGeminiResponses.explanation.text();
      }

      // Check for variation requests BEFORE critique (since variation prompts often contain "critique")
      if (
        combinedPrompt.includes("variation") ||
        combinedPrompt.includes("variate") ||
        combinedPrompt.includes("IMPROVED") ||
        combinedPrompt.includes("alternative")
      ) {
        // Return 2 variations in table format
        return `| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Graphics | Multiple Choice | Medium | How does Unreal Engine 5's rendering pipeline handle dynamic lighting? | | Forward Rendering | Deferred Rendering | Ray Tracing | Hybrid Rendering | B | https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine | UE5's deferred rendering pipeline processes lighting in screen space for optimal performance. |
| 2 | Graphics | Multiple Choice | Medium | Which rendering technique is used by default in UE5 for handling multiple light sources? | | Forward Shading | Deferred Shading | Clustered Forward | Tile-based Deferred | B | https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine | Deferred shading allows UE5 to efficiently process numerous dynamic lights. |`;
      }

      if (
        combinedPrompt.includes("critique") ||
        combinedPrompt.includes("评价")
      ) {
        return mockGeminiResponses.critique.text();
      }

      if (combinedPrompt.includes("batch") || combinedPrompt.includes("批量")) {
        return `| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | General | Multiple Choice | Easy | What does UE5 stand for? | | Unreal Engine 5 | Unity Engine 5 | Unreal Editor 5 | Universal Engine 5 | A | https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-basics-of-unreal-engine | Unreal Engine 5 is the latest version of the game engine developed by Epic Games. |
| 2 | Graphics | True/False | Medium | Lumen provides real-time global illumination. | | True | False | | | A | https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-global-illumination-and-reflections-in-unreal-engine | Lumen is Unreal Engine 5's fully dynamic global illumination and reflections system. |`;
      }

      return mockGeminiResponses.singleQuestion.text();
    }
  );

  generateCritique.mockImplementation(async (apiKey, question) => {
    apiCallHistory.push({
      type: "critique",
      apiKey,
      question,
      timestamp: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      score: 85,
      text: mockGeminiResponses.critique.text(),
      rewrite: null,
      changes: null,
    };
  });
};

/**
 * Simulate API error
 */
export const simulateError = (errorMessage = "API Error") => {
  generateContent.mockRejectedValueOnce(new Error(errorMessage));
  generateCritique.mockRejectedValueOnce(new Error(errorMessage));
};

/**
 * Simulate rate limiting
 */
export const simulateRateLimit = () => {
  generateContent.mockRejectedValueOnce(new Error("429: Rate limit exceeded"));
};

// Secure function aliases
export const generateContentSecure = generateContent;
export const generateCritiqueSecure = generateCritique;
export const generateTagsSecure = generateTagsForQuestion;

/**
 * Get call count
 */
export const getCallCount = () => apiCallHistory.length;

/**
 * Get last call
 */
export const getLastCall = () => apiCallHistory[apiCallHistory.length - 1];
