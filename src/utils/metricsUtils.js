/**
 * Normalizes difficulty string to canonical form
 * Handles Easy/Beginner -> Easy, Medium/Intermediate -> Medium, Hard/Expert -> Hard
 */
const normalizeDifficulty = (difficulty) => {
  if (!difficulty) return null;
  const d = difficulty.toString().toLowerCase().trim();
  if (d === "easy" || d === "beginner") return "Easy";
  if (d === "medium" || d === "intermediate") return "Medium";
  if (d === "hard" || d === "expert") return "Hard";
  return null;
};

/**
 * Calculates metrics for a list of questions.
 * @param {Array} questions - The list of questions to analyze.
 * @returns {Object} - An object containing metrics.
 */
export const calculateMetrics = (questions) => {
  if (!questions || questions.length === 0) {
    return {
      total: 0,
      uniqueQuestions: 0,
      byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
      byType: { "Multiple Choice": 0, "True/False": 0 },
      byDiscipline: {},
      byLanguage: {},
      avgQuality: 0,
    };
  }

  // CRITICAL: Deduplicate by uniqueId FIRST, keeping only English versions
  // This ensures charts show unique question counts, not total documents
  const uniqueQuestionsMap = new Map();
  questions.forEach((q) => {
    if (!q.uniqueId) return;

    // Keep the first occurrence (usually English) or the one we already have
    if (!uniqueQuestionsMap.has(q.uniqueId)) {
      uniqueQuestionsMap.set(q.uniqueId, q);
    } else {
      // Prefer English version if available
      const existing = uniqueQuestionsMap.get(q.uniqueId);
      if (q.language === "English" && existing.language !== "English") {
        uniqueQuestionsMap.set(q.uniqueId, q);
      }
    }
  });

  const uniqueQuestions = Array.from(uniqueQuestionsMap.values());

  const metrics = {
    total: questions.length, // Total documents (including translations)
    uniqueQuestions: uniqueQuestions.length,
    byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
    byType: { "Multiple Choice": 0, "True/False": 0 },
    byDiscipline: {},
    byLanguage: {},
    totalQuality: 0,
    ratedCount: 0,
  };

  // Count unique questions only (for accurate charts)
  uniqueQuestions.forEach((q) => {
    // Difficulty - normalize before counting
    const normalizedDiff = normalizeDifficulty(q.difficulty);
    if (normalizedDiff && metrics.byDifficulty[normalizedDiff] !== undefined) {
      metrics.byDifficulty[normalizedDiff]++;
    }

    // Type
    if (metrics.byType[q.type] !== undefined) {
      metrics.byType[q.type]++;
    }

    // Discipline
    if (!metrics.byDiscipline[q.discipline]) {
      metrics.byDiscipline[q.discipline] = 0;
    }
    metrics.byDiscipline[q.discipline]++;

    // Quality Score (if available)
    const score = parseFloat(q.critiqueScore || q.initialQuality);
    if (!isNaN(score)) {
      metrics.totalQuality += score;
      metrics.ratedCount++;
    }
  });

  // Count ALL questions for language breakdown (to show translation stats)
  questions.forEach((q) => {
    const lang = q.language || "English";
    if (!metrics.byLanguage[lang]) {
      metrics.byLanguage[lang] = 0;
    }
    metrics.byLanguage[lang]++;
  });

  metrics.avgQuality =
    metrics.ratedCount > 0
      ? (metrics.totalQuality / metrics.ratedCount).toFixed(1)
      : 0;

  return metrics;
};
