/**
 * useAuth Hook Integration Tests
 *
 * Tests the authentication and registration flow to prevent
 * "Ghost Reviewer" issues where users are authenticated but not registered.
 *
 * NOTE: useAuth subscribes to auth state via authManager.onAuthChange (centralized).
 * Tests mock AuthManager to control when auth state changes fire.
 */
/* eslint-disable sonarjs/no-nested-functions */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../../contexts/ModalContext", () => ({
  useModals: () => ({
    showTerms: false,
    setShowTerms: vi.fn(),
    showAgeGate: false,
    setShowAgeGate: vi.fn(),
    termsAccepted: false,
    setTermsAccepted: vi.fn(),
  }),
}));

import { useAuth } from "../useAuth";

// =====================================================================
// AuthManager mock — captures the onAuthChange callback so tests can
// simulate auth state changes by calling authChangeCallback(user|null)
// =====================================================================
let authChangeCallback = null;
const mockAuthUnsubscribe = vi.fn();
vi.mock("../../services/AuthManager", () => ({
  authManager: {
    onAuthChange: vi.fn((cb) => {
      authChangeCallback = cb;
      return mockAuthUnsubscribe;
    }),
    getUser: vi.fn(() => null),
    init: vi.fn(),
  },
}));

// Mock Firebase Auth (still needed for signInWithPopup/signOut APIs)
vi.mock("firebase/auth", () => ({
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

import {
  checkUserRegistration,
  setupInitialAdmin,
} from "../../services/inviteService";
import { authManager } from "../../services/AuthManager";

describe("useAuth", () => {
  const mockShowMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authChangeCallback = null;
    localStorage.clear();
    // Set compliance flags to avoid modal triggers
    localStorage.setItem("ue5_age_verified", "true");
    localStorage.setItem("ue5_terms_accepted", "true");
    // Reset the mock to re-capture callback on next render
    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      return mockAuthUnsubscribe;
    });
  });

  it("should return registered=false when user is not authenticated", async () => {
    // Configure mock to fire with null user on subscribe
    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      cb(null);
      return mockAuthUnsubscribe;
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

    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      cb(mockUser);
      return mockAuthUnsubscribe;
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

    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      cb(mockUser);
      return mockAuthUnsubscribe;
    });

    checkUserRegistration.mockResolvedValue({ registered: false });
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

    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      cb(mockUser);
      return mockAuthUnsubscribe;
    });

    checkUserRegistration.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    expect(result.current.isRegistered).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("should detect Ghost Reviewer state (authenticated but not registered)", async () => {
    const mockUser = { uid: "ghost-uid", email: "ghost@company.com" };

    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      cb(mockUser);
      return mockAuthUnsubscribe;
    });

    checkUserRegistration.mockResolvedValue({ registered: false });
    setupInitialAdmin.mockRejectedValue(
      new Error("Not authorized for initial admin setup")
    );

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.isRegistered).toBe(false);
  });

  it("should set permissionError=false when write probe succeeds", async () => {
    const mockUser = {
      uid: "probe-success-uid",
      email: "success@epicgames.com",
    };

    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      cb(mockUser);
      return mockAuthUnsubscribe;
    });

    checkUserRegistration.mockResolvedValue({
      registered: true,
      role: "admin",
    });

    mockSetDoc.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    expect(mockSetDoc).toHaveBeenCalled();
    expect(result.current.permissionError).toBe(false);
  });

  it("should set permissionError=true when write probe fails with permission-denied", async () => {
    const mockUser = { uid: "probe-fail-uid", email: "fail@epicgames.com" };

    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      cb(mockUser);
      return mockAuthUnsubscribe;
    });

    checkUserRegistration.mockResolvedValue({
      registered: true,
      role: "admin",
    });

    mockSetDoc.mockRejectedValue({ code: "permission-denied" });

    const { result } = renderHook(() => useAuth(mockShowMessage));

    await waitFor(() => {
      expect(result.current.registrationLoading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.permissionError).toBe(true);
    });

    expect(result.current.permissionError).toBe(true);
  });

  // ============================================================
  // AUTH RACE CONDITION TESTS (QA BLIND SPOT FIX)
  // ============================================================
  describe("Auth Race Conditions (QA Blind Spot)", () => {
    it("CRITICAL: authLoading starts as true to prevent premature UI render", () => {
      // Don't call the callback immediately - simulate async auth check
      authManager.onAuthChange.mockImplementation((cb) => {
        authChangeCallback = cb;
        setTimeout(() => cb(null), 100);
        return mockAuthUnsubscribe;
      });

      const { result } = renderHook(() => useAuth(mockShowMessage));

      expect(result.current.authLoading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it("CRITICAL: authLoading becomes false only after auth settles", async () => {
      // Defer callback so we can control timing
      authManager.onAuthChange.mockImplementation((cb) => {
        authChangeCallback = cb;
        return mockAuthUnsubscribe;
      });

      const { result } = renderHook(() => useAuth(mockShowMessage));

      // Initially loading
      expect(result.current.authLoading).toBe(true);

      // Simulate auth resolving
      authChangeCallback(null);

      await waitFor(() => {
        expect(result.current.authLoading).toBe(false);
      });

      expect(result.current.authLoading).toBe(false);
    });

    it("CRITICAL: components should wait for both authLoading and registrationLoading", async () => {
      const mockUser = { uid: "test-uid", email: "test@example.com" };

      authManager.onAuthChange.mockImplementation((cb) => {
        authChangeCallback = cb;
        cb(mockUser);
        return mockAuthUnsubscribe;
      });

      // Simulate slow registration check
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

      expect(result.current.registrationLoading).toBe(true);

      const shouldShowPrivateUI =
        !result.current.authLoading && !result.current.registrationLoading;
      expect(shouldShowPrivateUI).toBe(false);

      await waitFor(() => {
        expect(result.current.registrationLoading).toBe(false);
      });

      const canShowUI =
        !result.current.authLoading && !result.current.registrationLoading;
      expect(canShowUI).toBe(true);
    });
  });
});
