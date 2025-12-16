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
      byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
      byType: { "Multiple Choice": 0, "True/False": 0 },
      byDiscipline: {},
      avgQuality: 0,
    };
  }

  const metrics = {
    total: questions.length,
    byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
    byType: { "Multiple Choice": 0, "True/False": 0 },
    byDiscipline: {},
    totalQuality: 0,
    ratedCount: 0,
  };

  questions.forEach((q) => {
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

  metrics.avgQuality =
    metrics.ratedCount > 0
      ? (metrics.totalQuality / metrics.ratedCount).toFixed(1)
      : 0;

  return metrics;
};
