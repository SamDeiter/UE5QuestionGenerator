/**
 * Tests for scoreColors.js - Score-based styling utilities
 */
import { describe, it, expect } from "vitest";
import { getScoreColorClasses, getSeverityStyles } from "../scoreColors";

describe("scoreColors utilities", () => {
  describe("getScoreColorClasses", () => {
    it("should return green classes for excellent scores (90+)", () => {
      const result = getScoreColorClasses(95);
      expect(result).toContain("green");
      expect(result).toContain("bg-");
      expect(result).toContain("border-");
      expect(result).toContain("text-");
    });

    it("should return yellow classes for passing scores (70-89)", () => {
      const result = getScoreColorClasses(75);
      expect(result).toContain("yellow");
    });

    it("should return orange classes for mediocre scores (50-69)", () => {
      const result = getScoreColorClasses(55);
      expect(result).toContain("orange");
    });

    it("should return red classes for critical scores (0-49)", () => {
      const result = getScoreColorClasses(30);
      expect(result).toContain("red");
    });

    it("should handle boundary value 90 as excellent", () => {
      const result = getScoreColorClasses(90);
      expect(result).toContain("green");
    });

    it("should handle boundary value 70 as passing", () => {
      const result = getScoreColorClasses(70);
      expect(result).toContain("yellow");
    });

    it("should handle boundary value 50 as mediocre", () => {
      const result = getScoreColorClasses(50);
      expect(result).toContain("orange");
    });

    it("should handle zero score as critical", () => {
      const result = getScoreColorClasses(0);
      expect(result).toContain("red");
    });
  });

  describe("getSeverityStyles", () => {
    it("should return an object with bg, border, text, and icon properties", () => {
      const result = getSeverityStyles(75);
      expect(result).toHaveProperty("bg");
      expect(result).toHaveProperty("border");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("icon");
    });

    it('should return "Excellent" label for scores 90+', () => {
      const result = getSeverityStyles(95);
      expect(result.label).toBe("Excellent");
      expect(result.bg).toContain("emerald");
    });

    it('should return "Good" label for scores 70-89', () => {
      const result = getSeverityStyles(80);
      expect(result.label).toBe("Good");
      expect(result.bg).toContain("yellow");
    });

    it('should return "Mediocre" label for scores 50-69', () => {
      const result = getSeverityStyles(60);
      expect(result.label).toBe("Mediocre");
      expect(result.bg).toContain("orange");
    });

    it('should return "Critical" label for scores below 50', () => {
      const result = getSeverityStyles(25);
      expect(result.label).toBe("Critical");
      expect(result.bg).toContain("red");
    });

    it("should handle null score gracefully", () => {
      const result = getSeverityStyles(null);
      expect(result.bg).toContain("slate");
      expect(result.label).toBeUndefined();
    });

    it("should handle undefined score gracefully", () => {
      const result = getSeverityStyles(undefined);
      expect(result.bg).toContain("slate");
    });

    it("should handle perfect score of 100", () => {
      const result = getSeverityStyles(100);
      expect(result.label).toBe("Excellent");
    });
  });
});
