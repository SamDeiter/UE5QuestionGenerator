// ============================================================================
// QUESTION FILTERING UTILITIES
// ============================================================================

/**
 * Primary filter: Filters questions by status, creator, search term, discipline, difficulty, type, and language
 * @param {Array} questions - Current session questions
 * @param {Array} historicalQuestions - Historical questions from previous sessions
 * @param {boolean} showHistory - Whether to show all questions or just current session
 * @param {string} filterMode - Filter by status: 'pending', 'accepted', 'rejected', or 'all'
 * @param {boolean} filterByCreator - Whether to filter by reviewer name (shows questions reviewed by current user)
 * @param {string} searchTerm - Text search term
 * @param {string} creatorName - Current user's creator name
 * @param {string} discipline - Selected discipline (e.g., 'Technical Art')
 * @param {string} difficulty - Selected difficulty setting (e.g., 'Easy', 'Medium', 'Hard')
 * @param {string} language - Selected language (e.g., 'English', 'Chinese (Simplified)')
 * @returns {Array} Filtered questions
 */
const normalizeDiff = (d) => {
  if (!d) return "";
  const lower = d.toString().trim().toLowerCase();

  // Map all variants to canonical lowercase values (case-insensitive)
  if (lower === "easy" || lower === "beginner") return "easy";
  if (lower === "medium" || lower === "intermediate") return "medium";
  if (lower === "hard" || lower === "expert") return "hard";

  return lower; // Return lowercase version for consistent comparison
};

const normalizeType = (t) => {
  if (!t) return "";
  const lower = t.toLowerCase();
  if (lower === "t/f" || lower === "true/false") return "True/False";
  if (lower === "mc" || lower === "multiple choice") return "Multiple Choice";
  return t; // Fallback
};

export const createFilteredQuestions = (
  questions,
  historicalQuestions,
  showHistory,
  filterMode,
  filterByCreator,
  searchTerm,
  creatorName,
  discipline,
  difficulty,
  type,
  language,
  selectedTags = [],
  scoreTier = "", // '', 'exceptional', 'very-good', 'good', 'adequate', 'needs-work'
  reviewerFilter = "" // Filter by specific reviewer name (humanVerifiedBy)
) => {
  // Determine source: either current session or all history
  const sourceQuestions = showHistory
    ? [...questions, ...historicalQuestions]
    : questions;

  return sourceQuestions.filter((q) => {
    // 1. Status Filter
    // CRITICAL FIX: Handle 'all' mode explicitly
    if (filterMode !== "all") {
      if (filterMode === "pending") {
        // Pending: show questions with no status or explicit "pending" status
        if (q.status && q.status !== "pending") return false;
      } else if (filterMode === "accepted") {
        if (q.status !== "accepted") return false;
      } else if (filterMode === "rejected") {
        if (q.status !== "rejected") return false;
      } else if (filterMode === "other") {
        // Other: any status that isn't empty, pending, accepted, or rejected
        if (
          !q.status ||
          q.status === "pending" ||
          q.status === "accepted" ||
          q.status === "rejected"
        )
          return false;
      }
    }

    // 2. Reviewer Filter (filter by who reviewed the question)
    if (filterByCreator && q.reviewerName !== creatorName) return false;

    // 3. Discipline Filter
    if (discipline && q.discipline !== discipline) return false;

    // 4. Tags Filter
    if (selectedTags && selectedTags.length > 0) {
      if (!q.tags || q.tags.length === 0) return false;
      // OR Logic: must have at least one of the selected tags
      if (!selectedTags.some((tag) => q.tags.includes(tag))) return false;
    }

    // 5. Difficulty & Type Filter
    if (difficulty) {
      // Check Difficulty (both normalized to lowercase for comparison)
      if (normalizeDiff(q.difficulty) !== normalizeDiff(difficulty))
        return false;

      // Check Type (only if specified)
      if (type && normalizeType(q.type) !== normalizeType(type)) return false;
    }

    // 6. Search Term Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      // Check static fields first; only pay for Object.values(options) on a miss
      const basicMatch =
        (q.uniqueId && q.uniqueId.toLowerCase().includes(term)) ||
        (q.question && q.question.toLowerCase().includes(term)) ||
        (q.discipline && q.discipline.toLowerCase().includes(term)) ||
        (q.difficulty && q.difficulty.toLowerCase().includes(term));

      if (!basicMatch) {
        const optionMatch =
          q.options &&
          Object.values(q.options).some(
            (o) => o && o.toString().toLowerCase().includes(term)
          );
        if (!optionMatch) return false;
      }
    }

    // 7. Score Tier Filter - Filter by AI critique score ranges
    // Helps reviewers find questions that need human attention
    if (scoreTier) {
      const score = q.critiqueScore;
      // If no score, only show in 'needs-work' (questions without scores need review)
      if (score === null || score === undefined) {
        if (scoreTier !== "needs-work") return false;
      } else {
        switch (scoreTier) {
          case "exceptional": // 90-100
            if (score < 90) return false;
            break;
          case "very-good": // 80-89
            if (score < 80 || score >= 90) return false;
            break;
          case "good": // 70-79
            if (score < 70 || score >= 80) return false;
            break;
          case "adequate": // 60-69
            if (score < 60 || score >= 70) return false;
            break;
          case "needs-work": // Under 70 (requires human review)
            if (score >= 70) return false;
            break;
          default:
            break;
        }
      }
    }

    // 8. Reviewer Filter - Filter by who verified/accepted the question
    // NORMALIZE: Handle concatenated names like "Sam DeiterSam Deiter"
    if (reviewerFilter) {
      const normalizeReviewer = (name) => {
        if (!name) return "";
        const cleaned = name.trim();
        // Check if name is doubled (e.g., "Sam DeiterSam Deiter")
        const half = Math.floor(cleaned.length / 2);
        if (
          cleaned.length > 5 &&
          cleaned.substring(0, half) === cleaned.substring(half)
        ) {
          return cleaned.substring(0, half);
        }
        return cleaned;
      };

      // Check if ANY reviewer field matches (after normalization)
      const reviewers = [q.humanVerifiedBy, q.acceptedBy, q.reviewerName]
        .map(normalizeReviewer)
        .filter((r) => r);

      if (!reviewers.includes(reviewerFilter)) return false;
    }

    return true;
  });
};

/**
 * Secondary filter: Groups questions by uniqueId and selects one variant per group
 * Prioritizes the selected language, then English, then any available variant
 * @param {Array} filteredQuestions - Already filtered questions from createFilteredQuestions
 * @param {string} language - Preferred language to display
 * @returns {Array} Unique questions (one per uniqueId) in preferred language
 */
export const createUniqueFilteredQuestions = (
  filteredQuestions,
  language = "English",
  allQuestionsMap = null
) => {
  // Single O(n) pass: group variants by uniqueId, preserving encounter order for the sort below.
  // Replaces the previous Set + per-ID re-filter pattern which was O(n \u00d7 k).
  const variantsByUniqueId = new Map();
  filteredQuestions.forEach((q) => {
    if (!variantsByUniqueId.has(q.uniqueId))
      variantsByUniqueId.set(q.uniqueId, []);
    variantsByUniqueId.get(q.uniqueId).push(q);
  });

  // Sort keys for stable output order (same behaviour as before)
  const sortedIds = Array.from(variantsByUniqueId.keys()).sort();
  const uniqueQuestions = [];

  sortedIds.forEach((id) => {
    // Always start from the filtered variants to respect discipline/status filters.
    // This prevents questions from other disciplines appearing when "All Disciplines" is selected.
    let variants = variantsByUniqueId.get(id);

    // If allQuestionsMap exists, widen to all language variants of the same discipline.
    // Only the discipline of the first filtered variant is used as the reference to avoid
    // pulling in cross-discipline duplicates.
    if (allQuestionsMap && allQuestionsMap.has(id) && variants.length > 0) {
      const referenceDiscipline = variants[0].discipline;
      variants = allQuestionsMap
        .get(id)
        .filter((v) => v.discipline === referenceDiscipline);
    }

    // 1. Preferred language \u2192 2. English fallback
    let selected =
      variants.find((v) => (v.language || "English") === language) ||
      variants.find((v) => (v.language || "English") === "English");

    // 3. Last-resort: English-tagged variant that passes Chinese-character sanity check.
    // Prevents Chinese questions incorrectly tagged as English from leaking into the English queue.
    if (!selected) {
      const isEnglishView = language === "English";
      selected = variants.find((v) => {
        if ((v.language || "English") !== "English") return false;
        if (isEnglishView && /[\u4e00-\u9fa5]/.test(v.question || v.text || ""))
          return false;
        return true;
      });
    }

    if (selected) uniqueQuestions.push(selected);
  });

  return uniqueQuestions;
};
