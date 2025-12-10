
import { textSimilarity } from './stringHelpers';

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
        } catch {
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
        const match = formatted.match(/([a-zA-Z0-9-]+\.com\/[a-zA-Z0-9-/]+)/);
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
    } catch {
        return formatted.substring(0, 50) + (formatted.length > 50 ? '...' : '');
    }
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
        } catch (_e) {
            console.warn("JSON parse failed, falling back to Markdown table parsing.", _e);
        }
    }

    // 2. Parse as Markdown Table (Standard Path)
    const lines = cleanText.split('\n');

    const dataLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;

        // Check for pipe count to identify table rows reliably
        const pipeCount = (trimmed.match(/\|/g) || []).length;

        // Skip separator rows (|---|, | --- |, |:---|, | : --- |, etc.)
        const isSeparator = /^\|?\s*:?\s*-+/.test(trimmed) || trimmed.match(/\|\s*:?\s*-{2,}\s*:?\s*\|/);
        
        // Skip header rows (contains "| ID |" or starts with "| ID")
        const isHeader = /\|\s*ID\s*\|/i.test(trimmed);

        // It's a data line if it has pipes and isn't a header or separator
        return pipeCount >= 4 && !isHeader && !isSeparator;
    });

    dataLines.forEach((line, index) => {
        const normalizedLine = line.replace(/｜/g, '|');
        const cols = normalizedLine.split('|').map(c => c.trim());

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
