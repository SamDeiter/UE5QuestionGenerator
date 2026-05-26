/**
 * tutorialAnalytics - Tests for tutorial event tracking
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { logTutorialEvent, TUTORIAL_EVENTS } from "../tutorialAnalytics";

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
      const raw = localStorage.getItem("ue5_tutorial_events");
      const events = JSON.parse(raw);
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe("tutorial_started");
    });

    it("includes timestamp", () => {
      logTutorialEvent(TUTORIAL_EVENTS.STARTED, { scenarioId: "demo" });
      const events = JSON.parse(localStorage.getItem("ue5_tutorial_events"));
      expect(events[0].timestamp).toBeDefined();
    });

    it("preserves payload data", () => {
      logTutorialEvent(TUTORIAL_EVENTS.STEP_CHANGED, {
        scenarioId: "demo",
        stepId: "step1",
        stepIndex: 0,
      });
      const events = JSON.parse(localStorage.getItem("ue5_tutorial_events"));
      expect(events[0].scenarioId).toBe("demo");
      expect(events[0].stepId).toBe("step1");
    });

    it("limits to 100 events", () => {
      for (let i = 0; i < 110; i++) {
        logTutorialEvent(TUTORIAL_EVENTS.STEP_CHANGED, { stepIndex: i });
      }
      const events = JSON.parse(localStorage.getItem("ue5_tutorial_events"));
      expect(events).toHaveLength(100);
    });
  });
});
