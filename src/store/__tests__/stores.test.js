import { describe, it, expect, beforeEach } from "vitest";
import { useQuestionStore, resetQuestionStore } from "../questionStore";
import { useAppConfigStore, hydrateAppConfigStore } from "../appConfigStore";
import { useFilterStore, hydrateFilterStore } from "../filterStore";

describe("domain stores", () => {
  beforeEach(() => {
    localStorage.clear();
    resetQuestionStore();
    hydrateAppConfigStore();
    hydrateFilterStore();
  });

  describe("questionStore", () => {
    it("starts empty and accepts a plain value", () => {
      expect(useQuestionStore.getState().allQuestions).toEqual([]);
      useQuestionStore.getState().setAllQuestions([{ id: 1 }]);
      expect(useQuestionStore.getState().allQuestions).toEqual([{ id: 1 }]);
    });

    it("supports functional updater form (useState parity)", () => {
      useQuestionStore.getState().setAllQuestions([{ id: 1 }]);
      useQuestionStore
        .getState()
        .setAllQuestions((prev) => [...prev, { id: 2 }]);
      expect(useQuestionStore.getState().allQuestions).toHaveLength(2);
    });

    it("reset returns to empty", () => {
      useQuestionStore.getState().setAllQuestions([{ id: 1 }]);
      resetQuestionStore();
      expect(useQuestionStore.getState().allQuestions).toEqual([]);
    });
  });

  describe("appConfigStore", () => {
    it("setConfig supports value and updater forms", () => {
      useAppConfigStore.getState().setConfig({ language: "Spanish" });
      expect(useAppConfigStore.getState().config.language).toBe("Spanish");
      useAppConfigStore
        .getState()
        .setConfig((prev) => ({ ...prev, language: "French" }));
      expect(useAppConfigStore.getState().config.language).toBe("French");
    });

    it("setAppMode updates mode", () => {
      useAppConfigStore.getState().setAppMode("create");
      expect(useAppConfigStore.getState().appMode).toBe("create");
    });
  });

  describe("filterStore", () => {
    it("defaults match the legacy useFilterState", () => {
      const s = useFilterStore.getState();
      expect(s.filterMode).toBe("pending");
      expect(s.sortBy).toBe("default");
      expect(s.filterTags).toEqual([]);
      expect(s.currentReviewIndex).toBe(0);
    });

    it("setters accept value and updater forms", () => {
      useFilterStore.getState().setSearchTerm("lumen");
      expect(useFilterStore.getState().searchTerm).toBe("lumen");
      useFilterStore.getState().setCurrentReviewIndex((i) => i + 3);
      expect(useFilterStore.getState().currentReviewIndex).toBe(3);
    });
  });
});
