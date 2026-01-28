import { useMemo, useRef } from "react";
import {
  createFilteredQuestions,
  createUniqueFilteredQuestions,
} from "../utils/questionFilters";
import { logger } from "../utils/logger";

/**
 * useFilteredQuestions Hook
 *
 * Handles the core filtering, sorting, and deduplication logic for questions.
 * Includes stability optimizations to prevent unnecessary re-renders.
 *
 * @param {Object} params - Hook parameters
 * @param {Array} params.questions - Current session questions
 * @param {Array} params.historicalQuestions - Historical questions from cloud
 * @param {Object} params.config - App configuration
 * @param {string} params.appMode - Current app mode
 * @param {Map} params.allQuestionsMap - Map of all questions by uniqueId
 * @param {Object} params.filterState - Current filter state values
 * @returns {Object} Filtered question lists and counts
 */
export function useFilteredQuestions({
  questions,
  historicalQuestions,
  config,
  appMode,
  allQuestionsMap,
  filterState,
}) {
  // Destructure config for stable dependency tracking
  const { creatorName, discipline, difficulty, type, language } = config;

  // Destructure filter state
  const {
    searchTerm,
    filterMode,
    showHistory,
    filterByCreator,
    filterTags,
    filterScoreTier,
    filterByReviewer,
  } = filterState;

  // ========================================================================
  // STABILITY OPTIMIZATION
  // ========================================================================

  // Track previous results to avoid unnecessary re-renders
  const prevContextFilteredRef = useRef([]);

  // ========================================================================
  // COMPUTED: Context Filtered Questions (all filters except status)
  // ========================================================================

  const contextFilteredQuestions = useMemo(() => {
    const newResult = createFilteredQuestions(
      questions,
      historicalQuestions,
      showHistory || appMode === "review" || appMode === "create",
      "all", // Ignore status for this intermediate list
      filterByCreator,
      searchTerm,
      creatorName,
      discipline,
      appMode === "review" ? null : difficulty,
      appMode === "review" ? null : type,
      language,
      filterTags,
      filterScoreTier,
      filterByReviewer
    );

    // Stability check - only return new array if content changed
    const newIds = newResult.map((q) => q.id || q.uniqueId).join(",");
    const prevIds = prevContextFilteredRef.current
      .map((q) => q.id || q.uniqueId)
      .join(",");

    // Generate hash to detect meaningful changes
    const generateHash = (list) =>
      list
        .map((q) => {
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
      if (newResult.length === prevContextFilteredRef.current.length) {
        return prevContextFilteredRef.current;
      }
    }

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
    filterByReviewer,
  ]);

  // ========================================================================
  // COMPUTED: Context Counts (unique count per status)
  // ========================================================================

  const contextCounts = useMemo(() => {
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
      return createUniqueFilteredQuestions(filtered, language, allQuestionsMap)
        .length;
    };

    const pending = getUniqueCountForStatus("pending");
    const accepted = getUniqueCountForStatus("accepted");
    const rejected = getUniqueCountForStatus("rejected");
    const other = getUniqueCountForStatus("other");
    const all = getUniqueCountForStatus("all");

    // Diagnostic logging for non-standard statuses
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
      logger.warn(
        "⚠️ [Count Discrepancy] Found non-standard statuses:",
        otherStatuses
      );
    }

    return { pending, accepted, rejected, other, all };
  }, [contextFilteredQuestions, language, allQuestionsMap]);

  // ========================================================================
  // COMPUTED: Unique Reviewers
  // ========================================================================

  const uniqueReviewers = useMemo(() => {
    const reviewerSet = new Set();

    const normalizeReviewer = (name) => {
      if (!name || name === "Unknown" || name.trim() === "") return null;
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

    questions.forEach((q) => {
      [q.humanVerifiedBy, q.acceptedBy, q.reviewerName].forEach((r) => {
        const normalized = normalizeReviewer(r);
        if (normalized) {
          reviewerSet.add(normalized);
        }
      });
    });

    return Array.from(reviewerSet).sort();
  }, [questions]);

  // ========================================================================
  // COMPUTED: Status Filtered Questions
  // ========================================================================

  const filteredQuestions = useMemo(() => {
    if (filterMode === "all") return contextFilteredQuestions;
    return contextFilteredQuestions.filter((q) => {
      if (filterMode === "pending") return !q.status || q.status === "pending";
      if (filterMode === "other") {
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

  // ========================================================================
  // COMPUTED: Unique Filtered Questions (sorted)
  // ========================================================================

  const uniqueFilteredQuestions = useMemo(() => {
    const result = createUniqueFilteredQuestions(
      filteredQuestions,
      language,
      allQuestionsMap
    );

    // Get canonical date for stable sorting
    const getCanonicalDate = (q) => {
      if (!allQuestionsMap || !allQuestionsMap.has(q.uniqueId)) {
        const dateStr = q.created || q.dateAdded;
        return dateStr ? new Date(dateStr).getTime() : 0;
      }
      const variants = allQuestionsMap.get(q.uniqueId);
      return Math.min(
        ...variants.map((v) => {
          const dateStr = v.created || v.dateAdded;
          return dateStr ? new Date(dateStr).getTime() : 0;
        })
      );
    };

    // Pre-calculate dates for sorting
    const dateMap = new Map();
    result.forEach((q) => dateMap.set(q.uniqueId, getCanonicalDate(q)));

    // Sort: Newest Original First with uniqueId tiebreaker
    return result.sort((a, b) => {
      const dateA = dateMap.get(a.uniqueId);
      const dateB = dateMap.get(b.uniqueId);

      if (dateB !== dateA) {
        return dateB - dateA;
      }

      return (a.uniqueId || "").localeCompare(b.uniqueId || "");
    });
  }, [filteredQuestions, language, allQuestionsMap]);

  // ========================================================================
  // RETURN
  // ========================================================================

  return {
    contextFilteredQuestions,
    contextCounts,
    filteredQuestions,
    uniqueFilteredQuestions,
    uniqueReviewers,
  };
}
