import { logger } from "../utils/logger";
import { AI_CONFIG } from "../utils/constants";
/**
 * Analytics Store
 * Manages analytics data in localStorage with support for:
 * - Generation tracking
 * - Token usage monitoring
 * - Quality metrics
 * - Training data export for bad questions
 */

const STORAGE_KEY = "ue5_analytics";

/**
 * Gets analytics data from localStorage
 * @returns {object} Analytics data
 */
export const getAnalytics = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : initializeAnalytics();
  } catch (error) {
    logger.error("Error reading analytics:", error);
    return initializeAnalytics();
  }
};

/**
 * Initializes empty analytics structure
 * @returns {object} Empty analytics object
 */
const initializeAnalytics = () => ({
  generations: [],
  questions: [],
  critiqueActions: [], // Track when users apply/reject AI suggestions
  summary: {
    totalGenerations: 0,
    totalQuestions: 0,
    totalTokens: 0,
    estimatedCost: 0,
    averageQuality: 0,
    acceptanceRate: 0,
    critiqueAcceptanceRate: 0, // NEW: Track how often AI suggestions are applied
    lastUpdated: new Date().toISOString(),
  },
});

/**
 * Saves analytics data to localStorage
 * @param {object} data - Analytics data to save
 */
const saveAnalytics = (data) => {
  try {
    data.summary.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error("Error saving analytics:", error);
  }
};

/**
 * Updates summary statistics
 * @param {object} data - Analytics data
 */
const updateSummary = (data) => {
  const { generations, questions } = data;

  data.summary.totalGenerations = generations.length;
  data.summary.totalQuestions = questions.length;

  // Calculate total tokens
  data.summary.totalTokens = generations.reduce((sum, gen) => {
    return sum + (gen.tokensUsed?.input || 0) + (gen.tokensUsed?.output || 0);
  }, 0);

  // Calculate total cost
  data.summary.estimatedCost = generations.reduce((sum, gen) => {
    return sum + (gen.estimatedCost || 0);
  }, 0);

  // Calculate average quality
  const questionsWithQuality = questions.filter((q) => q.qualityScore != null);
  if (questionsWithQuality.length > 0) {
    const totalQuality = questionsWithQuality.reduce(
      (sum, q) => sum + q.qualityScore,
      0
    );
    data.summary.averageQuality = Math.round(
      totalQuality / questionsWithQuality.length
    );
  }

  // Calculate acceptance rate
  const decidedQuestions = questions.filter(
    (q) => q.status === "accepted" || q.status === "rejected"
  );
  if (decidedQuestions.length > 0) {
    const accepted = decidedQuestions.filter(
      (q) => q.status === "accepted"
    ).length;
    data.summary.acceptanceRate = Math.round(
      (accepted / decidedQuestions.length) * 100
    );
  }
};

/**
 * Logs a generation event
 * @param {object} generationData - Generation event data
 */
export const logGeneration = (generationData) => {
  const data = getAnalytics();

  const generation = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    discipline: generationData.discipline,
    difficulty: generationData.difficulty,
    batchSize: generationData.batchSize,
    tokensUsed: generationData.tokensUsed || { input: 0, output: 0 },
    duration: generationData.duration || 0,
    questionsGenerated: generationData.questionsGenerated || 0,
    averageQuality: generationData.averageQuality || 0,
    success: generationData.success !== false,
    errorMessage: generationData.errorMessage || null,
    model: generationData.model || AI_CONFIG.DEFAULT_MODEL,
    estimatedCost: generationData.estimatedCost || 0,
  };

  data.generations.push(generation);
  updateSummary(data);
  saveAnalytics(data);

  return generation.id;
};

/**
 * Logs a question event
 * @param {object} questionData - Question event data
 */
export const logQuestion = (questionData) => {
  const data = getAnalytics();

  const question = {
    id: questionData.id || crypto.randomUUID(),
    generationId: questionData.generationId || null,
    created: questionData.created || new Date().toISOString(),
    status: questionData.status || "pending",
    qualityScore: questionData.qualityScore || null,
    discipline: questionData.discipline,
    difficulty: questionData.difficulty,
    type: questionData.type,
    critiqueScore: questionData.critiqueScore || null,
    critiqueText: questionData.critiqueText || null,
    questionText: questionData.questionText || "",
    wasRewritten: questionData.wasRewritten || false,
    deletionReason: questionData.deletionReason || null,
    deletedAt: questionData.deletedAt || null,
  };

  // Check if question already exists (update instead of add)
  const existingIndex = data.questions.findIndex((q) => q.id === question.id);
  if (existingIndex >= 0) {
    data.questions[existingIndex] = {
      ...data.questions[existingIndex],
      ...question,
    };
  } else {
    data.questions.push(question);
  }

  updateSummary(data);
  saveAnalytics(data);
};

/**
 * Exports bad questions as training data for fine-tuning
 * @param {number} minCritiqueScore - Minimum critique score to include (default: 70)
 * @returns {object} Training data in JSONL format
 */
export const exportTrainingData = (minCritiqueScore = 70) => {
  const data = getAnalytics();

  // Get rejected questions or low-quality questions
  const badQuestions = data.questions.filter(
    (q) =>
      q.status === "rejected" ||
      (q.critiqueScore != null && q.critiqueScore < minCritiqueScore) ||
      (q.qualityScore != null && q.qualityScore < 60)
  );

  // Format for training (JSONL - one JSON object per line)
  const trainingExamples = badQuestions.map((q) => ({
    id: q.id,
    created: q.created,
    discipline: q.discipline,
    difficulty: q.difficulty,
    type: q.type,
    question: q.questionText,
    qualityScore: q.qualityScore,
    critiqueScore: q.critiqueScore,
    critiqueText: q.critiqueText,
    status: q.status,
    wasRewritten: q.wasRewritten,
    // Metadata for training
    label: "negative_example",
    reason: q.critiqueText || "Rejected by user",
  }));

  return {
    count: trainingExamples.length,
    data: trainingExamples,
    jsonl: trainingExamples.map((ex) => JSON.stringify(ex)).join("\n"),
  };
};

/**
 * Exports good questions as training data
 * @param {number} minQualityScore - Minimum quality score (default: 75)
 * @returns {object} Training data
 */
export const exportGoodTrainingData = (minQualityScore = 75) => {
  const data = getAnalytics();

  const goodQuestions = data.questions.filter(
    (q) =>
      q.status === "accepted" &&
      (q.qualityScore >= minQualityScore || q.critiqueScore >= minQualityScore)
  );

  const trainingExamples = goodQuestions.map((q) => ({
    id: q.id,
    created: q.created,
    discipline: q.discipline,
    difficulty: q.difficulty,
    type: q.type,
    question: q.questionText,
    qualityScore: q.qualityScore,
    critiqueScore: q.critiqueScore,
    label: "positive_example",
  }));

  return {
    count: trainingExamples.length,
    data: trainingExamples,
    jsonl: trainingExamples.map((ex) => JSON.stringify(ex)).join("\n"),
  };
};

/**
 * Downloads training data as a file
 * @param {string} type - 'bad' | 'good' | 'all'
 */
export const downloadTrainingData = (type = "all") => {
  let data, filename;

  if (type === "bad") {
    data = exportTrainingData();
    filename = `ue5_training_bad_${Date.now()}.jsonl`;
  } else if (type === "good") {
    data = exportGoodTrainingData();
    filename = `ue5_training_good_${Date.now()}.jsonl`;
  } else {
    const bad = exportTrainingData();
    const good = exportGoodTrainingData();
    data = {
      count: bad.count + good.count,
      jsonl: bad.jsonl + "\n" + good.jsonl,
    };
    filename = `ue5_training_all_${Date.now()}.jsonl`;
  }

  const blob = new Blob([data.jsonl], { type: "application/jsonl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  return data.count;
};

/**
 * Gets current token usage statistics
 * @returns {object} Token usage stats
 */
export const getTokenStats = () => {
  const data = getAnalytics();
  const recentGenerations = data.generations.slice(-10); // Last 10 generations

  const totalTokens = recentGenerations.reduce(
    (sum, g) => sum + (g.tokensUsed?.input || 0) + (g.tokensUsed?.output || 0),
    0
  );

  const avgInputTokens =
    recentGenerations.length > 0
      ? Math.round(
          recentGenerations.reduce(
            (sum, g) => sum + (g.tokensUsed?.input || 0),
            0
          ) / recentGenerations.length
        )
      : 0;

  const avgOutputTokens =
    recentGenerations.length > 0
      ? Math.round(
          recentGenerations.reduce(
            (sum, g) => sum + (g.tokensUsed?.output || 0),
            0
          ) / recentGenerations.length
        )
      : 0;

  return {
    total: data.summary.totalTokens,
    recent: totalTokens,
    avgInput: avgInputTokens,
    avgOutput: avgOutputTokens,
    estimatedCost: data.summary.estimatedCost,
  };
};

/**
 * Gets detailed token usage breakdown
 * @returns {object} { inputTokens, outputTokens, totalCost }
 */
export const getTokenUsage = () => {
  const data = getAnalytics();
  const inputTokens = data.generations.reduce(
    (sum, g) => sum + (g.tokensUsed?.input || 0),
    0
  );
  const outputTokens = data.generations.reduce(
    (sum, g) => sum + (g.tokensUsed?.output || 0),
    0
  );

  return {
    inputTokens,
    outputTokens,
    totalCost: data.summary.estimatedCost,
  };
};
