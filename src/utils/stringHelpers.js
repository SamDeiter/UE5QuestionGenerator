/**
 * String utilities for text processing, markdown rendering, and CSV parsing.
 *
 * NOTE: Regex patterns here are for text/markdown processing.
 * Input is application-controlled (internal question text), not user-provided - no DoS risk.
 */
/* eslint-disable sonarjs/slow-regex */
import DOMPurify from "dompurify";

/**
 * Calculate text similarity using Levenshtein distance (0-1 score)
 * @param {string} str1 - First string to compare
 * @param {string} str2 - Second string to compare
 * @returns {number} Similarity score between 0 (different) and 1 (identical)
 */
export const textSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;

  // Normalize: lowercase, remove extra whitespace, remove HTML tags
  const normalize = (s) =>
    s
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const a = normalize(str1);
  const b = normalize(str2);

  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // For very long strings, use a simpler word-based comparison for performance
  if (a.length > 500 || b.length > 500) {
    const wordsA = new Set(a.split(" "));
    const wordsB = new Set(b.split(" "));
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
  }

  // Levenshtein distance calculation
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return 1 - matrix[b.length][a.length] / maxLen;
};

export const renderMarkdown = (t) => {
  if (!t) return "";

  // Step 1: Convert markdown-style formatting to HTML
  const html = String(t)
    // Headers
    .replace(
      /^### (.*$)/gim,
      '<h3 class="text-orange-400 font-bold text-xs mt-3 mb-1 uppercase tracking-wide">$1</h3>'
    )
    .replace(
      /^#### (.*$)/gim,
      '<h4 class="text-slate-200 font-bold text-[10px] mt-2 mb-1 uppercase">$1</h4>'
    )
    // Bold (**text**)
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="text-orange-300 font-bold">$1</strong>'
    )
    // Inline code (`code`)
    .replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 font-mono text-[0.9em] border border-blue-900/50">$1</code>'
    )
    // Lists
    .replace(
      /^\s*\* (.*$)/gim,
      '<div class="ml-3 flex items-start gap-2"><span class="text-orange-500 mt-1 text-[10px] flex-shrink-0">•</span><span>$1</span></div>'
    )
    // Italics (*text*)
    .replace(/\*([^\n*]+)\*/g, '<em class="text-slate-300 italic">$1</em>')
    // Double newlines
    .replace(/\n\s*\n/g, '<div class="h-2"></div>')
    // Single newlines
    .replace(/\n/g, "<br />");

  // Step 2: Sanitize with DOMPurify to prevent XSS
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "code",
      "br",
      "div",
      "span",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "p",
    ],
    ALLOWED_ATTR: ["class"],
    ALLOW_DATA_ATTR: false,
  });

  return sanitized;
};

export const sanitizeText = (text) => renderMarkdown(text);

export const stripHtmlTags = (text) => {
  if (typeof text !== "string") return text;
  // Use DOMParser for safer HTML parsing (avoids XSS via innerHTML)
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  return doc.body.textContent || "";
};

export const safe = (t) => {
  if (t === null || t === undefined) return '""';
  const str = String(t);
  let content = stripHtmlTags(str);
  content = (content || "").trim();
  content = content
    .replace(/[\u200B\uFEFF\u00A0]/g, " ")
    .replace(/\s\s+/g, " ")
    .trim();
  content = content.replace(/(\r\n|\n|\r|\t)/gm, " ");
  content = content.replace(/['"]/g, "");
  const escaped = content.replace(/"/g, '""');
  return `"${escaped}"`;
};

export const parseCSVLine = (text) => {
  const result = [];
  let cell = "";
  let insideQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (insideQuote && text[i + 1] === '"') {
        cell += '"';
        // eslint-disable-next-line sonarjs/updated-loop-counter -- Intentional: skip escaped quote
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === "," && !insideQuote) {
      result.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  result.push(cell);
  return result;
};
