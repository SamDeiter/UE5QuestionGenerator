/**
 * ParserUtils - Utilities for parsing AI text/JSON/Markdown responses.
 *
 * NOTE: Uses Math.random for unique ID generation (non-security).
 * Regex patterns are for markdown/text parsing - input is app-controlled.
 */
/* eslint-disable sonarjs/pseudo-random, sonarjs/slow-regex */
import { textSimilarity } from "./stringHelpers";
import { normalizeQuestion } from "./normalizeQuestion";
import { logger } from "../utils/logger";
/**
 * Strips code fences and conversational prefixes from AI text.
 */
export const cleanJsonResponse = (text) => {
  if (!text) return "";

  // Remove markdown code blocks
  let cleaned = text
    .replace(/```[a-z]*[\r\n]*/gi, "")
    .replace(/```/g, "")
    .trim();

  // Strip common conversational prefixes if present
  const prefixRegex =
    /^(?:Here (?:is|are) (?:the )?(?:JSON|questions?|data)|Sure|Okay|Certainly).{0,50}[:\n]/i;
  cleaned = cleaned.replace(prefixRegex, "").trim();

  return cleaned;
};

/**
 * Remove near-duplicate questions from an array.
 */
export const removeDuplicateQuestions = (questions, threshold = 0.85) => {
  if (!questions || questions.length <= 1) return questions;

  const unique = [];
  const duplicatesRemoved = [];

  for (const q of questions) {
    const isDuplicate = unique.some((existing) => {
      const similarity = textSimilarity(existing.question, q.question);
      return similarity >= threshold;
    });

    if (!isDuplicate) {
      unique.push(q);
    } else {
      duplicatesRemoved.push(q.question?.substring(0, 50) + "...");
    }
  }

  if (duplicatesRemoved.length > 0) {
    logger.log(
      `[Dedup] Removed ${duplicatesRemoved.length} duplicate(s):`,
      duplicatesRemoved
    );
  }

  return unique;
};

/**
 * Filter new questions against existing ones.
 */
export const filterDuplicateQuestions = (
  newItems,
  currentList,
  otherList = [],
  threshold = 0.85
) => {
  const existingIds = new Set(currentList.map((p) => p.id));
  const otherIds = new Set(otherList.map((p) => p.id));
  const allExisting = [...currentList, ...otherList];

  const uniqueNew = newItems.filter((item) => {
    if (existingIds.has(item.id) || otherIds.has(item.id)) return false;

    const isSimilar = allExisting.some((existing) => {
      const similarity = textSimilarity(existing.question, item.question);
      return similarity >= threshold;
    });
    return !isSimilar;
  });

  return uniqueNew;
};

/**
 * Sanitizes and extracts actual URLs from redirects.
 */
export const formatUrl = (url) => {
  if (!url) return "";
  let cleanUrl = url.trim();

  if (
    cleanUrl.includes("google.com") ||
    cleanUrl.includes("grounding") ||
    cleanUrl.includes("vertex")
  ) {
    try {
      const urlObj = new URL(cleanUrl);
      const actualUrl =
        urlObj.searchParams.get("url") ||
        urlObj.searchParams.get("q") ||
        urlObj.searchParams.get("dest") ||
        urlObj.searchParams.get("redirect") ||
        urlObj.searchParams.get("re") ||
        urlObj.searchParams.get("adurl");

      if (actualUrl) {
        cleanUrl = decodeURIComponent(actualUrl);
      }
    } catch {
      // ignore
    }
  }

  if (cleanUrl.includes("http") && cleanUrl.indexOf("http") > 0) {
    const lastHttp = cleanUrl.lastIndexOf("http");
    cleanUrl = cleanUrl.substring(lastHttp);
  }

  if (cleanUrl.includes(" ")) return "";

  if (
    !/^[a-zA-Z]+:\/\//.test(cleanUrl) &&
    cleanUrl.includes(".") &&
    !cleanUrl.includes(" ")
  ) {
    if (
      !cleanUrl.toLowerCase().endsWith(".csv") &&
      !cleanUrl.toLowerCase().endsWith(".txt")
    ) {
      cleanUrl = "https://" + cleanUrl;
    }
  }
  return cleanUrl;
};

// Extract a clean display URL (removes protocol and trailing slashes)
export const getDisplayUrl = (url) => {
  if (!url) return "";
  const formatted = formatUrl(url);

  if (formatted.includes("vertexaisearch") || formatted.includes("grounding")) {
    const match = formatted.match(/([a-zA-Z0-9-]+\.com\/[a-zA-Z0-9-/]+)/);
    if (match) return match[1];
    return "Source Link";
  }

  try {
    const urlObj = new URL(formatted);
    let display = urlObj.hostname + urlObj.pathname;
    if (display.endsWith("/")) display = display.slice(0, -1);

    if (display.length > 60) {
      display =
        display.substring(0, 30) +
        "..." +
        display.substring(display.length - 20);
    }

    return display;
  } catch {
    return formatted.substring(0, 50) + (formatted.length > 50 ? "..." : "");
  }
};

/**
 * Parses questions from AI text/JSON/Markdown.
 */
export const parseQuestions = (text) => {
  const parsed = [];
  if (!text) return parsed;

  const cleanText = cleanJsonResponse(text);

  // 1. Try Parsing as JSON
  const jsonStart = cleanText.search(/[[{]/);
  const jsonEnd = cleanText.search(/[\]}][^\]}]*$/);

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    const potentialJson = cleanText.substring(jsonStart, jsonEnd + 1);
    try {
      const jsonData = JSON.parse(potentialJson);
      const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

      const isValidData = dataArray.some(
        (item) => item.Question || item.question || item.Discipline
      );

      if (isValidData) {
        dataArray.forEach((item, index) => {
          const type =
            item.Type && item.Type.toLowerCase().includes("true")
              ? "True/False"
              : "Multiple Choice";

          let options = {};
          if (type === "True/False") {
            options = { A: "TRUE", B: "FALSE" };
          } else {
            options = {
              A: item.OptionA || "",
              B: item.OptionB || "",
              C: item.OptionC || "",
              D: item.OptionD || "",
            };
          }

          // Parse tags - can be array or comma-separated string
          let tags = [];
          if (item.Tags) {
            tags = Array.isArray(item.Tags)
              ? item.Tags
              : item.Tags.split(",").map((t) => t.trim());
          }

          parsed.push({
            id: Date.now() + index + Math.random(),
            uniqueId: crypto.randomUUID(),
            discipline: item.Discipline || "General",
            type: type,
            difficulty: item.Difficulty || "Easy",
            question: item.Question || "",
            options,
            correct: item.CorrectLetter || "",
            sourceUrl: item.SourceURL || "",
            sourceExcerpt: item.SourceExcerpt || "",
            qualityScore: parseInt(item.QualityScore) || null,
            status: "pending",
            critique: null,
            critiqueScore: null,
            tags,
          });
        });

        if (parsed.length > 0) return removeDuplicateQuestions(parsed);
      }
    } catch {
      // fallback
    }
  }

  // 2. Parse as Markdown Table
  const lines = cleanText.split("\n");
  const dataLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const pipeCount = (trimmed.match(/\|/g) || []).length;
    const isSeparator =
      /^\|?\s*:?\s*-+/.test(trimmed) ||
      trimmed.match(/\|\s*:?\s*-{2,}\s*:?\s*\|/);
    const isHeader = /\|\s*ID\s*\|/i.test(trimmed);
    return pipeCount >= 4 && !isHeader && !isSeparator;
  });

  dataLines.forEach((line, index) => {
    const normalizedLine = line.replace(/｜/g, "|");
    const cols = normalizedLine.split("|").map((c) => c.trim());

    if (cols[0] === "") cols.shift();
    if (cols[cols.length - 1] === "") cols.pop();

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
    const tagsRaw = cols[13];
    let qualityScore = null;
    if (cols[14]) {
      const match = cols[14].match(/\d+/);
      if (match) qualityScore = parseInt(match[0]);
    }

    if (!question || !correctLetter || question.includes("---")) return;

    let tags = [];
    if (tagsRaw && tagsRaw !== "-" && tagsRaw !== "") {
      tags = tagsRaw
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter((t) => t);
    }

    const type =
      typeRaw && typeRaw.toLowerCase().includes("true")
        ? "True/False"
        : "Multiple Choice";

    let options = {};
    if (type === "True/False") {
      options = { A: "TRUE", B: "FALSE" };
    } else {
      options = { A: optA || "", B: optB || "", C: optC || "", D: optD || "" };
      const isMalformed = Object.values(options).some(
        (opt) => opt && opt.trim().length === 1 && /^[A-D]$/i.test(opt.trim())
      );
      if (isMalformed) return;
    }

    parsed.push({
      id: Date.now() + index + Math.random(),
      uniqueId: crypto.randomUUID(),
      discipline: discipline || "General",
      type: type || "Multiple Choice",
      difficulty: difficulty || "Easy",
      question: question || "",
      options,
      correct: correctLetter || "",
      sourceUrl: sourceUrl && !sourceUrl.includes(" ") ? sourceUrl : "",
      sourceExcerpt: sourceExcerpt || "",
      tags: tags,
      qualityScore: qualityScore,
      status: "pending",
      critique: null,
      critiqueScore: null,
    });
  });

  const deduplicated = removeDuplicateQuestions(parsed);
  return deduplicated.map((q) => normalizeQuestion(q));
};

/**
 * Intelligently converts a Multiple Choice question to True/False format.
 * Creates a statement from the question + correct answer, randomly makes it TRUE or FALSE.
 * @param {Object} mcQuestion - The Multiple Choice question to convert.
 * @param {string} difficulty - The difficulty level to apply.
 * @returns {Object} The converted True/False question.
 */
export const convertMCtoTF = (mcQuestion, difficulty) => {
  const correctAnswerText = mcQuestion.options[mcQuestion.correct];
  const wrongAnswers = Object.entries(mcQuestion.options)
    .filter(([key, val]) => key !== mcQuestion.correct && val && val.trim())
    .map(([, val]) => val);

  // Check if the original question is already effectively True/False
  const lowerCorrect = correctAnswerText
    .trim()
    .toLowerCase()
    .replace(/[.,!]$/, "");
  const isBooleanAnswer = ["true", "false", "yes", "no"].includes(lowerCorrect);

  let newStatement = mcQuestion.question.trim().replace(/\?$/, "");
  let makeItTrue = true; // Default

  if (isBooleanAnswer) {
    // PRESERVE MODE: If original answer is True/False, we keep the statement as is.
    // We cannot easily flip the truthiness of a statement without complex NLP (e.g. adding "not").
    // So we force the new question to match the original truthiness.

    // If original correct was "TRUE" or "YES" -> New Correct is A (TRUE)
    makeItTrue = ["true", "yes"].includes(lowerCorrect);

    // Statement is just the original question text (which is likely a statement)
    // newStatement remains the same
  } else {
    // STANDARD MODE: Randomly decide if this will be a TRUE or FALSE question (50/50)
    makeItTrue = Math.random() > 0.5;
    const targetAnswer = makeItTrue
      ? correctAnswerText
      : wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)] ||
        "incorrect";

    // 1. Handle "Can you..." -> "You can [stem] [answer]"
    if (/^Can you/i.test(newStatement)) {
      const stem = newStatement.replace(/^Can you\s+/i, "");
      newStatement = `You can ${stem} ${targetAnswer}`;
    }
    // 2. Handle "Is..." -> "[Subject] is [Answer]"
    else if (/^Is\s+/i.test(newStatement)) {
      const stem = newStatement.replace(/^Is\s+/i, "");
      newStatement = `${stem} is ${targetAnswer}`;
    }
    // 3. Handle "What/Which..." -> "[Stem] is [Answer]"
    else {
      // Check for WH- words
      const isWhQuestion = /^(What|Which|How|Where|When|Why)\s+/i.test(
        newStatement
      );

      if (isWhQuestion) {
        const stem = newStatement
          .replace(
            /^(What|Which|How|Where|When|Why)\s+(is|are|does|do|can|should|would)\s+/i,
            ""
          )
          .trim();
        newStatement = `${stem} is ${targetAnswer}`;
      } else {
        // Fallback for other structures: append answer
        newStatement = `${newStatement} is ${targetAnswer}`;
      }
    }
  }

  // Cleanup: Remove double spaces, capitalize, add period
  newStatement = newStatement.replace(/\s+/g, " ").trim();
  newStatement = newStatement.charAt(0).toUpperCase() + newStatement.slice(1);
  if (!newStatement.endsWith(".")) newStatement += ".";

  return {
    ...mcQuestion,
    type: "True/False",
    difficulty: difficulty,
    question: newStatement,
    options: { A: "TRUE", B: "FALSE", C: "", D: "" },
    correct: makeItTrue ? "A" : "B",
    originalMC: mcQuestion.question, // Keep original for reference
  };
};
