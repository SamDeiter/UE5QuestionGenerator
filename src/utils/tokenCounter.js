/**
 * Token Counter Utility
 * Estimates token usage for Gemini API calls and calculates costs
 * 
 * Note: This uses a simple approximation (1 token ≈ 4 characters)
 * For more accurate counting, consider using tiktoken or similar libraries
 */

// Pricing per 1M tokens (as of Nov 2024)
const PRICING = {
    'gemini-2.0-flash': {
        input: 0.075,   // $0.075 per 1M input tokens
        output: 0.30    // $0.30 per 1M output tokens
    },
    'gemini-1.5-pro': {
        input: 1.25,    // $1.25 per 1M input tokens
        output: 5.00    // $5.00 per 1M output tokens
    },
    'gemini-2.0-flash-exp': {
        input: 0.075,   // Using Flash pricing for value estimation
        output: 0.30
    }
};

// Token limits per model
const TOKEN_LIMITS = {
    'gemini-2.0-flash': {
        input: 1000000,
        output: 8192
    },
    'gemini-1.5-pro': {
        input: 2000000,
        output: 8192
    },
    'gemini-2.0-flash-exp': {
        input: 1000000,
        output: 8192
    }
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
export const calculateCost = (inputTokens, outputTokens, model = 'gemini-2.0-flash') => {
    const pricing = PRICING[model] || PRICING['gemini-2.0-flash'];

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
export const checkTokenLimit = (tokens, type = 'input', model = 'gemini-2.0-flash') => {
    const limits = TOKEN_LIMITS[model] || TOKEN_LIMITS['gemini-2.0-flash'];
    const limit = limits[type];
    const percentage = (tokens / limit) * 100;

    return {
        withinLimit: tokens <= limit,
        limit,
        percentage: Math.round(percentage)
    };
};

/**
 * Gets warning level based on token usage
 * @param {number} tokens - Token count
 * @param {string} type - 'input' or 'output'
 * @param {string} model - Model name
 * @returns {string} 'none' | 'warning' | 'danger'
 */
export const getTokenWarningLevel = (tokens, type = 'input', model = 'gemini-2.0-flash') => {
    const { percentage } = checkTokenLimit(tokens, type, model);

    if (percentage >= 90) return 'danger';
    if (percentage >= 70) return 'warning';
    return 'none';
};

/**
 * Analyzes a generation request and returns token estimates
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User prompt
 * @param {number} expectedOutputTokens - Expected output size (default: 2000)
 * @param {string} model - Model name
 * @returns {object} Token analysis
 */
export const analyzeRequest = (systemPrompt, userPrompt, expectedOutputTokens = 2000, model = 'gemini-2.0-flash') => {
    const systemTokens = estimateTokens(systemPrompt);
    const userTokens = estimateTokens(userPrompt);
    const totalInputTokens = systemTokens + userTokens;

    const inputCheck = checkTokenLimit(totalInputTokens, 'input', model);
    const outputCheck = checkTokenLimit(expectedOutputTokens, 'output', model);

    const estimatedCost = calculateCost(totalInputTokens, expectedOutputTokens, model);

    return {
        input: {
            system: systemTokens,
            user: userTokens,
            total: totalInputTokens,
            limit: inputCheck.limit,
            percentage: inputCheck.percentage,
            withinLimit: inputCheck.withinLimit,
            warningLevel: getTokenWarningLevel(totalInputTokens, 'input', model)
        },
        output: {
            expected: expectedOutputTokens,
            limit: outputCheck.limit,
            percentage: outputCheck.percentage,
            withinLimit: outputCheck.withinLimit,
            warningLevel: getTokenWarningLevel(expectedOutputTokens, 'output', model)
        },
        cost: {
            estimated: estimatedCost,
            formatted: formatCost(estimatedCost)
        },
        model
    };
};

/**
 * Creates a summary string for token analysis
 * @param {object} analysis - Result from analyzeRequest
 * @returns {string} Human-readable summary
 */
export const summarizeAnalysis = (analysis) => {
    const { input, output, cost } = analysis;

    let summary = `Token Usage: ${input.total.toLocaleString()} input + ${output.expected.toLocaleString()} output ≈ ${cost.formatted}`;

    if (input.warningLevel === 'danger' || output.warningLevel === 'danger') {
        summary += ' ⚠️ DANGER: Approaching token limit!';
    } else if (input.warningLevel === 'warning' || output.warningLevel === 'warning') {
        summary += ' ⚠️ Warning: High token usage';
    }

    return summary;
};

/**
 * Compares two token analyses (useful for before/after optimization)
 * @param {object} before - Analysis before optimization
 * @param {object} after - Analysis after optimization
 * @returns {object} Comparison results
 */
export const compareAnalyses = (before, after) => {
    const inputReduction = before.input.total - after.input.total;
    const outputReduction = before.output.expected - after.output.expected;
    const costSavings = before.cost.estimated - after.cost.estimated;

    const inputPercentage = (inputReduction / before.input.total) * 100;
    const outputPercentage = (outputReduction / before.output.expected) * 100;
    const costPercentage = (costSavings / before.cost.estimated) * 100;

    return {
        input: {
            reduction: inputReduction,
            percentage: Math.round(inputPercentage)
        },
        output: {
            reduction: outputReduction,
            percentage: Math.round(outputPercentage)
        },
        cost: {
            savings: costSavings,
            percentage: Math.round(costPercentage),
            formatted: formatCost(costSavings)
        }
    };
};
