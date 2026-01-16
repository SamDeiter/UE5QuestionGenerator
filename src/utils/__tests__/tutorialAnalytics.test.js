/**
 * tutorialAnalytics - Tests for tutorial event tracking
 * Uses jsdom environment for localStorage
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  logTutorialEvent,
  getTutorialEvents,
  clearTutorialEvents,
  getTutorialStats,
  TUTORIAL_EVENTS,
} from "../tutorialAnalytics";

describe("tutorialAnalytics", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("TUTORIAL_EVENTS", () => {
    it("has expected event types", () => {
      expect(TUTORIAL_EVENTS.STARTED).toBe("tutorial_started");
      expect(TUTORIAL_EVENTS.COMPLETED).toBe("tutorial_completed");
      expect(TUTORIAL_EVENTS.SKIPPED).toBe("tutorial_skipped");
    });
  });

  describe("logTutorialEvent", () => {
    it("logs event to localStorage", () => {
      logTutorialEvent(TUTORIAL_EVENTS.STARTED, { scenarioId: "demo" });
      const events = getTutorialEvents();
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe("tutorial_started");
    });

    it("includes timestamp", () => {
      logTutorialEvent(TUTORIAL_EVENTS.STARTED, { scenarioId: "demo" });
      const events = getTutorialEvents();
      expect(events[0].timestamp).toBeDefined();
    });

    it("preserves payload data", () => {
      logTutorialEvent(TUTORIAL_EVENTS.STEP_CHANGED, {
        scenarioId: "demo",
        stepId: "step1",
        stepIndex: 0,
      });
      const events = getTutorialEvents();
      expect(events[0].scenarioId).toBe("demo");
      expect(events[0].stepId).toBe("step1");
    });

    it("limits to 100 events", () => {
      for (let i = 0; i < 110; i++) {
        logTutorialEvent(TUTORIAL_EVENTS.STEP_CHANGED, { stepIndex: i });
      }
      const events = getTutorialEvents();
      expect(events).toHaveLength(100);
    });
  });

  describe("getTutorialEvents", () => {
    it("returns empty array when no events", () => {
      expect(getTutorialEvents()).toEqual([]);
    });

    it("returns all logged events", () => {
      logTutorialEvent(TUTORIAL_EVENTS.STARTED, { scenarioId: "demo1" });
      logTutorialEvent(TUTORIAL_EVENTS.COMPLETED, { scenarioId: "demo1" });
      expect(getTutorialEvents()).toHaveLength(2);
    });
  });

  describe("clearTutorialEvents", () => {
    it("removes all events", () => {
      logTutorialEvent(TUTORIAL_EVENTS.STARTED, { scenarioId: "demo" });
      clearTutorialEvents();
      expect(getTutorialEvents()).toEqual([]);
    });
  });

  describe("getTutorialStats", () => {
    it("returns zero counts when no events", () => {
      const stats = getTutorialStats();
      expect(stats.totalStarts).toBe(0);
      expect(stats.totalCompletions).toBe(0);
    });

    it("counts starts and completions", () => {
      logTutorialEvent(TUTORIAL_EVENTS.STARTED, { scenarioId: "demo" });
      logTutorialEvent(TUTORIAL_EVENTS.STARTED, { scenarioId: "demo" });
      logTutorialEvent(TUTORIAL_EVENTS.COMPLETED, { scenarioId: "demo" });

      const stats = getTutorialStats();
      expect(stats.totalStarts).toBe(2);
      expect(stats.totalCompletions).toBe(1);
    });

    it("groups by scenario", () => {
      logTutorialEvent(TUTORIAL_EVENTS.STARTED, { scenarioId: "demo1" });
      logTutorialEvent(TUTORIAL_EVENTS.STARTED, { scenarioId: "demo2" });
      logTutorialEvent(TUTORIAL_EVENTS.COMPLETED, { scenarioId: "demo1" });

      const stats = getTutorialStats();
      expect(stats.byScenario.demo1.starts).toBe(1);
      expect(stats.byScenario.demo1.completions).toBe(1);
      expect(stats.byScenario.demo2.starts).toBe(1);
    });

    it("counts element not found events", () => {
      logTutorialEvent(TUTORIAL_EVENTS.ELEMENT_NOT_FOUND, {
        scenarioId: "demo",
        stepId: "step1",
      });

      const stats = getTutorialStats();
      expect(stats.elementNotFoundCount).toBe(1);
    });
  });
});
