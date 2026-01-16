/**
 * questionHistory - Tests for undo/redo history management
 * Uses jsdom environment for localStorage
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveQuestionHistory,
  getQuestionHistory,
  undoQuestionChange,
  redoQuestionChange,
  canUndo,
  canRedo,
  clearQuestionHistory,
  clearAllHistories,
} from "../questionHistory";

describe("questionHistory", () => {
  const testQuestionId = "test-q-123";

  beforeEach(() => {
    // Clear all localStorage before each test
    localStorage.clear();
  });

  describe("getQuestionHistory", () => {
    it("returns empty history for new question", () => {
      const history = getQuestionHistory("new-question");
      expect(history.states).toEqual([]);
      expect(history.currentIndex).toBe(-1);
    });
  });

  describe("saveQuestionHistory", () => {
    it("saves state to history", () => {
      const state = { question: "Test question?" };
      saveQuestionHistory(testQuestionId, state);

      const history = getQuestionHistory(testQuestionId);
      expect(history.states).toHaveLength(1);
      expect(history.states[0].state.question).toBe("Test question?");
    });

    it("saves multiple states", () => {
      saveQuestionHistory(testQuestionId, { question: "Version 1" });
      saveQuestionHistory(testQuestionId, { question: "Version 2" });
      saveQuestionHistory(testQuestionId, { question: "Version 3" });

      const history = getQuestionHistory(testQuestionId);
      expect(history.states).toHaveLength(3);
    });

    it("limits history to 10 states", () => {
      for (let i = 0; i < 15; i++) {
        saveQuestionHistory(testQuestionId, { question: `Version ${i}` });
      }

      const history = getQuestionHistory(testQuestionId);
      expect(history.states).toHaveLength(10);
      // Should keep last 10 (versions 5-14)
      expect(history.states[0].state.question).toBe("Version 5");
    });

    it("updates currentIndex to latest state", () => {
      saveQuestionHistory(testQuestionId, { question: "V1" });
      saveQuestionHistory(testQuestionId, { question: "V2" });

      const history = getQuestionHistory(testQuestionId);
      expect(history.currentIndex).toBe(1);
    });
  });

  describe("canUndo", () => {
    it("returns false when no history", () => {
      expect(canUndo(testQuestionId)).toBe(false);
    });

    it("returns false when only one state", () => {
      saveQuestionHistory(testQuestionId, { question: "Only state" });
      expect(canUndo(testQuestionId)).toBe(false);
    });

    it("returns true when multiple states exist", () => {
      saveQuestionHistory(testQuestionId, { question: "State 1" });
      saveQuestionHistory(testQuestionId, { question: "State 2" });
      expect(canUndo(testQuestionId)).toBe(true);
    });
  });

  describe("canRedo", () => {
    it("returns false when at latest state", () => {
      saveQuestionHistory(testQuestionId, { question: "State 1" });
      saveQuestionHistory(testQuestionId, { question: "State 2" });
      expect(canRedo(testQuestionId)).toBe(false);
    });

    it("returns true after undo", () => {
      saveQuestionHistory(testQuestionId, { question: "State 1" });
      saveQuestionHistory(testQuestionId, { question: "State 2" });
      undoQuestionChange(testQuestionId);
      expect(canRedo(testQuestionId)).toBe(true);
    });
  });

  describe("undoQuestionChange", () => {
    it("returns null when no history", () => {
      expect(undoQuestionChange(testQuestionId)).toBeNull();
    });

    it("returns previous state", () => {
      saveQuestionHistory(testQuestionId, { question: "State 1" });
      saveQuestionHistory(testQuestionId, { question: "State 2" });

      const state = undoQuestionChange(testQuestionId);
      expect(state.question).toBe("State 1");
    });

    it("updates currentIndex", () => {
      saveQuestionHistory(testQuestionId, { question: "State 1" });
      saveQuestionHistory(testQuestionId, { question: "State 2" });
      undoQuestionChange(testQuestionId);

      const history = getQuestionHistory(testQuestionId);
      expect(history.currentIndex).toBe(0);
    });
  });

  describe("redoQuestionChange", () => {
    it("returns null when at latest", () => {
      saveQuestionHistory(testQuestionId, { question: "State 1" });
      expect(redoQuestionChange(testQuestionId)).toBeNull();
    });

    it("returns next state after undo", () => {
      saveQuestionHistory(testQuestionId, { question: "State 1" });
      saveQuestionHistory(testQuestionId, { question: "State 2" });
      undoQuestionChange(testQuestionId);

      const state = redoQuestionChange(testQuestionId);
      expect(state.question).toBe("State 2");
    });
  });

  describe("clearQuestionHistory", () => {
    it("removes history for specific question", () => {
      saveQuestionHistory(testQuestionId, { question: "State 1" });
      clearQuestionHistory(testQuestionId);

      const history = getQuestionHistory(testQuestionId);
      expect(history.states).toEqual([]);
    });
  });

  describe("clearAllHistories", () => {
    it("removes all question histories", () => {
      saveQuestionHistory("q1", { question: "Q1" });
      saveQuestionHistory("q2", { question: "Q2" });
      clearAllHistories();

      expect(getQuestionHistory("q1").states).toEqual([]);
      expect(getQuestionHistory("q2").states).toEqual([]);
    });
  });
});
