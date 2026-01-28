import { useState } from "react";
import { STORAGE_KEYS } from "../utils/constants";

/**
 * useFilterState Hook
 *
 * Manages the basic filter state values for the question list.
 * Handles initial hydration from localStorage for persistence across sessions.
 *
 * @param {string} appMode - Current app mode ('create', 'review', 'database', etc.)
 * @returns {Object} Filter state values and their setters
 */
export function useFilterState(appMode) {
  // ========================================================================
  // SEARCH & FILTER STATE
  // ========================================================================

  const [searchTerm, setSearchTerm] = useState(
    () => localStorage.getItem(STORAGE_KEYS.PREF_SEARCH) || ""
  );

  const [filterMode, setFilterMode] = useState(
    () => localStorage.getItem(STORAGE_KEYS.PREF_FILTER) || "pending"
  );

  const [showHistory, setShowHistory] = useState(
    () => localStorage.getItem(STORAGE_KEYS.PREF_HISTORY) === "true"
  );

  const [filterByCreator, setFilterByCreator] = useState(false);
  const [filterTags, setFilterTags] = useState([]);
  const [filterScoreTier, setFilterScoreTier] = useState(""); // '', 'exceptional', 'very-good', 'good', 'adequate', 'needs-work'
  const [filterByReviewer, setFilterByReviewer] = useState(""); // Filter by specific reviewer name
  const [sortBy, setSortBy] = useState("default");

  // ========================================================================
  // NAVIGATION STATE
  // ========================================================================

  // PERSISTED NAVIGATION: Survive page refreshes
  const [currentReviewIndex, setCurrentReviewIndex] = useState(() => {
    if (appMode !== "review") return 0;
    const saved = localStorage.getItem(STORAGE_KEYS.PREF_REVIEW_INDEX);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Track the uniqueId of the current question for better cross-refresh restoration
  const [lastUniqueId, setLastUniqueId] = useState(
    () => localStorage.getItem(STORAGE_KEYS.PREF_LAST_ID) || null
  );

  // ========================================================================
  // RETURN
  // ========================================================================
  return {
    // Search & Filter
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
    filterScoreTier,
    setFilterScoreTier,
    filterByReviewer,
    setFilterByReviewer,
    sortBy,
    setSortBy,

    // Navigation
    currentReviewIndex,
    setCurrentReviewIndex,
    lastUniqueId,
    setLastUniqueId,
  };
}
