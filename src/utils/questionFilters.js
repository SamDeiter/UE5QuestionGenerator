// ============================================================================
// QUESTION FILTERING UTILITIES
// ============================================================================

/**
 * Primary filter: Filters questions by status, creator, search term, discipline, difficulty, type, and language
 * @param {Array} questions - Current session questions
 * @param {Array} historicalQuestions - Historical questions from previous sessions
 * @param {boolean} showHistory - Whether to show all questions or just current session
 * @param {string} filterMode - Filter by status: 'pending', 'accepted', 'rejected', or 'all'
 * @param {boolean} filterByCreator - Whether to filter by creator name
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
  selectedTags = []
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
      }
    }

    // 2. Creator Filter
    if (filterByCreator && q.creatorName !== creatorName) return false;

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
      const searchFields = [
        q.uniqueId,
        q.question,
        q.discipline,
        q.difficulty,
        // Search within options
        ...(q.options ? Object.values(q.options) : []),
      ];

      // Check if any field contains the term
      const matches = searchFields.some(
        (field) => field && field.toString().toLowerCase().includes(term)
      );

      if (!matches) return false;
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
  // FIX: Collect all unique IDs first, sort them, then process in stable order
  // This prevents dependency on the iteration order of filteredQuestions
  const uniqueIds = new Set();
  filteredQuestions.forEach((q) => uniqueIds.add(q.uniqueId));

  const sortedUniqueIds = Array.from(uniqueIds).sort();
  const uniqueQuestions = [];

  sortedUniqueIds.forEach((id) => {
    // FIX: Always get variants from the filtered list first to respect discipline filter
    // This prevents questions from other disciplines appearing when "All Disciplines" is selected
    let variants = filteredQuestions.filter((fq) => fq.uniqueId === id);

    // If allQuestionsMap exists and we found variants in filtered list,
    // we can use the map to find additional language variants of the SAME question
    // but ONLY if they would have passed the same filters (same discipline)
    if (allQuestionsMap && allQuestionsMap.has(id) && variants.length > 0) {
      // Use the first variant to check discipline
      const referenceDiscipline = variants[0].discipline;

      // Get all variants from map and filter to match the reference discipline
      const mapVariants = allQuestionsMap.get(id);
      variants = mapVariants.filter(
        (v) => v.discipline === referenceDiscipline
      );
    }

    let selected = null;

    // 1. Try to find exact language match
    selected = variants.find((v) => (v.language || "English") === language);

    // 2. Fall back to English
    if (!selected) {
      selected = variants.find((v) => (v.language || "English") === "English");
    }

    // 4. Last resort: First available variant
    if (!selected && variants.length > 0) {
      selected = variants[0];
    }

    if (selected) {
      uniqueQuestions.push(selected);
    }
  });

  return uniqueQuestions;
};
