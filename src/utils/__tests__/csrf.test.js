/**
 * csrf - Tests for CSRF protection utilities
 * Tests token generation, validation, and header management
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  getCSRFToken,
  validateCSRFToken,
  refreshCSRFToken,
  addCSRFHeader,
} from "../csrf";

describe("csrf", () => {
  describe("getCSRFToken", () => {
    it("returns a string token", () => {
      const token = getCSRFToken();
      expect(typeof token).toBe("string");
    });

    it("returns consistent token on multiple calls", () => {
      const token1 = getCSRFToken();
      const token2 = getCSRFToken();
      expect(token1).toBe(token2);
    });

    it("returns 64-character hex string", () => {
      const token = getCSRFToken();
      expect(token.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
  });

  describe("validateCSRFToken", () => {
    it("returns true for valid token", () => {
      const token = getCSRFToken();
      expect(validateCSRFToken(token)).toBe(true);
    });

    it("returns false for invalid token", () => {
      expect(validateCSRFToken("invalid-token")).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(validateCSRFToken(null)).toBe(false);
      expect(validateCSRFToken(undefined)).toBe(false);
    });
  });

  describe("refreshCSRFToken", () => {
    it("returns a new token", () => {
      const oldToken = getCSRFToken();
      const newToken = refreshCSRFToken();
      expect(newToken).not.toBe(oldToken);
    });

    it("new token validates", () => {
      const newToken = refreshCSRFToken();
      expect(validateCSRFToken(newToken)).toBe(true);
    });

    it("old token no longer validates after refresh", () => {
      const oldToken = getCSRFToken();
      refreshCSRFToken();
      expect(validateCSRFToken(oldToken)).toBe(false);
    });
  });

  describe("addCSRFHeader", () => {
    it("adds X-CSRF-Token header", () => {
      const headers = addCSRFHeader();
      expect(headers["X-CSRF-Token"]).toBeDefined();
    });

    it("preserves existing headers", () => {
      const headers = addCSRFHeader({ "Content-Type": "application/json" });
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-CSRF-Token"]).toBeDefined();
    });

    it("uses current token", () => {
      const currentToken = getCSRFToken();
      const headers = addCSRFHeader();
      expect(headers["X-CSRF-Token"]).toBe(currentToken);
    });
  });
});
