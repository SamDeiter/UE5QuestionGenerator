/**
 * tokenCounter - Tests for token estimation and cost calculation
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import { estimateTokens, analyzeRequest } from "../tokenCounter";

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
});
