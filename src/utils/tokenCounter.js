/**
 * Token Counter Utility
 * Estimates token usage for Gemini API calls and calculates costs
 *
 * Note: This uses a simple approximation (1 token ≈ 4 characters)
 * For more accurate counting, consider using tiktoken or similar libraries
 */

// Pricing per 1M tokens (USD, 2026 standard rates — global region)
// 2.5-series shuts down 2026-10-16; 3.x rows are the replacements.
const PRICING = {
  "gemini-2.5-flash": {
    input: 0.3,
    output: 2.5,
  },
  "gemini-2.5-flash-lite": {
    input: 0.1,
    output: 0.4,
  },
  "gemini-2.5-pro": {
    input: 1.25,
    output: 10.0,
  },
  "gemini-3.5-flash": {
    input: 1.5,
    output: 9.0,
  },
  "gemini-3.1-flash-lite": {
    input: 0.25,
    output: 1.5,
  },
  "gemini-3.1-pro-preview": {
    input: 2.0,
    output: 12.0,
  },
};

// Token limits per model (input window / max output tokens per request)
const TOKEN_LIMITS = {
  "gemini-2.5-flash": {
    input: 1000000,
    output: 8192,
  },
  "gemini-2.5-flash-lite": {
    input: 1000000,
    output: 8192,
  },
  "gemini-2.5-pro": {
    input: 1000000,
    output: 8192,
  },
  "gemini-3.5-flash": {
    input: 1048576,
    output: 65536,
  },
  "gemini-3.1-flash-lite": {
    input: 1048576,
    output: 65536,
  },
  "gemini-3.1-pro-preview": {
    input: 1048576,
    output: 65536,
  },
};

/**
 * Estimates token count from text using character-based approximation
 * @param {string} text - Text to count tokens for
 * @returns {number} Estimated token count
 */
export const estimateTokens = (text) => {
  if (!text) return 0;
  // Simple approximation: 1 token ≈ 4 characters
  // This is conservative and works reasonably well for English text
  return Math.ceil(text.length / 4);
};

/**
 * Calculates cost for token usage
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @param {string} model - Model name
 * @returns {number} Cost in USD
 */
export const calculateCost = (
  inputTokens,
  outputTokens,
  model = "gemini-3.5-flash"
) => {
  const pricing = PRICING[model] || PRICING["gemini-3.5-flash"];

  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;

  return inputCost + outputCost;
};

/**
 * Formats cost as USD string
 * @param {number} cost - Cost in USD
 * @returns {string} Formatted cost string
 */
export const formatCost = (cost) => {
  if (cost < 0.01) {
    return `$${(cost * 1000).toFixed(3)}k`; // Show in thousandths of a cent
  }
  return `$${cost.toFixed(4)}`;
};

/**
 * Checks if token usage is within limits
 * @param {number} tokens - Token count to check
 * @param {string} type - 'input' or 'output'
 * @param {string} model - Model name
 * @returns {object} { withinLimit: boolean, limit: number, percentage: number }
 */
export const checkTokenLimit = (
  tokens,
  type = "input",
  model = "gemini-3.5-flash"
) => {
  const limits = TOKEN_LIMITS[model] || TOKEN_LIMITS["gemini-3.5-flash"];
  const limit = limits[type];
  const percentage = (tokens / limit) * 100;

  return {
    withinLimit: tokens <= limit,
    limit,
    percentage: Math.round(percentage),
  };
};

/**
 * Gets warning level based on token usage
 * @param {number} tokens - Token count
 * @param {string} type - 'input' or 'output'
 * @param {string} model - Model name
 * @returns {string} 'none' | 'warning' | 'danger'
 */
export const getTokenWarningLevel = (
  tokens,
  type = "input",
  model = "gemini-3.5-flash"
) => {
  const { percentage } = checkTokenLimit(tokens, type, model);

  if (percentage >= 90) return "danger";
  if (percentage >= 70) return "warning";
  return "none";
};

/**
 * Analyzes a generation request and returns token estimates
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User prompt
 * @param {number} expectedOutputTokens - Expected output size (default: 2000)
 * @param {string} model - Model name
 * @returns {object} Token analysis
 */
export const analyzeRequest = (
  systemPrompt,
  userPrompt,
  expectedOutputTokens = 2000,
  model = "gemini-3.5-flash"
) => {
  const systemTokens = estimateTokens(systemPrompt);
  const userTokens = estimateTokens(userPrompt);
  const totalInputTokens = systemTokens + userTokens;

  const inputCheck = checkTokenLimit(totalInputTokens, "input", model);
  const outputCheck = checkTokenLimit(expectedOutputTokens, "output", model);

  const estimatedCost = calculateCost(
    totalInputTokens,
    expectedOutputTokens,
    model
  );

  return {
    input: {
      system: systemTokens,
      user: userTokens,
      total: totalInputTokens,
      limit: inputCheck.limit,
      percentage: inputCheck.percentage,
      withinLimit: inputCheck.withinLimit,
      warningLevel: getTokenWarningLevel(totalInputTokens, "input", model),
    },
    output: {
      expected: expectedOutputTokens,
      limit: outputCheck.limit,
      percentage: outputCheck.percentage,
      withinLimit: outputCheck.withinLimit,
      warningLevel: getTokenWarningLevel(expectedOutputTokens, "output", model),
    },
    cost: {
      estimated: estimatedCost,
      formatted: formatCost(estimatedCost),
    },
    model,
  };
};
