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
import { useState, useEffect, useMemo, useRef } from "react";
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

  // PERSISTED NAVIGATION: Survive page refreshes
  const [currentReviewIndex, setCurrentReviewIndex] = useState(() => {
    if (appMode !== "review") return 0;
    const saved = localStorage.getItem("ue5_pref_review_index");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [sortBy, setSortBy] = useState("default");

  // Track the uniqueId of the current question for better cross-refresh restoration
  const [lastUniqueId, setLastUniqueId] = useState(
    () => localStorage.getItem("ue5_pref_last_id") || null
  );

  // Reset review index when entering Review mode FROM another mode (not refresh)
  const lastModeRef = useRef(appMode);

  // Persistence for review index
  useEffect(() => {
    if (appMode === "review") {
      localStorage.setItem("ue5_pref_review_index", currentReviewIndex);
    }
  }, [currentReviewIndex, appMode]);

  // ========================================================================
  // EFFECTS - Persistence
  // ========================================================================

  // Persist filter preferences to localStorage
  useEffect(() => {
    localStorage.setItem("ue5_pref_search", searchTerm);
    localStorage.setItem("ue5_pref_filter", filterMode);
    localStorage.setItem("ue5_pref_history", showHistory);
  }, [searchTerm, filterMode, showHistory]);

  // NOTE: Position is preserved when switching filters - no reset needed
  // The existing restoration logic handles keeping the user on the same question

  // DISABLED: Old reset logic that was causing questions to jump
  // We now handle this more intelligently below
  /*
  // Reset review index when filters change
  // NOTE: discipline, difficulty, and language are intentionally excluded
  // Changing these filters should maintain the current question position when possible
  useEffect(() => {
    console.log(
      "🔄 [useFiltering] Resetting review index to 0. Triggered by:",
      {
        appMode,
        filterMode,
        searchTerm,
      }
    );
    setCurrentReviewIndex(0);
  }, [
    appMode,
    // config.discipline, // REMOVED: Don't reset index when discipline changes
    // config.difficulty, // REMOVED: Don't reset index when difficulty changes
    // config.language,   // REMOVED: Don't reset index when language changes
    filterMode,
    searchTerm,
  ]);
  */

  // ========================================================================
  // COMPUTED VALUES - Filtered Questions
  // ========================================================================

  // PERFORMANCE: Destructure config to avoid unnecessary recalculations
  // when config object reference changes but values don't
  const { creatorName, discipline, difficulty, type, language } = config;

  // STABILITY: Track previous contextFilteredQuestions to avoid unnecessary re-renders
  const prevContextFilteredRef = useRef([]);

  // 1. First, get questions that match all filters EXCEPT status (for counts)
  const contextFilteredQuestions = useMemo(() => {
    const newResult = createFilteredQuestions(
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
    );

    // STABILITY: Only return new array if the question IDs or important content changed
    // This prevents infinite recalculation loops while still detecting real changes
    const newIds = newResult.map((q) => q.id || q.uniqueId).join(",");
    const prevIds = prevContextFilteredRef.current
      .map((q) => q.id || q.uniqueId)
      .join(",");

    // Also check if critique scores, status, OR verification/rewrites changed
    const generateHash = (list) =>
      list
        .map((q) => {
          // STABILITY: Include as many relevant fields as possible to detect changes
          // Use q.id or q.uniqueId for stable identification
          const id = q.id || q.uniqueId;
          const score = q.critiqueScore ?? "none";
          const improved = q.improvedScore ?? "none";
          const rewriteScore = q.suggestedRewrite?.critiqueScore ?? "none";
          const status = q.status || "pending";
          const verified = q.humanVerified ? "yes" : "no";
          const rewrite = q.suggestedRewrite ? "yes" : "no";
          const lang = q.language || "English";
          const lastModified = q.lastModified || q.updatedAt || "0";

          return `${id}:${score}:${status}:${verified}:${rewrite}:${rewriteScore}:${improved}:${lang}:${lastModified}`;
        })
        .join("|");

    const newHash = generateHash(newResult);
    const prevHash = generateHash(prevContextFilteredRef.current);

    if (
      newIds === prevIds &&
      newHash === prevHash &&
      prevContextFilteredRef.current.length > 0
    ) {
      // STABILITY: When caching, check if any accepted questions need to be filtered
      // This prevents index jumps when status changes during heartbeat cycles
      if (newResult.length === prevContextFilteredRef.current.length) {
        return prevContextFilteredRef.current;
      }
    }

    // NOTE: We no longer pre-filter accepted questions in review mode.
    // The filter buttons (Pending/Accepted/Rejected/All) handle status filtering.
    // This allows the "Accepted" filter to work correctly and show accurate counts.

    prevContextFilteredRef.current = newResult;
    return newResult;
  }, [
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
  ]);

  // 2. Calculate counts based on UNIQUE questions per status
  // This ensures pill counts match what the user actually sees in the list
  const contextCounts = useMemo(() => {
    // Helper to get unique count for a specific status filter
    const getUniqueCountForStatus = (statusFilter) => {
      let filtered;
      if (statusFilter === "all") {
        filtered = contextFilteredQuestions;
      } else if (statusFilter === "pending") {
        filtered = contextFilteredQuestions.filter(
          (q) => !q.status || q.status === "pending"
        );
      } else if (statusFilter === "other") {
        filtered = contextFilteredQuestions.filter(
          (q) =>
            q.status &&
            q.status !== "pending" &&
            q.status !== "accepted" &&
            q.status !== "rejected"
        );
      } else {
        filtered = contextFilteredQuestions.filter(
          (q) => q.status === statusFilter
        );
      }
      // Apply same uniqueness logic as uniqueFilteredQuestions
      return createUniqueFilteredQuestions(filtered, language, allQuestionsMap)
        .length;
    };

    const pending = getUniqueCountForStatus("pending");
    const accepted = getUniqueCountForStatus("accepted");
    const rejected = getUniqueCountForStatus("rejected");
    const other = getUniqueCountForStatus("other");
    const all = getUniqueCountForStatus("all");

    // DIAGNOSTIC LOGGING: Identify mysterious statuses
    if (other > 0) {
      const otherStatuses = contextFilteredQuestions
        .filter(
          (q) =>
            q.status &&
            q.status !== "pending" &&
            q.status !== "accepted" &&
            q.status !== "rejected"
        )
        .reduce((acc, q) => {
          acc[q.status] = (acc[q.status] || 0) + 1;
          return acc;
        }, {});
      console.warn(
        "⚠️ [Count Discrepancy] Found non-standard statuses:",
        otherStatuses
      );
    }

    return { pending, accepted, rejected, other, all };
  }, [contextFilteredQuestions, language, allQuestionsMap]);

  // 3. Now apply the status filter for the actual view
  const filteredQuestions = useMemo(() => {
    if (filterMode === "all") return contextFilteredQuestions;
    return contextFilteredQuestions.filter((q) => {
      if (filterMode === "pending") return !q.status || q.status === "pending";
      if (filterMode === "other") {
        // "other" is a computed category - questions with non-standard statuses
        return (
          q.status &&
          q.status !== "pending" &&
          q.status !== "accepted" &&
          q.status !== "rejected"
        );
      }
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

    // C. Apply Stable Sort (Canonical Date = Earliest creation time of any variant in the group)
    // This ensures that translating a question (creating a newer variant)
    // does not cause the question card to jump to the top of the list.
    const getCanonicalDate = (q) => {
      if (!allQuestionsMap || !allQuestionsMap.has(q.uniqueId)) {
        // Fallback if map missing - use a static anchor (0) for stability
        const dateStr = q.created || q.dateAdded;
        return dateStr ? new Date(dateStr).getTime() : 0;
      }
      const variants = allQuestionsMap.get(q.uniqueId);
      // Find the earliest date among all variants to anchor the group's position
      // Use epoch 0 as absolute fallback for stability during hydration
      return Math.min(
        ...variants.map((v) => {
          const dateStr = v.created || v.dateAdded;
          return dateStr ? new Date(dateStr).getTime() : 0;
        })
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
  }, [filteredQuestions, language, allQuestionsMap]);
  // STABILITY: allQuestionsMap IS included now, but we've stabilized the date fallback.

  // STABILITY: Preserve current question position when the question list updates
  // This handles AI critiques, language switches, and remote syncs
  const lastKnownUniqueIdRef = useRef(null);
  const lastKnownIndexRef = useRef(currentReviewIndex);
  const lastKnownListRef = useRef(uniqueFilteredQuestions);

  useEffect(() => {
    const listRefChanged = uniqueFilteredQuestions !== lastKnownListRef.current;
    const indexChanged = currentReviewIndex !== lastKnownIndexRef.current;

    if (uniqueFilteredQuestions.length === 0) {
      lastKnownUniqueIdRef.current = null;
      lastKnownIndexRef.current = currentReviewIndex;
      lastKnownListRef.current = uniqueFilteredQuestions;
      return;
    }

    // A. Detect the current question's uniqueId
    const currentQ = uniqueFilteredQuestions[currentReviewIndex];
    const currentUniqueId = currentQ?.uniqueId;

    // B. If the user intentionally navigated, update our tracking and STOP
    if (indexChanged) {
      lastKnownUniqueIdRef.current = currentUniqueId;
      lastKnownIndexRef.current = currentReviewIndex;
      lastKnownListRef.current = uniqueFilteredQuestions;

      if (currentUniqueId) {
        localStorage.setItem("ue5_pref_last_id", currentUniqueId);
        setLastUniqueId(currentUniqueId);
      }
      return;
    }

    // DISABLED: This was causing position jumps when switching filters
    // The "same question" may be at a different index in a different filter's list
    // if (
    //   listRefChanged &&
    //   lastKnownUniqueIdRef.current &&
    //   lastKnownUniqueIdRef.current !== currentUniqueId
    // ) {
    //   const preservedIndex = uniqueFilteredQuestions.findIndex(
    //     (q) => q.uniqueId === lastKnownUniqueIdRef.current
    //   );
    //
    //   if (preservedIndex !== -1 && preservedIndex !== currentReviewIndex) {
    //     setCurrentReviewIndex(preservedIndex);
    //     lastKnownIndexRef.current = preservedIndex;
    //     lastKnownListRef.current = uniqueFilteredQuestions;
    //     return;
    //   }
    // }

    // D. Update tracking for next run
    if (currentUniqueId) {
      lastKnownUniqueIdRef.current = currentUniqueId;
      localStorage.setItem("ue5_pref_last_id", currentUniqueId);
      setLastUniqueId(currentUniqueId);
    }
    lastKnownIndexRef.current = currentReviewIndex;
    lastKnownListRef.current = uniqueFilteredQuestions;
  }, [uniqueFilteredQuestions, currentReviewIndex, setCurrentReviewIndex]);

  // ========================================================================
  // NAVIGATION RESTORATION & RESET
  // ========================================================================

  const hasRestoredRef = useRef(false);

  // 1. Reset review index when entering Review mode FROM another mode (not refresh)
  useEffect(() => {
    // skip reset if we are currently restoring from refresh
    if (hasRestoredRef.current) {
      if (
        appMode === "review" &&
        lastModeRef.current !== "review" &&
        lastModeRef.current !== "database"
      ) {
        console.log(
          "🔄 [useFiltering] Resetting review index: Entered Review mode"
        );
        setCurrentReviewIndex(0);
      }
    }
    lastModeRef.current = appMode;
  }, [appMode]);

  // 2. Reset review index when discipline changes (in review mode)
  useEffect(() => {
    // Only reset if we've already finished the initial restoration
    if (hasRestoredRef.current && appMode === "review") {
      console.log(
        "🔄 [useFiltering] Resetting review index: Discipline changed"
      );
      setCurrentReviewIndex(0);
    }
  }, [discipline, appMode]);

  // 3. Handle restoration on mount or mode change
  // TRIGGER: Now runs AFTER potential resets in the same render cycle
  useEffect(() => {
    if (
      appMode === "review" &&
      !hasRestoredRef.current &&
      uniqueFilteredQuestions.length > 0
    ) {
      // Small delay to ensure all questions from initial fetch are processed
      const savedId = localStorage.getItem("ue5_pref_last_id");
      const savedIndex = parseInt(
        localStorage.getItem("ue5_pref_review_index") || "0",
        10
      );

      console.log("🎯 [Restoration] Attempting restoration...", {
        savedId,
        savedIndex,
        listSize: uniqueFilteredQuestions.length,
      });

      if (savedId) {
        const idx = uniqueFilteredQuestions.findIndex(
          (q) => q.uniqueId === savedId
        );
        if (idx !== -1) {
          console.log(
            `🎯 [Restoration] Found saved question ${savedId} at index ${idx}`
          );
          setCurrentReviewIndex(idx);
          hasRestoredRef.current = true;
          return;
        }
      }

      if (savedIndex > 0 && savedIndex < uniqueFilteredQuestions.length) {
        console.log(
          `🎯 [Restoration] Falling back to saved index ${savedIndex}`
        );
        setCurrentReviewIndex(savedIndex);
      }
      hasRestoredRef.current = true;
    }
  }, [appMode, uniqueFilteredQuestions.length]);

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
    lastUniqueId,
    setLastUniqueId,

    // Computed values
    contextFilteredQuestions,
    contextCounts,
    filteredQuestions,
    uniqueFilteredQuestions,
  };
}
