/**
 * Context Optimizer
 * Intelligently processes and truncates file context to reduce token usage
 * while maintaining relevance for question generation
 */

import { estimateTokens } from './tokenCounter';

// Maximum tokens allowed for file context
const MAX_CONTEXT_TOKENS = 2000;
const MAX_EXCERPT_LENGTH = 500; // characters per excerpt

/**
 * Extracts relevant keywords based on discipline
 * @param {string} discipline - The selected discipline
 * @returns {string[]} Array of relevant keywords
 */
const getDisciplineKeywords = (discipline) => {
    const keywordMap = {
        'Animation': ['animation', 'skeletal', 'mesh', 'bone', 'rig', 'blend', 'montage', 'sequence'],
        'Audio': ['audio', 'sound', 'attenuation', 'reverb', 'spatialization', 'metasound', 'cue'],
        'Blueprints': ['blueprint', 'node', 'event', 'function', 'variable', 'cast', 'interface'],
        'Gameplay': ['gameplay', 'actor', 'component', 'pawn', 'controller', 'input', 'collision'],
        'Lighting': ['light', 'lumen', 'shadow', 'reflection', 'gi', 'global illumination', 'exposure'],
        'Materials': ['material', 'shader', 'texture', 'parameter', 'blend', 'opacity', 'roughness'],
        'Niagara': ['niagara', 'particle', 'emitter', 'module', 'system', 'vfx', 'effect'],
        'Performance': ['performance', 'optimization', 'profiler', 'fps', 'memory', 'cpu', 'gpu'],
        'Rendering': ['render', 'nanite', 'lumen', 'vsm', 'virtual shadow', 'post process', 'anti-aliasing'],
        'Scripting': ['c++', 'code', 'class', 'function', 'header', 'module', 'api'],
        'UI': ['umg', 'widget', 'ui', 'hud', 'canvas', 'slate', 'menu'],
        'World Building': ['landscape', 'foliage', 'terrain', 'world partition', 'level', 'streaming']
    };

    return keywordMap[discipline] || [];
};

/**
 * Scores a text chunk based on keyword relevance
 * @param {string} text - Text chunk to score
 * @param {string[]} keywords - Relevant keywords
 * @returns {number} Relevance score
 */
const scoreRelevance = (text, keywords) => {
    const lowerText = text.toLowerCase();
    let score = 0;

    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
            score += matches.length;
        }
    });

    return score;
};

/**
 * Splits text into chunks for processing
 * @param {string} text - Text to split
 * @param {number} chunkSize - Size of each chunk in characters
 * @returns {string[]} Array of text chunks
 */
const splitIntoChunks = (text, chunkSize = 1000) => {
    const chunks = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
        if (currentChunk.length + line.length > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = line;
        } else {
            currentChunk += (currentChunk ? '\n' : '') + line;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
};

/**
 * Extracts the most relevant excerpts from text
 * @param {string} text - Full text content
 * @param {string} discipline - Selected discipline
 * @param {number} maxExcerpts - Maximum number of excerpts to extract
 * @returns {string[]} Array of relevant excerpts
 */
export const extractRelevantExcerpts = (text, discipline, maxExcerpts = 4) => {
    if (!text) return [];

    const keywords = getDisciplineKeywords(discipline);
    const chunks = splitIntoChunks(text, 1000);

    // Score each chunk
    const scoredChunks = chunks.map(chunk => ({
        text: chunk,
        score: scoreRelevance(chunk, keywords)
    }));

    // Sort by relevance and take top excerpts
    const topChunks = scoredChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, maxExcerpts)
        .filter(chunk => chunk.score > 0); // Only include chunks with keywords

    // Truncate excerpts to max length
    return topChunks.map(chunk => {
        if (chunk.text.length <= MAX_EXCERPT_LENGTH) {
            return chunk.text;
        }
        return chunk.text.substring(0, MAX_EXCERPT_LENGTH) + '...';
    });
};

/**
 * Optimizes file context to stay within token limits
 * @param {string} fileContent - Raw file content
 * @param {string} discipline - Selected discipline
 * @returns {string} Optimized context string
 */
export const optimizeContext = (fileContent, discipline) => {
    if (!fileContent) return '';

    // First, check if we're already under the limit
    const initialTokens = estimateTokens(fileContent);
    if (initialTokens <= MAX_CONTEXT_TOKENS) {
        return fileContent;
    }

    // Extract relevant excerpts
    const excerpts = extractRelevantExcerpts(fileContent, discipline);

    if (excerpts.length === 0) {
        // No relevant excerpts found, truncate intelligently
        const targetChars = MAX_CONTEXT_TOKENS * 4; // Approximate characters
        return fileContent.substring(0, targetChars) + '\n\n[Content truncated for token limit]';
    }

    // Combine excerpts
    let optimizedContext = excerpts.join('\n\n---\n\n');

    // Check if still too long
    const optimizedTokens = estimateTokens(optimizedContext);
    if (optimizedTokens > MAX_CONTEXT_TOKENS) {
        // Further truncate
        const targetChars = MAX_CONTEXT_TOKENS * 4;
        optimizedContext = optimizedContext.substring(0, targetChars) + '\n\n[Content truncated for token limit]';
    }

    return optimizedContext;
};

/**
 * Processes multiple files and combines their contexts
 * @param {Array<{name: string, content: string}>} files - Array of file objects
 * @param {string} discipline - Selected discipline
 * @returns {string} Combined optimized context
 */
export const processMultipleFiles = (files, discipline) => {
    if (!files || files.length === 0) return '';

    const tokensPerFile = Math.floor(MAX_CONTEXT_TOKENS / files.length);

    const processedFiles = files.map(file => {
        const optimized = optimizeContext(file.content, discipline);
        const tokens = estimateTokens(optimized);

        // If this file is using too many tokens, truncate further
        if (tokens > tokensPerFile) {
            const targetChars = tokensPerFile * 4;
            return `## ${file.name}\n${optimized.substring(0, targetChars)}...`;
        }

        return `## ${file.name}\n${optimized}`;
    });

    return processedFiles.join('\n\n');
};

/**
 * Analyzes context optimization results
 * @param {string} original - Original context
 * @param {string} optimized - Optimized context
 * @returns {object} Analysis results
 */
export const analyzeOptimization = (original, optimized) => {
    const originalTokens = estimateTokens(original);
    const optimizedTokens = estimateTokens(optimized);
    const reduction = originalTokens - optimizedTokens;
    const percentage = originalTokens > 0 ? Math.round((reduction / originalTokens) * 100) : 0;

    return {
        original: {
            tokens: originalTokens,
            chars: original.length
        },
        optimized: {
            tokens: optimizedTokens,
            chars: optimized.length
        },
        reduction: {
            tokens: reduction,
            chars: original.length - optimized.length,
            percentage
        },
        withinLimit: optimizedTokens <= MAX_CONTEXT_TOKENS
    };
};
