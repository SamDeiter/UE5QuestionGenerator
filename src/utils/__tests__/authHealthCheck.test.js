/**
 * @vitest-environment jsdom
 * Tests for authHealthCheck utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runAuthHealthCheck } from "../authHealthCheck";

// Mock Firebase auth
vi.mock("../../services/firebase", () => ({
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
    beforeEach(async () => {
      // Mock a logged in user
      const mockFirebase = await import("../../services/firebase");
      mockFirebase.auth.currentUser = {
        getIdToken: vi.fn().mockResolvedValue("fake-token"),
      };
    });

    afterEach(async () => {
      const mockFirebase = await import("../../services/firebase");
      mockFirebase.auth.currentUser = null;
    });

    it("returns healthy with tokenRefreshOk when token refresh succeeds", async () => {
      const status = await runAuthHealthCheck();

      expect(status.healthy).toBe(true);
      expect(status.userLoaded).toBe(true);
      expect(status.tokenRefreshOk).toBe(true);
    });

    it("returns unhealthy when token refresh fails", async () => {
      const mockFirebase = await import("../../services/firebase");
      mockFirebase.auth.currentUser.getIdToken = vi
        .fn()
        .mockRejectedValue(new Error("403 Forbidden"));

      const status = await runAuthHealthCheck();

      expect(status.healthy).toBe(false);
      expect(status.tokenRefreshOk).toBe(false);
      expect(status.error).toBeDefined();
      expect(status.errorCode).toBe("403");
    });

    it("detects blocked requests from ad blockers", async () => {
      const mockFirebase = await import("../../services/firebase");
      mockFirebase.auth.currentUser.getIdToken = vi
        .fn()
        .mockRejectedValue(new Error("Failed to fetch"));

      const status = await runAuthHealthCheck();

      expect(status.healthy).toBe(false);
      expect(status.errorCode).toBe("blocked");
      expect(status.guidance).toContain("browser extension");
    });
  });
});
