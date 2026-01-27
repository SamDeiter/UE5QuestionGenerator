/**
 * @jest-environment jsdom
 * Tests for authHealthCheck utility
 */

import {
  runAuthHealthCheck,
  isAuthLikelyWorking,
  formatHealthStatusForUI,
} from "../authHealthCheck";

// Mock Firebase auth
jest.mock("../../services/firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

describe("authHealthCheck", () => {
  describe("runAuthHealthCheck", () => {
    it("returns healthy status when no user is logged in", async () => {
      const status = await runAuthHealthCheck();

      expect(status.healthy).toBe(true);
      expect(status.userLoaded).toBe(false);
      expect(status.error).toBeNull();
    });
  });

  describe("runAuthHealthCheck with user", () => {
    beforeEach(() => {
      // Mock a logged in user
      const mockFirebase = require("../../services/firebase");
      mockFirebase.auth.currentUser = {
        getIdToken: jest.fn().mockResolvedValue("fake-token"),
      };
    });

    afterEach(() => {
      const mockFirebase = require("../../services/firebase");
      mockFirebase.auth.currentUser = null;
    });

    it("returns healthy with tokenRefreshOk when token refresh succeeds", async () => {
      const status = await runAuthHealthCheck();

      expect(status.healthy).toBe(true);
      expect(status.userLoaded).toBe(true);
      expect(status.tokenRefreshOk).toBe(true);
    });

    it("returns unhealthy when token refresh fails", async () => {
      const mockFirebase = require("../../services/firebase");
      mockFirebase.auth.currentUser.getIdToken = jest
        .fn()
        .mockRejectedValue(new Error("403 Forbidden"));

      const status = await runAuthHealthCheck();

      expect(status.healthy).toBe(false);
      expect(status.tokenRefreshOk).toBe(false);
      expect(status.error).toBeDefined();
      expect(status.errorCode).toBe("403");
    });

    it("detects blocked requests from ad blockers", async () => {
      const mockFirebase = require("../../services/firebase");
      mockFirebase.auth.currentUser.getIdToken = jest
        .fn()
        .mockRejectedValue(new Error("Failed to fetch"));

      const status = await runAuthHealthCheck();

      expect(status.healthy).toBe(false);
      expect(status.errorCode).toBe("blocked");
      expect(status.guidance).toContain("browser extension");
    });
  });

  describe("isAuthLikelyWorking", () => {
    it("returns true when auth module is accessible", () => {
      expect(isAuthLikelyWorking()).toBe(true);
    });
  });

  describe("formatHealthStatusForUI", () => {
    it("returns success variant for healthy status", () => {
      const formatted = formatHealthStatusForUI({ healthy: true });

      expect(formatted.variant).toBe("success");
      expect(formatted.showDetails).toBe(false);
    });

    it("returns warning variant with guidance for unhealthy status", () => {
      const formatted = formatHealthStatusForUI({
        healthy: false,
        error: "Token Service API may be disabled",
        guidance: "Enable the API in GCP Console",
        errorCode: "403",
      });

      expect(formatted.variant).toBe("warning");
      expect(formatted.showDetails).toBe(true);
      expect(formatted.guidance).toBe("Enable the API in GCP Console");
    });
  });
});
