/**
 * Tests for dateHelpers.js - Date formatting utilities
 */
import { describe, it, expect } from "vitest";
import { formatDate } from "../dateHelpers";

describe("dateHelpers utilities", () => {
  describe("formatDate", () => {
    it("should format a date in YYYY-MM-DD format", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      const result = formatDate(date);
      expect(result).toBe("2024-01-15");
    });

    it("should pad single-digit months with zero", () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      const result = formatDate(date);
      expect(result).toBe("2024-06-15");
    });

    it("should pad single-digit days with zero", () => {
      const date = new Date(2024, 11, 5); // December 5, 2024
      const result = formatDate(date);
      expect(result).toBe("2024-12-05");
    });

    it("should handle first day of year", () => {
      const date = new Date(2024, 0, 1); // January 1, 2024
      const result = formatDate(date);
      expect(result).toBe("2024-01-01");
    });

    it("should handle last day of year", () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      const result = formatDate(date);
      expect(result).toBe("2024-12-31");
    });

    it("should return current date when called without arguments", () => {
      const result = formatDate();
      // Should match YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle double-digit months correctly", () => {
      const date = new Date(2024, 10, 15); // November 15, 2024
      const result = formatDate(date);
      expect(result).toBe("2024-11-15");
    });

    it("should handle leap year February 29", () => {
      const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      const result = formatDate(date);
      expect(result).toBe("2024-02-29");
    });
  });
});
