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

    if (
      combinedPrompt.includes("critique") ||
      combinedPrompt.includes("评价")
    ) {
      return mockGeminiResponses.critique.text();
    }

    if (combinedPrompt.includes("batch") || combinedPrompt.includes("批量")) {
      return mockGeminiResponses.batchQuestions.text();
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
  return ["gemini-2.0-flash", "gemini-1.5-pro"];
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
 * Reset mock state
 */
export const resetMock = () => {
  apiCallHistory.length = 0;
  generateContent.mockClear();
  generateCritique.mockClear();
  rewriteQuestion.mockClear();
  listModels.mockClear();
  classifyQuestionDiscipline.mockClear();
  generateTagsForQuestion.mockClear();
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

/**
 * Get call count
 */
export const getCallCount = () => apiCallHistory.length;

/**
 * Get last call
 */
export const getLastCall = () => apiCallHistory[apiCallHistory.length - 1];
