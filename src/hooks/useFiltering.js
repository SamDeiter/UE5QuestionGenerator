/**
 * useFiltering Hook
 *
 * Manages all filtering and search state for the question list, including:
 * - Search term
 * - Filter mode (pending/accepted/rejected/all)
 * - Show history toggle
 * - Filter by creator
 * - Filter by tags
 * - Sort order
 * - Current review index
 * - Computed filtered question lists
 * - LocalStorage persistence
 */
import { useState, useEffect, useMemo } from "react";
import {
  createFilteredQuestions,
  createUniqueFilteredQuestions,
} from "../utils/questionFilters";

/**
 * Custom hook for managing question filtering state and logic.
 *
 * @param {Object} params - Hook parameters
 * @param {Array} params.questions - Current session questions
 * @param {Array} params.historicalQuestions - Historical questions from cloud
 * @param {Object} params.config - App configuration (creatorName, discipline, difficulty, language)
 * @param {string} params.appMode - Current app mode ('create', 'review', 'database', etc.)
 * @returns {Object} Filtering state and handlers
 */
export function useFiltering({
  questions,
  historicalQuestions,
  config,
  appMode,
  allQuestionsMap,
}) {
  // ========================================================================
  // STATE - Filter & Search
  // ========================================================================
  const [searchTerm, setSearchTerm] = useState(
    () => localStorage.getItem("ue5_pref_search") || ""
  );
  const [filterMode, setFilterMode] = useState(
    () => localStorage.getItem("ue5_pref_filter") || "pending"
  );
  const [showHistory, setShowHistory] = useState(
    () => localStorage.getItem("ue5_pref_history") === "true"
  );
  const [filterByCreator, setFilterByCreator] = useState(false);
  const [filterTags, setFilterTags] = useState([]);
  const [filterScoreTier, setFilterScoreTier] = useState(""); // '', 'exceptional', 'very-good', 'good', 'adequate', 'needs-work'
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [sortBy, setSortBy] = useState("default");

  // ========================================================================
  // EFFECTS - Persistence
  // ========================================================================

  // Persist filter preferences to localStorage
  useEffect(() => {
    localStorage.setItem("ue5_pref_search", searchTerm);
    localStorage.setItem("ue5_pref_filter", filterMode);
    localStorage.setItem("ue5_pref_history", showHistory);
  }, [searchTerm, filterMode, showHistory]);

  // Reset review index when filters change
  useEffect(() => {
    setCurrentReviewIndex(0);
  }, [
    appMode,
    config.discipline,
    config.difficulty,
    config.language,
    filterMode,
    searchTerm,
  ]);

  // ========================================================================
  // COMPUTED VALUES - Filtered Questions
  // ========================================================================

  // PERFORMANCE: Destructure config to avoid unnecessary recalculations
  // when config object reference changes but values don't
  const { creatorName, discipline, difficulty, type, language } = config;

  // 1. First, get questions that match all filters EXCEPT status (for counts)
  const contextFilteredQuestions = useMemo(
    () =>
      createFilteredQuestions(
        questions,
        historicalQuestions,
        showHistory || appMode === "review" || appMode === "create", // Show history in Create & Review modes
        "all", // Ignore status for this intermediate list
        filterByCreator,
        searchTerm,
        creatorName,
        discipline,
        appMode === "review" ? null : difficulty, // Review mode: ignore difficulty filter
        appMode === "review" ? null : type, // Review mode: ignore type filter
        language,
        filterTags,
        filterScoreTier
      ),
    [
      questions,
      historicalQuestions,
      showHistory,
      appMode,
      filterByCreator,
      searchTerm,
      creatorName,
      discipline,
      difficulty,
      type,
      language,
      filterTags,
      filterScoreTier,
    ]
  );

  // 2. Calculate counts based on the context
  const contextCounts = useMemo(() => {
    const pending = contextFilteredQuestions.filter(
      (q) => !q.status || q.status === "pending"
    ).length;
    const accepted = contextFilteredQuestions.filter(
      (q) => q.status === "accepted"
    ).length;
    const rejected = contextFilteredQuestions.filter(
      (q) => q.status === "rejected"
    ).length;
    const all = contextFilteredQuestions.length;
    return { pending, accepted, rejected, all };
  }, [contextFilteredQuestions]);

  // 3. Now apply the status filter for the actual view
  const filteredQuestions = useMemo(() => {
    if (filterMode === "all") return contextFilteredQuestions;
    return contextFilteredQuestions.filter((q) => {
      if (filterMode === "pending") return !q.status || q.status === "pending";
      return q.status === filterMode;
    });
  }, [contextFilteredQuestions, filterMode]);

  // 4. Get unique questions for the current language, sorted consistently
  const uniqueFilteredQuestions = useMemo(() => {
    // A. Group and Select Variants
    const result = createUniqueFilteredQuestions(
      filteredQuestions,
      language,
      allQuestionsMap
    );

    // B. Log selection
    console.log("🔍 [useFiltering] uniqueFilteredQuestions updated:", {
      language,
      count: result.length,
      firstQuestionLanguage: result[0]?.language,
      firstQuestionText: result[0]?.question?.substring(0, 50) + "...",
    });

    // C. Apply Stable Sort (Canonical Date = Earliest creation time of any variant in the group)
    // This ensures that translating a question (creating a newer variant)
    // does not cause the question card to jump to the top of the list.
    const getCanonicalDate = (q) => {
      if (!allQuestionsMap || !allQuestionsMap.has(q.uniqueId)) {
        // Fallback if map missing
        return q.created || q.dateAdded || 0;
      }
      const variants = allQuestionsMap.get(q.uniqueId);
      // Find the earliest date among all variants to anchor the group's position
      return Math.min(
        ...variants.map((v) =>
          new Date(v.created || v.dateAdded || Date.now()).getTime()
        )
      );
    };

    // Pre-calculate dates to avoid finding variants during sort
    const dateMap = new Map();
    result.forEach((q) => dateMap.set(q.uniqueId, getCanonicalDate(q)));

    // Sort: Newest Original First (Standard Blog/Feed sort)
    // Add uniqueId as tiebreaker for fully stable sort
    return result.sort((a, b) => {
      const dateA = dateMap.get(a.uniqueId);
      const dateB = dateMap.get(b.uniqueId);

      // Primary sort: canonical date (newest first)
      if (dateB !== dateA) {
        return dateB - dateA;
      }

      // Tiebreaker: uniqueId (alphabetical) for stability
      return (a.uniqueId || "").localeCompare(b.uniqueId || "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredQuestions, language]);
  // NOTE: allQuestionsMap is intentionally NOT in dependencies
  // It's only used for stable sorting and changes reference frequently
  // Adding it would cause excessive recalculations and question jumping

  // ========================================================================
  // RETURN
  // ========================================================================
  return {
    // State
    searchTerm,
    setSearchTerm,
    filterMode,
    setFilterMode,
    showHistory,
    setShowHistory,
    filterByCreator,
    setFilterByCreator,
    filterTags,
    setFilterTags,
    currentReviewIndex,
    setCurrentReviewIndex,
    sortBy,
    setSortBy,
    filterScoreTier,
    setFilterScoreTier,

    // Computed values
    contextFilteredQuestions,
    contextCounts,
    filteredQuestions,
    uniqueFilteredQuestions,
  };
}
