import { GENERATION_LIMITS, AI_CONFIG } from "./constants";

/**
 * Calculates coverage gaps for tags based on existing questions.
 * @param {string} discipline - Current discipline.
 * @param {string[]} availableTags - Tags available for the discipline.
 * @param {Array} allQuestions - All currently loaded questions.
 * @returns {Object} Coverage gaps (zeroTags, lowTags).
 */
export const calculateCoverageGaps = (
  discipline,
  availableTags,
  allQuestions
) => {
  const tagCounts = {};
  availableTags.forEach((t) => (tagCounts[t] = 0));

  allQuestions
    .filter((q) => q.discipline === discipline)
    .forEach((q) => {
      if (q.tags && Array.isArray(q.tags)) {
        q.tags.forEach((t) => {
          const norm = t.startsWith("#") ? t : `#${t}`;
          const key = availableTags.find(
            (at) => at.toLowerCase() === norm.toLowerCase()
          );
          if (key) tagCounts[key]++;
        });
      }
    });

  const zeroTags = availableTags.filter((t) => tagCounts[t] === 0);
  const lowTags = availableTags.filter(
    (t) =>
      tagCounts[t] > 0 && tagCounts[t] < GENERATION_LIMITS.TOTAL_TAGS_THRESHOLD
  );

  return { zeroTags, lowTags };
};

/**
 * Filters out questions with sources from forbidden domains.
 * @param {Array} questions - Questions to filter.
 * @returns {Array} Filtered questions.
 */
export const filterForbiddenSources = (questions) => {
  const forbiddenDomains = [
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "vertexaisearch",
  ];
  return questions.filter((q) => {
    const url = (q.sourceUrl || "").toLowerCase();
    return !forbiddenDomains.some((domain) => url.includes(domain));
  });
};

/**
 * Verifies sources against grounded URLs and handles type conversion.
 * @param {Array} questions - Questions to process.
 * @param {Object} context - processing context.
 * @param {Function} convertMCtoTF - Conversion utility.
 * @returns {Array} Processed questions.
 */
export const verifyAndProcessQuestions = (
  questions,
  context,
  convertMCtoTF
) => {
  const { groundedUrls, expectedType, config } = context;

  return questions.map((q) => {
    let updatedQ = { ...q };
    const url = (updatedQ.sourceUrl || "").toLowerCase();

    if (url && groundedUrls.size > 0) {
      const isVerified = Array.from(groundedUrls).some(
        (groundedUrl) =>
          url.includes(groundedUrl) ||
          groundedUrl.includes(url.split("/").slice(-1)[0])
      );
      updatedQ.sourceVerified = isVerified;
    } else if (!url) {
      updatedQ.sourceVerified = "missing";
    } else if (url.includes("epicgames.com")) {
      updatedQ.sourceVerified = "assumed";
    } else {
      updatedQ.sourceVerified = false;
    }

    if (expectedType === "True/False" && q.type === "Multiple Choice") {
      updatedQ = convertMCtoTF(updatedQ, config.difficulty);
    } else {
      updatedQ.difficulty = config.difficulty;
    }

    updatedQ.discipline = config.discipline;
    return updatedQ;
  });
};

/**
 * Enriches generated questions with metadata and validation info.
 * @param {Array} questions - Parsed questions from AI.
 * @param {Object} context - Metadata context (config, duration, cost, etc).
 * @returns {Array} Enriched questions.
 */
export const enrichGeneratedQuestions = (questions, context) => {
  const {
    config,
    duration,
    costPerQuestion,
    groundingSources,
    expectedType,
    requestedDifficulty,
  } = context;

  return questions.map((q) => {
    const enriched = {
      ...q,
      status: "pending",
      language: "English",
      creatorName: config.creatorName || "Unknown",
      estimatedCost: costPerQuestion,
      generationTime: duration,
      model: config.model || AI_CONFIG.DEFAULT_MODEL,
      groundingSources:
        groundingSources.length > GENERATION_LIMITS.MAX_GROUNDING_SOURCES
          ? groundingSources.slice(0, GENERATION_LIMITS.MAX_GROUNDING_SOURCES)
          : groundingSources,
      tags: q.tags && q.tags.length > 0 ? q.tags : config.tags || [],
      discipline: config.discipline,
      type: expectedType,
      difficulty: requestedDifficulty,
    };

    // Safeguard status
    if (enriched.status !== "pending") {
      enriched.status = "pending";
    }

    return enriched;
  });
};
