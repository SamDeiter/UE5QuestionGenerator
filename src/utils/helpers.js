export const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

export const formatUrl = (url) => {
    if (!url) return '';
    let cleanUrl = url.trim();

    // Extract actual URL from Google vertexaisearch/grounding redirect URLs
    if (cleanUrl.includes('vertexaisearch.cloud.google.com') || cleanUrl.includes('grounding-api-redirect')) {
        try {
            // Try to extract the actual URL from the redirect
            const urlObj = new URL(cleanUrl);
            // Check for common redirect parameters
            const actualUrl = urlObj.searchParams.get('url') ||
                urlObj.searchParams.get('q') ||
                urlObj.searchParams.get('dest') ||
                urlObj.searchParams.get('redirect');
            if (actualUrl) {
                cleanUrl = decodeURIComponent(actualUrl);
            }
        } catch (e) {
            // If URL parsing fails, keep original
        }
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
    try {
        const urlObj = new URL(formatted);
        // Return just the hostname + pathname (truncated if too long)
        let display = urlObj.hostname + urlObj.pathname;
        if (display.endsWith('/')) display = display.slice(0, -1);
        return display;
    } catch (e) {
        return formatted;
    }
};

export const renderMarkdown = (t) => {
    if (!t) return "";

    // Preserve HTML tags we want to keep (<b>, <i>, <code>)
    const htmlTagPlaceholders = [];
    let safe = String(t)
        .replace(/(<b>|<\/b>|<i>|<\/i>|<code>|<\/code>)/g, (match) => {
            const placeholder = `__HTML_TAG_${htmlTagPlaceholders.length}__`;
            htmlTagPlaceholders.push(match);
            return placeholder;
        });

    // Now escape other HTML
    safe = safe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // formatting replacements
    safe = safe
        // Headers - Restored some spacing
        .replace(/^### (.*$)/gim, '<h3 class="text-orange-400 font-bold text-xs mt-3 mb-1 uppercase tracking-wide">$1</h3>')
        .replace(/^#### (.*$)/gim, '<h4 class="text-slate-200 font-bold text-[10px] mt-2 mb-1 uppercase">$1</h4>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-orange-300 font-bold">$1</strong>')
        // Inline code (backticks) - styled like UE5 Blueprint terms
        .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 font-mono text-[0.9em] border border-blue-900/50">$1</code>')
        // Lists - Better indentation
        .replace(/^\s*\* (.*$)/gim, '<div class="ml-3 flex items-start gap-2"><span class="text-orange-500 mt-1 text-[10px] flex-shrink-0">•</span><span>$1</span></div>')
        // Italics - Restricted to single line
        .replace(/\*([^\n*]+)\*/g, '<em class="text-slate-300 italic">$1</em>')
        // Collapse multiple newlines into a larger spacing div
        .replace(/\n\s*\n/g, '<div class="h-2"></div>')
        // Single newlines to breaks
        .replace(/\n/g, '<br />');

    // Restore preserved HTML tags
    htmlTagPlaceholders.forEach((tag, index) => {
        safe = safe.replace(`__HTML_TAG_${index}__`, tag);
    });

    return safe;
};

export const sanitizeText = (text) => renderMarkdown(text);

export const stripHtmlTags = (text) => {
    if (typeof text !== 'string') return text;
    const tmp = document.createElement("DIV");
    tmp.innerHTML = text;
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
    const cleanText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '');
    const lines = cleanText.split('\n');

    const dataLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;

        // Check for pipe count to identify table rows reliably
        // We expect at least ~10 columns, so at least 9 pipes. 
        // Being lenient with 4 to catch partials or malformed rows.
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

        if (cols.length >= 10) {
            const looksLikeAnswer = (val) => /^[A-D]$/.test(val);
            const looksLikeUrl = (val) => val && val.startsWith('http');
            if (cols[9] && looksLikeAnswer(cols[9]) && cols[10] && looksLikeUrl(cols[10])) {
                cols.splice(5, 0, "");
            }
        }

        const discipline = cols[1];
        const typeRaw = cols[2];
        const difficulty = cols[3];
        const question = cols[4];
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
            sourceUrl: sourceUrl || "",
            sourceExcerpt: sourceExcerpt || "",
            initialQuality: qualityScore,
            status: 'pending',
            critique: null,
            critiqueScore: null
        });
    });

    return parsed;
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

export const filterDuplicateQuestions = (newItems, currentList, otherList = []) => {
    // Create a Set of existing IDs from the current state
    const existingIds = new Set(currentList.map(p => p.id));

    // Create a Set of normalized question text from the current state to prevent semantic duplicates
    const existingTexts = new Set(currentList.map(p => p.question.trim().toLowerCase()));

    // Also check against the OTHER list to ensure global uniqueness across session and history
    const otherIds = new Set(otherList.map(p => p.id));
    const otherTexts = new Set(otherList.map(p => p.question.trim().toLowerCase()));

    const uniqueNew = newItems.filter(item => {
        const normalizedText = item.question.trim().toLowerCase();

        // Check ID uniqueness
        if (existingIds.has(item.id) || otherIds.has(item.id)) return false;

        // Check Text uniqueness (prevent duplicates even if IDs differ)
        if (existingTexts.has(normalizedText) || otherTexts.has(normalizedText)) return false;

        return true;
    });

    if (uniqueNew.length < newItems.length) {

    }

    return uniqueNew;
};
