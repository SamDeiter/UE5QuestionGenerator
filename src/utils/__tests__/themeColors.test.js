/**
 * themeColors - Tests for color utility functions
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import {
  getScoreTier,
  getScoreColor,
  getStatusColor,
  getLockColor,
  getEventColor,
  getActionColor,
  getSeverityStylesFromScore,
  SCORE_TIERS,
} from "../themeColors";

describe("themeColors", () => {
  describe("SCORE_TIERS", () => {
    it("exports all tier constants", () => {
      expect(SCORE_TIERS.EXCEPTIONAL).toBe("exceptional");
      expect(SCORE_TIERS.VERY_GOOD).toBe("veryGood");
      expect(SCORE_TIERS.GOOD).toBe("good");
      expect(SCORE_TIERS.ADEQUATE).toBe("adequate");
      expect(SCORE_TIERS.NEEDS_WORK).toBe("needsWork");
    });
  });

  describe("getScoreTier", () => {
    it("returns exceptional for 90-100", () => {
      expect(getScoreTier(90)).toBe(SCORE_TIERS.EXCEPTIONAL);
      expect(getScoreTier(100)).toBe(SCORE_TIERS.EXCEPTIONAL);
      expect(getScoreTier(95)).toBe(SCORE_TIERS.EXCEPTIONAL);
    });

    it("returns veryGood for 80-89", () => {
      expect(getScoreTier(80)).toBe(SCORE_TIERS.VERY_GOOD);
      expect(getScoreTier(89)).toBe(SCORE_TIERS.VERY_GOOD);
    });

    it("returns good for 70-79", () => {
      expect(getScoreTier(70)).toBe(SCORE_TIERS.GOOD);
      expect(getScoreTier(79)).toBe(SCORE_TIERS.GOOD);
    });

    it("returns adequate for 60-69", () => {
      expect(getScoreTier(60)).toBe(SCORE_TIERS.ADEQUATE);
      expect(getScoreTier(69)).toBe(SCORE_TIERS.ADEQUATE);
    });

    it("returns needsWork for 0-59", () => {
      expect(getScoreTier(0)).toBe(SCORE_TIERS.NEEDS_WORK);
      expect(getScoreTier(59)).toBe(SCORE_TIERS.NEEDS_WORK);
    });

    it("handles null/undefined input", () => {
      expect(getScoreTier(null)).toBe(SCORE_TIERS.NEEDS_WORK);
      expect(getScoreTier(undefined)).toBe(SCORE_TIERS.NEEDS_WORK);
    });
  });

  describe("getScoreColor", () => {
    it("returns color classes for exceptional tier", () => {
      const result = getScoreColor(SCORE_TIERS.EXCEPTIONAL, false, "full");
      expect(result).toContain("green");
    });

    it("returns colorblind variant when requested", () => {
      const result = getScoreColor(SCORE_TIERS.EXCEPTIONAL, true, "full");
      expect(result).toContain("blue");
    });

    it("returns specific property when requested", () => {
      const bg = getScoreColor(SCORE_TIERS.GOOD, false, "bg");
      expect(bg).toContain("bg-");
    });
  });

  describe("getStatusColor", () => {
    it("returns color for accepted status", () => {
      const result = getStatusColor("accepted", false);
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("returns color for rejected status", () => {
      const result = getStatusColor("rejected", false);
      expect(result).toBeDefined();
    });

    it("returns color for pending status", () => {
      const result = getStatusColor("pending", false);
      expect(result).toBeDefined();
    });

    it("returns colorblind variant", () => {
      const normal = getStatusColor("accepted", false);
      const colorblind = getStatusColor("accepted", true);
      expect(normal).toBeDefined();
      expect(colorblind).toBeDefined();
    });
  });

  describe("getLockColor", () => {
    it("returns hasLock color when user has lock", () => {
      const result = getLockColor(true, false, false, "container");
      expect(result).toContain("green");
    });

    it("returns isLocked color when someone else has lock", () => {
      const result = getLockColor(false, true, false, "container");
      expect(result).toContain("red");
    });

    it("returns default color when no lock", () => {
      const result = getLockColor(false, false, false, "container");
      expect(result).toBeDefined();
    });
  });

  describe("getEventColor", () => {
    it("returns color for generation event", () => {
      const result = getEventColor("generation", false);
      expect(result).toBeDefined();
    });

    it("returns color for critique event", () => {
      const result = getEventColor("critique", false);
      expect(result).toBeDefined();
    });

    it("handles unknown events", () => {
      const result = getEventColor("unknown-event", false);
      expect(result).toBeDefined();
    });
  });

  describe("getActionColor", () => {
    it("returns color for success action", () => {
      const result = getActionColor("success", false);
      expect(result).toContain("green");
    });

    it("returns color for danger action", () => {
      const result = getActionColor("danger", false);
      expect(result).toContain("red");
    });

    it("returns colorblind variant for success", () => {
      const result = getActionColor("success", true);
      expect(result).toContain("blue");
    });
  });

  describe("getSeverityStylesFromScore", () => {
    it("returns excellent styles for high scores", () => {
      const result = getSeverityStylesFromScore(95, false);
      expect(result).toHaveProperty("bg");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("border");
      expect(result.label).toBe("Excellent");
    });

    it("returns critical styles for low scores", () => {
      const result = getSeverityStylesFromScore(30, false);
      expect(result.label).toBe("Critical");
    });

    it("returns unknown styles for null score", () => {
      const result = getSeverityStylesFromScore(null, false);
      expect(result.label).toBe("Unknown");
    });

    it("returns colorblind variants", () => {
      const result = getSeverityStylesFromScore(95, true);
      expect(result).toHaveProperty("bg");
    });
  });
});
