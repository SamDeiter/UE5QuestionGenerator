import { create } from "zustand";

/**
 * Question domain store — the single source of truth for `allQuestions`.
 *
 * Deliberately minimal: it holds the raw array and a React-`useState`-compatible
 * setter (accepts a value OR an updater function). All hydration, persistence,
 * and backfill side effects continue to live in the `useQuestionState` hook so
 * the store stays free of constants and lifecycle coupling — this keeps the
 * existing useQuestionState tests (which mock `../utils/constants`) valid.
 */

const applyUpdate = (next, prev) =>
  typeof next === "function" ? next(prev) : next;

export const useQuestionStore = create((set) => ({
  allQuestions: [],
  setAllQuestions: (next) =>
    set((s) => ({ allQuestions: applyUpdate(next, s.allQuestions) })),
}));

/** Test helper: reset to the initial data state (actions are preserved). */
export const resetQuestionStore = () =>
  useQuestionStore.setState({ allQuestions: [] });
