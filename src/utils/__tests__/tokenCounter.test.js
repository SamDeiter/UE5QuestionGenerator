/**
 * tokenCounter - Tests for token estimation and cost calculation
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  calculateCost,
  formatCost,
  checkTokenLimit,
  getTokenWarningLevel,
  analyzeRequest,
  summarizeAnalysis,
  compareAnalyses,
} from "../tokenCounter";

describe("tokenCounter", () => {
  describe("estimateTokens", () => {
    it("returns 0 for empty/null text", () => {
      expect(estimateTokens(null)).toBe(0);
      expect(estimateTokens("")).toBe(0);
      expect(estimateTokens(undefined)).toBe(0);
    });

    it("estimates tokens as ~4 chars per token", () => {
      const text = "a".repeat(100);
      expect(estimateTokens(text)).toBe(25);
    });

    it("rounds up", () => {
      const text = "abc"; // 3 chars
      expect(estimateTokens(text)).toBe(1);
    });
  });

  describe("calculateCost", () => {
    it("calculates cost for gemini-2.5-flash", () => {
      // 1M input + 1M output at flash pricing
      const cost = calculateCost(1000000, 1000000, "gemini-2.5-flash");
      expect(cost).toBeCloseTo(2.8, 3);
    });

    it("uses default model if not specified", () => {
      const cost = calculateCost(1000, 1000);
      expect(cost).toBeGreaterThan(0);
    });

    it("falls back to flash pricing for unknown model", () => {
      const cost = calculateCost(1000000, 1000000, "unknown-model");
      expect(cost).toBeCloseTo(2.8, 3);
    });
  });

  describe("formatCost", () => {
    it("formats small costs in thousandths", () => {
      const result = formatCost(0.005);
      expect(result).toContain("k"); // Shows in thousandths
    });

    it("formats larger costs normally", () => {
      const result = formatCost(1.2345);
      expect(result).toBe("$1.2345");
    });
  });

  describe("checkTokenLimit", () => {
    it("returns withinLimit true for small counts", () => {
      const result = checkTokenLimit(1000, "input");
      expect(result.withinLimit).toBe(true);
    });

    it("calculates percentage correctly", () => {
      const result = checkTokenLimit(500000, "input", "gemini-2.5-flash");
      expect(result.percentage).toBe(50);
    });

    it("returns withinLimit false when over limit", () => {
      const result = checkTokenLimit(2000000, "input", "gemini-2.5-flash");
      expect(result.withinLimit).toBe(false);
    });
  });

  describe("getTokenWarningLevel", () => {
    it("returns none for low usage", () => {
      expect(getTokenWarningLevel(100, "input")).toBe("none");
    });

    it("returns warning at 70%+", () => {
      expect(getTokenWarningLevel(750000, "input", "gemini-2.5-flash")).toBe(
        "warning"
      );
    });

    it("returns danger at 90%+", () => {
      expect(getTokenWarningLevel(950000, "input", "gemini-2.5-flash")).toBe(
        "danger"
      );
    });
  });

  describe("analyzeRequest", () => {
    it("returns complete analysis object", () => {
      const result = analyzeRequest("System prompt", "User prompt", 2000);
      expect(result).toHaveProperty("input");
      expect(result).toHaveProperty("output");
      expect(result).toHaveProperty("cost");
      expect(result).toHaveProperty("model");
    });

    it("calculates input tokens correctly", () => {
      const result = analyzeRequest("system", "user");
      expect(result.input.system).toBeGreaterThan(0);
      expect(result.input.user).toBeGreaterThan(0);
      expect(result.input.total).toBe(result.input.system + result.input.user);
    });
  });

  describe("summarizeAnalysis", () => {
    it("returns human-readable summary", () => {
      const analysis = analyzeRequest("System", "User", 2000);
      const summary = summarizeAnalysis(analysis);
      expect(summary).toContain("Token Usage:");
      expect(summary).toContain("$");
    });
  });

  describe("compareAnalyses", () => {
    it("calculates reduction correctly", () => {
      const before = analyzeRequest(
        "Long system prompt here",
        "Long user prompt",
        2000
      );
      const after = analyzeRequest("Short", "Short", 1000);
      const comparison = compareAnalyses(before, after);

      expect(comparison.input.reduction).toBeGreaterThan(0);
      expect(comparison.cost.savings).toBeGreaterThan(0);
    });

    it("calculates percentage reduction", () => {
      const before = analyzeRequest("x".repeat(1000), "", 2000);
      const after = analyzeRequest("x".repeat(500), "", 2000);
      const comparison = compareAnalyses(before, after);

      expect(comparison.input.percentage).toBe(50);
    });
  });
});
