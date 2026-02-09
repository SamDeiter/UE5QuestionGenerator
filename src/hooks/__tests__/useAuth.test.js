/**
 * useAuth Hook Integration Tests
 *
 * Tests the authentication and registration flow to prevent
 * "Ghost Reviewer" issues where users are authenticated but not registered.
 */
/* eslint-disable sonarjs/no-nested-functions */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "../useAuth";

// Mock Firebase Auth
vi.mock("firebase/auth", () => ({
  onIdTokenChanged: vi.fn(),
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Firestore for write probe
const mockSetDoc = vi.fn();
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  setDoc: (...args) => mockSetDoc(...args),
  serverTimestamp: vi.fn(() => "mock-timestamp"),
}));

// Mock Firebase service
vi.mock("../../services/firebase", () => ({
  auth: {},
  getCustomTags: vi.fn(() => Promise.resolve({})),
  saveCustomTags: vi.fn(() => Promise.resolve()),
  getDb: vi.fn(() => ({})),
}));

// Mock invite service
vi.mock("../../services/inviteService", () => ({
  checkUserRegistration: vi.fn(),
  setupInitialAdmin: vi.fn(),
  logAuthFailure: vi.fn(() => Promise.resolve()),
}));

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock analytics store
vi.mock("../../utils/analyticsStore", () => ({
  getTokenUsage: vi.fn(() => ({ input: 0, output: 0 })),
}));

import { onIdTokenChanged } from "firebase/auth";
import {
  checkUserRegistration,
  setupInitialAdmin,
} from "../../services/inviteService";

describe("useAuth", () => {
  const mockShowMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Set compliance flags to avoid modal triggers
    localStorage.setItem("ue5_age_verified", "true");
    localStorage.setItem("ue5_terms_accepted", "true");
  });

  it("should return registered=false when user is not authenticated", async () => {
    // Mock no user
    onIdTokenChanged.mockImplementation((auth, callback) => {
      callback(null);
      return () => {};
    });

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.authLoading).toBe(false);
    });

    expect(result.current.isRegistered).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("should detect registered reviewer from checkUserRegistration", async () => {
    const mockUser = { uid: "test-uid", email: "reviewer@gmail.com" };

    onIdTokenChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    checkUserRegistration.mockResolvedValue({
      registered: true,
      role: "reviewer",
    });

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    expect(result.current.isRegistered).toBe(true);
    expect(result.current.userRole).toBe("reviewer");
    expect(result.current.isAdmin).toBe(false);
  });

  it("should auto-register @epicgames.com users as admin via setupInitialAdmin", async () => {
    const mockUser = { uid: "epic-uid", email: "dev@epicgames.com" };

    onIdTokenChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    // First check returns not registered
    checkUserRegistration.mockResolvedValue({ registered: false });

    // setupInitialAdmin succeeds for Epic emails
    setupInitialAdmin.mockResolvedValue({ success: true, role: "admin" });

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    expect(setupInitialAdmin).toHaveBeenCalled();
    expect(result.current.isRegistered).toBe(true);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.userRole).toBe("admin");
  });

  it("should fail closed when Cloud Function errors (no access)", async () => {
    const mockUser = { uid: "error-uid", email: "user@example.com" };

    onIdTokenChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    // Cloud function fails
    checkUserRegistration.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    // Should fail closed - no access granted on error
    expect(result.current.isRegistered).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("should detect Ghost Reviewer state (authenticated but not registered)", async () => {
    const mockUser = { uid: "ghost-uid", email: "ghost@company.com" };

    onIdTokenChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    // Not registered
    checkUserRegistration.mockResolvedValue({ registered: false });

    // Not an Epic email, so setupInitialAdmin will throw
    setupInitialAdmin.mockRejectedValue(
      new Error("Not authorized for initial admin setup")
    );

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    // User is authenticated (user exists)
    expect(result.current.user).not.toBeNull();
    // But NOT registered
    expect(result.current.isRegistered).toBe(false);
    // This is the "Ghost Reviewer" state that triggers the warning banner
  });

  it("should set permissionError=false when write probe succeeds", async () => {
    const mockUser = {
      uid: "probe-success-uid",
      email: "success@epicgames.com",
    };

    onIdTokenChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    checkUserRegistration.mockResolvedValue({
      registered: true,
      role: "admin",
    });

    // Write probe succeeds
    mockSetDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    // Probe should have been called
    expect(mockSetDoc).toHaveBeenCalled();
    // permissionError should be false
    expect(result.current.permissionError).toBe(false);
  });

  it("should set permissionError=true when write probe fails with permission-denied", async () => {
    const mockUser = { uid: "probe-fail-uid", email: "fail@epicgames.com" };

    onIdTokenChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return () => {};
    });

    checkUserRegistration.mockResolvedValue({
      registered: true,
      role: "admin",
    });

    // Write probe fails with permission-denied
    mockSetDoc.mockRejectedValue({ code: "permission-denied" });

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    // Wait for the probe to complete
    await waitFor(() => {
      expect(result.current.permissionError).toBe(true);
    });

    // permissionError should be true - blocking banner will show
    expect(result.current.permissionError).toBe(true);
  });

  // ============================================================
  // AUTH RACE CONDITION TESTS (QA BLIND SPOT FIX)
  // ============================================================
  describe("Auth Race Conditions (QA Blind Spot)", () => {
    it("CRITICAL: authLoading starts as true to prevent premature UI render", () => {
      // This test ensures UI won't show private data before auth resolves
      onIdTokenChanged.mockImplementation((auth, callback) => {
        // Don't call callback immediately - simulate async auth check
        setTimeout(() => callback(null), 100);
        return () => {};
      });

      const { result } = renderHook(() => useAuth(mockShowMessage));

      // Auth should be loading initially
      expect(result.current.authLoading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it("CRITICAL: authLoading becomes false only after auth settles", async () => {
      let authCallback;
      onIdTokenChanged.mockImplementation((auth, callback) => {
        authCallback = callback;
        return () => {};
      });

      const { result } = renderHook(() => useAuth(mockShowMessage));

      // Initially loading
      expect(result.current.authLoading).toBe(true);

      // Simulate auth resolving
      authCallback(null);

      await waitFor(() => {
        expect(result.current.authLoading).toBe(false);
      });

      // Now safe to render UI
      expect(result.current.authLoading).toBe(false);
    });

    it("CRITICAL: components should wait for both authLoading and registrationLoading", async () => {
      const mockUser = { uid: "test-uid", email: "test@example.com" };

      onIdTokenChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return () => {};
      });

      // Simulate slow registration check - extracted to reduce nesting
      const slowRegistrationCheck = () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ registered: true, role: "user" }), 100);
        });

      checkUserRegistration.mockImplementation(slowRegistrationCheck);

      const { result } = renderHook(() => useAuth(mockShowMessage));

      // Even though auth is resolved, registration is still loading
      await waitFor(() => {
        expect(result.current.authLoading).toBe(false);
      });

      // Registration should still be loading
      expect(result.current.registrationLoading).toBe(true);

      // UI should check BOTH flags before showing private data
      const shouldShowPrivateUI =
        !result.current.authLoading && !result.current.registrationLoading;
      expect(shouldShowPrivateUI).toBe(false);

      // Wait for registration to finish
      await waitFor(() => {
        expect(result.current.registrationLoading).toBe(false);
      });

      // Now both are ready
      const canShowUI =
        !result.current.authLoading && !result.current.registrationLoading;
      expect(canShowUI).toBe(true);
    });
  });
});
