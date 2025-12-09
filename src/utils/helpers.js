export const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

/**
 * Calculate text similarity using Levenshtein distance (0-1 score)
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {number} Similarity score between 0 (different) and 1 (identical)
 */
export const textSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;

    // Normalize: lowercase, remove extra whitespace, remove HTML tags
    const normalize = (s) => s.toLowerCase().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const a = normalize(str1);
    const b = normalize(str2);

    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // For very long strings, use a simpler word-based comparison for performance
    if (a.length > 500 || b.length > 500) {
        const wordsA = new Set(a.split(' '));
        const wordsB = new Set(b.split(' '));
        const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
        const union = new Set([...wordsA, ...wordsB]).size;
        return union > 0 ? intersection / union : 0;
    }

    // Levenshtein distance calculation
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,      // deletion
                matrix[j - 1][i] + 1,      // insertion
                matrix[j - 1][i - 1] + cost // substitution
            );
        }
    }

    const maxLen = Math.max(a.length, b.length);
    return 1 - (matrix[b.length][a.length] / maxLen);
};

/**
 * Compute word-level diff between two strings for inline highlighting
 * Uses Longest Common Subsequence (LCS) algorithm for accurate diff
 * @param {string} oldText - Original text
 * @param {string} newText - New/modified text
 * @returns {Array<{type: 'unchanged'|'removed'|'added', text: string}>} Array of diff segments
 */
export const computeWordDiff = (oldText, newText) => {
    if (!oldText && !newText) return [];
    if (!oldText) return [{ type: 'added', text: newText }];
    if (!newText) return [{ type: 'removed', text: oldText }];
    if (oldText === newText) return [{ type: 'unchanged', text: oldText }];

    // Tokenize into words (preserving punctuation attached to words)
    const tokenize = (text) => text.split(/(\s+)/).filter(t => t.length > 0);

    const oldTokens = tokenize(oldText);
    const newTokens = tokenize(newText);

    // Build LCS table
    const m = oldTokens.length;
    const n = newTokens.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (oldTokens[i - 1] === newTokens[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find the diff
    let i = m, j = n;

    const tempDiff = [];
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
            tempDiff.unshift({ type: 'unchanged', text: oldTokens[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            tempDiff.unshift({ type: 'added', text: newTokens[j - 1] });
            j--;
        } else {
            tempDiff.unshift({ type: 'removed', text: oldTokens[i - 1] });
            i--;
        }
    }

    // Merge consecutive segments of the same type for cleaner output
    const merged = [];
    for (const segment of tempDiff) {
        if (merged.length > 0 && merged[merged.length - 1].type === segment.type) {
            merged[merged.length - 1].text += segment.text;
        } else {
            merged.push({ ...segment });
        }
    }

    return merged;
};

/**
 * Remove near-duplicate questions from an array (intra-batch deduplication)
 * @param {Array} questions - Array of question objects
 * @param {number} threshold - Similarity threshold (0-1), default 0.85
 * @returns {Array} Deduplicated array (keeps first occurrence)
 */
export const removeDuplicateQuestions = (questions, threshold = 0.85) => {
    if (!questions || questions.length <= 1) return questions;

    const unique = [];
    const duplicatesRemoved = [];

    for (const q of questions) {
        const isDuplicate = unique.some(existing => {
            const similarity = textSimilarity(existing.question, q.question);
            return similarity >= threshold;
        });

        if (!isDuplicate) {
            unique.push(q);
        } else {
            duplicatesRemoved.push(q.question?.substring(0, 50) + '...');
        }
    }

    if (duplicatesRemoved.length > 0) {
        console.log(`[Dedup] Removed ${duplicatesRemoved.length} duplicate(s):`, duplicatesRemoved);
    }

    return unique;
};

export const formatUrl = (url) => {
    if (!url) return '';
    let cleanUrl = url.trim();

    // Extract actual URL from Google vertexaisearch/grounding redirect URLs
    if (cleanUrl.includes('google.com') || cleanUrl.includes('grounding') || cleanUrl.includes('vertex')) {
        try {
            const urlObj = new URL(cleanUrl);
            // Check for common redirect parameters
            const actualUrl = urlObj.searchParams.get('url') ||
                urlObj.searchParams.get('q') ||
                urlObj.searchParams.get('dest') ||
                urlObj.searchParams.get('redirect') ||
                urlObj.searchParams.get('re') ||
                urlObj.searchParams.get('adurl'); // Added adurl

            if (actualUrl) {
                cleanUrl = decodeURIComponent(actualUrl);
            }
        } catch (e) {
            // If URL parsing fails, keep original
        }
    }

    // Clean up double encoding or nested http
    if (cleanUrl.includes('http') && cleanUrl.indexOf('http') > 0) {
        const lastHttp = cleanUrl.lastIndexOf('http');
        cleanUrl = cleanUrl.substring(lastHttp);
    }

    // REJECT: If URL contains spaces (it's likely a sentence/title)
    if (cleanUrl.includes(' ')) {
        return '';
    }

    if (!/^[a-zA-Z]+:\/\//.test(cleanUrl) && (cleanUrl.includes('.') && !cleanUrl.includes(' '))) {
        if (!cleanUrl.toLowerCase().endsWith('.csv') && !cleanUrl.toLowerCase().endsWith('.txt')) {
            cleanUrl = 'https://' + cleanUrl;
        }
    }
    return cleanUrl;
};

// Extract a clean display URL (removes protocol and trailing slashes)
export const getDisplayUrl = (url) => {
    if (!url) return '';
    const formatted = formatUrl(url);

    // If it's still a grounding link after formatting, try to show something useful or just the domain
    if (formatted.includes('vertexaisearch') || formatted.includes('grounding')) {
        // Fallback: try to find a domain inside the string
        const match = formatted.match(/([a-zA-Z0-9-]+\.com\/[a-zA-Z0-9-\/]+)/);
        if (match) return match[1];
        return 'Source Link'; // Better than "Google Vertex AI Source"
    }

    try {
        const urlObj = new URL(formatted);
        // Return just the hostname + pathname (truncated if too long)
        let display = urlObj.hostname + urlObj.pathname;
        if (display.endsWith('/')) display = display.slice(0, -1);

        // If it's very long, truncate the middle
        if (display.length > 60) {
            display = display.substring(0, 30) + '...' + display.substring(display.length - 20);
        }

        return display;
    } catch (e) {
        return formatted.substring(0, 50) + (formatted.length > 50 ? '...' : '');
    }
};

export const renderMarkdown = (t) => {
    if (!t) return "";

    // Step 1: Convert markdown-style formatting to HTML
    let html = String(t)
        // Headers
        .replace(/^### (.*$)/gim, '<h3 class="text-orange-400 font-bold text-xs mt-3 mb-1 uppercase tracking-wide">$1</h3>')
        .replace(/^#### (.*$)/gim, '<h4 class="text-slate-200 font-bold text-[10px] mt-2 mb-1 uppercase">$1</h4>')
        // Bold (**text**)
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-orange-300 font-bold">$1</strong>')
        // Inline code (`code`)
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 font-mono text-[0.9em] border border-blue-900/50">$1</code>')
        // Lists
        .replace(/^\s*\* (.*$)/gim, '<div class="ml-3 flex items-start gap-2"><span class="text-orange-500 mt-1 text-[10px] flex-shrink-0">•</span><span>$1</span></div>')
        // Italics (*text*)
        .replace(/\*([^\n*]+)\*/g, '<em class="text-slate-300 italic">$1</em>')
        // Double newlines
        .replace(/\n\s*\n/g, '<div class="h-2"></div>')
        // Single newlines
        .replace(/\n/g, '<br />');

    // Step 2: Sanitize with DOMPurify to prevent XSS
    const DOMPurify = require('dompurify');
    const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'b', 'i', 'em', 'strong', 'code', 'br', 'div', 'span',
            'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'p'
        ],
        ALLOWED_ATTR: ['class'],
        ALLOW_DATA_ATTR: false
    });

    return sanitized;
};

export const sanitizeText = (text) => renderMarkdown(text);

export const stripHtmlTags = (text) => {
    if (typeof text !== 'string') return text;
    const tmp = document.createElement("DIV");
    tmp.textContent = text;  // Security: Changed from innerHTML to prevent XSS
    return tmp.textContent || tmp.innerText || "";
};

export const safe = (t) => {
    if (t === null || t === undefined) return '""';
    const str = String(t);
    let content = stripHtmlTags(str);
    content = (content || '').trim();
    content = content.replace(/[\u200B\uFEFF\u00A0]/g, ' ').replace(/\s\s+/g, ' ').trim();
    content = content.replace(/(\r\n|\n|\r|\t)/gm, ' ');
    content = content.replace(/['"]/g, '');
    const escaped = content.replace(/"/g, '""');
    return `"${escaped}"`;
};

export const formatDate = (date = new Date()) => {
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
};

export const parseCSVLine = (text) => {
    const result = [];
    let cell = '';
    let insideQuote = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (insideQuote && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else {
                insideQuote = !insideQuote;
            }
        } else if (char === ',' && !insideQuote) {
            result.push(cell);
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell);
    return result;
};

export const parseQuestions = (text) => {
    const parsed = [];
    if (!text) return parsed;

    // Aggressively clean markdown code blocks
    const cleanText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

    // 1. Try Parsing as JSON first (fallback if AI ignores Markdown instruction)
    if (cleanText.startsWith('[') || cleanText.startsWith('{')) {
        try {
            const jsonData = JSON.parse(cleanText);
            const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

            dataArray.forEach((item, index) => {
                const uniqueId = crypto.randomUUID();
                const type = (item.Type && item.Type.toLowerCase().includes('true')) ? 'True/False' : 'Multiple Choice';

                let options = {};
                if (type === 'True/False') {
                    options = { A: 'TRUE', B: 'FALSE' };
                } else {
                    options = {
                        A: item.OptionA || '',
                        B: item.OptionB || '',
                        C: item.OptionC || '',
                        D: item.OptionD || ''
                    };
                }

                parsed.push({
                    id: Date.now() + index + Math.random(),
                    uniqueId: uniqueId,
                    discipline: item.Discipline || "General",
                    type: type,
                    difficulty: item.Difficulty || "Easy",
                    question: item.Question || "",
                    options,
                    correct: item.CorrectLetter || "",
                    sourceUrl: item.SourceURL || "",
                    sourceExcerpt: item.SourceExcerpt || "",
                    qualityScore: parseInt(item.QualityScore) || null,
                    status: 'pending',
                    critique: null,
                    critiqueScore: null
                });
            });

            if (parsed.length > 0) return removeDuplicateQuestions(parsed);
        } catch (e) {
            console.warn("JSON parse failed, falling back to Markdown table parsing.", e);
        }
    }

    // 2. Parse as Markdown Table (Standard Path)
    const lines = cleanText.split('\n');

    const dataLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;

        // Check for pipe count to identify table rows reliably
        const pipeCount = (trimmed.match(/\|/g) || []).length;

        // It's a data line if it has pipes and isn't a header or separator
        return pipeCount >= 4 &&
            !trimmed.includes('| ID |') &&
            !trimmed.includes('｜ ID ｜') &&
            !trimmed.includes('|---');
    });

    dataLines.forEach((line, index) => {
        const normalizedLine = line.replace(/｜/g, '|');
        let cols = normalizedLine.split('|').map(c => c.trim());

        if (cols[0] === '') cols.shift();
        if (cols[cols.length - 1] === '') cols.pop();

        // Fix for potential column shifting if Description/Answer contains pipes (unlikely but possible)
        // We expect exactly 14 columns based on the prompt
        // | ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt | QualityScore |

        // If we have fewer than expected, we might have a problem, but let's try to map what we have.
        // The prompt defines 14 columns.

        const discipline = cols[1];
        const typeRaw = cols[2];
        const difficulty = cols[3];
        const question = cols[4];
        // cols[5] is "Answer" (text), we ignore it for the object but it's in the table
        const optA = cols[6];
        const optB = cols[7];
        const optC = cols[8];
        const optD = cols[9];
        const correctLetter = cols[10];
        const sourceUrl = cols[11];
        const sourceExcerpt = cols[12];
        let qualityScore = null;
        if (cols[13]) {
            const match = cols[13].match(/\d+/);
            if (match) qualityScore = parseInt(match[0]);
        }

        if (!question || !correctLetter || question.includes('---')) return;

        const type = typeRaw && typeRaw.toLowerCase().includes('true') ? 'True/False' : 'Multiple Choice';

        let options = {};
        if (type === 'True/False') {
            options = { A: 'TRUE', B: 'FALSE' };
        } else {
            options = { A: optA || '', B: optB || '', C: optC || '', D: optD || '' };

            // VALIDATION: Reject questions where any option is just a single letter (likely malformed)
            const isMalformed = Object.values(options).some(opt =>
                opt && opt.trim().length === 1 && /^[A-D]$/i.test(opt.trim())
            );
            if (isMalformed) {
                console.warn(`[Parser] Rejected malformed MC question with single-letter option: "${question.substring(0, 50)}..."`);
                return; // Skip this question
            }
        }

        const uniqueId = crypto.randomUUID();

        parsed.push({
            id: Date.now() + index + Math.random(),
            uniqueId: uniqueId,
            discipline: discipline || "General",
            type: type || "Multiple Choice",
            difficulty: difficulty || "Easy",
            question: question || "",
            options,
            correct: correctLetter || "",
            correct: correctLetter || "",
            sourceUrl: (sourceUrl && !sourceUrl.includes(' ')) ? sourceUrl : "", // Basic validation: URLs shouldn't have spaces
            sourceExcerpt: sourceExcerpt || "",
            qualityScore: qualityScore,
            status: 'pending',
            critique: null,
            critiqueScore: null
        });
    });

    // Remove duplicates within this batch (fuzzy matching at 85% threshold)
    return removeDuplicateQuestions(parsed);
};

export const downloadFile = (data, filename) => {
    const BOM = "\uFEFF";
    const finalType = 'text/csv;charset=utf-8;';
    const blob = new Blob([BOM + data], { type: finalType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const filterDuplicateQuestions = (newItems, currentList, otherList = [], threshold = 0.85) => {
    // Create a Set of existing IDs from the current state
    const existingIds = new Set(currentList.map(p => p.id));
    const otherIds = new Set(otherList.map(p => p.id));

    // Combine all existing questions for fuzzy matching
    const allExisting = [...currentList, ...otherList];

    const uniqueNew = newItems.filter(item => {
        // Check ID uniqueness
        if (existingIds.has(item.id) || otherIds.has(item.id)) return false;

        // Check fuzzy text similarity against all existing questions
        const isSimilar = allExisting.some(existing => {
            const similarity = textSimilarity(existing.question, item.question);
            return similarity >= threshold;
        });
        if (isSimilar) return false;

        return true;
    });

    if (uniqueNew.length < newItems.length) {
        const removed = newItems.length - uniqueNew.length;
        console.log(`[Filter] Removed ${removed} duplicate(s) that already exist in question database`);
    }

    return uniqueNew;
};
