import { create } from "zustand";
import { STORAGE_KEYS, APP_MODES } from "../utils/constants";
import { resolveInitialAppMode } from "./appConfigStore";

/**
 * Filter + review-navigation store — source of truth for the values that used
 * to live in `useFilterState`. Search/filter/history hydrate from localStorage;
 * `currentReviewIndex` hydrates only in review mode, mirroring the old hook.
 *
 * The persistence side (writing prefs back to localStorage) continues to live in
 * `useFilterPersistence`. Setters are React-`useState`-compatible (value OR fn).
 */

const applyUpdate = (next, prev) =>
  typeof next === "function" ? next(prev) : next;

const getLS = (key) =>
  typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;

const createInitialState = () => ({
  // Search & filter
  searchTerm: getLS(STORAGE_KEYS.PREF_SEARCH) || "",
  filterMode: getLS(STORAGE_KEYS.PREF_FILTER) || "pending",
  showHistory: getLS(STORAGE_KEYS.PREF_HISTORY) === "true",
  filterByCreator: false,
  filterTags: [],
  filterScoreTier: "",
  filterByReviewer: "",
  sortBy: "default",

  // Navigation (persisted across refreshes, review mode only)
  currentReviewIndex:
    resolveInitialAppMode() === APP_MODES.REVIEW
      ? parseInt(getLS(STORAGE_KEYS.PREF_REVIEW_INDEX) || "0", 10) || 0
      : 0,
  lastUniqueId: getLS(STORAGE_KEYS.PREF_LAST_ID) || null,
});

export const useFilterStore = create((set) => ({
  ...createInitialState(),

  setSearchTerm: (next) =>
    set((s) => ({ searchTerm: applyUpdate(next, s.searchTerm) })),
  setFilterMode: (next) =>
    set((s) => ({ filterMode: applyUpdate(next, s.filterMode) })),
  setShowHistory: (next) =>
    set((s) => ({ showHistory: applyUpdate(next, s.showHistory) })),
  setFilterByCreator: (next) =>
    set((s) => ({ filterByCreator: applyUpdate(next, s.filterByCreator) })),
  setFilterTags: (next) =>
    set((s) => ({ filterTags: applyUpdate(next, s.filterTags) })),
  setFilterScoreTier: (next) =>
    set((s) => ({ filterScoreTier: applyUpdate(next, s.filterScoreTier) })),
  setFilterByReviewer: (next) =>
    set((s) => ({ filterByReviewer: applyUpdate(next, s.filterByReviewer) })),
  setSortBy: (next) => set((s) => ({ sortBy: applyUpdate(next, s.sortBy) })),
  setCurrentReviewIndex: (next) =>
    set((s) => ({
      currentReviewIndex: applyUpdate(next, s.currentReviewIndex),
    })),
  setLastUniqueId: (next) =>
    set((s) => ({ lastUniqueId: applyUpdate(next, s.lastUniqueId) })),
}));

/** Test helper: re-read storage and reset data state (actions preserved). */
export const hydrateFilterStore = () =>
  useFilterStore.setState(createInitialState());
