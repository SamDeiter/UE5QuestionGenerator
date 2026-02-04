/**
 * useAuth Integration Tests
 *
 * Tests critical auth flow edge cases:
 * - Race condition protection (logout mid-fetch)
 * - Write probe failure handling
 * - Listener cleanup on unmount
 *
 * Run with: npm test -- --grep "useAuth"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { onIdTokenChanged } from "firebase/auth";
import { setDoc } from "firebase/firestore";

// Setup mocks before imports
vi.mock("firebase/auth", () => ({
  onIdTokenChanged: vi.fn(),
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => "mock-doc"),
  setDoc: vi.fn(),
  getFirestore: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => "mock-timestamp"),
}));

vi.mock("../../services/firebase", () => ({
  auth: {},
  getDb: vi.fn(() => ({})),
  getCustomTags: vi.fn(() => Promise.resolve({})),
}));

vi.mock("../../services/inviteService", () => ({
  checkUserRegistration: vi.fn(),
  setupInitialAdmin: vi.fn(),
  getCustomTags: vi.fn(() => Promise.resolve([])),
  logAuthFailure: vi.fn(() => Promise.resolve()),
}));

// firebaseQueries removed as it no longer contains logAuthFailure

vi.mock("../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { useAuth } from "../useAuth";
import {
  checkUserRegistration,
  setupInitialAdmin,
} from "../../services/inviteService";

describe("useAuth - Race Condition Protection", () => {
  let mockUnsubscribe;
  let authStateCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    onIdTokenChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return mockUnsubscribe;
    });

    // Default mock implementations
    checkUserRegistration.mockResolvedValue({ registered: true, role: "user" });
    setupInitialAdmin.mockRejectedValue(new Error("Not admin"));
    setDoc.mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // Test: Double-Submit / Race Condition
  // ========================================

  it("ignores stale auth state after user logs out mid-fetch", async () => {
    const showMessage = vi.fn();

    // Create a delay helper to reduce nesting
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    // Slow cloud function that takes 1 second
    checkUserRegistration.mockImplementation(async () => {
      await delay(1000);
      return { registered: true, role: "admin" };
    });

    const { result, unmount } = renderHook(() => useAuth(showMessage));

    // Simulate user sign-in
    const user = { uid: "test-uid", email: "test@example.com" };

    await act(async () => {
      authStateCallback(user);
    });

    // Immediately simulate logout BEFORE checkUserRegistration completes
    await act(async () => {
      authStateCallback(null);
    });

    // Wait for states to settle
    await waitFor(
      () => {
        // User should be null (logged out)
        expect(result.current.user).toBeNull();
        // Should NOT have stale admin state from cancelled request
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.isRegistered).toBe(false);
      },
      { timeout: 2000 }
    );

    unmount();
  });

  // ========================================
  // Test: Listener Cleanup
  // ========================================

  it("unsubscribes from onIdTokenChanged on unmount", () => {
    const showMessage = vi.fn();
    const { unmount } = renderHook(() => useAuth(showMessage));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  // ========================================
  // Test: Write Probe Failure (CRITICAL 3)
  // ========================================

  it("revokes isRegistered when write probe fails with permission-denied", async () => {
    const showMessage = vi.fn();

    // User is "registered" according to cloud function
    checkUserRegistration.mockResolvedValue({
      registered: true,
      role: "reviewer",
    });

    // But write probe fails
    setDoc.mockRejectedValue({ code: "permission-denied" });

    const { result } = renderHook(() => useAuth(showMessage));

    const user = { uid: "ghost-uid", email: "ghost@example.com" };

    await act(async () => {
      authStateCallback(user);
    });

    await waitFor(
      () => {
        // Critical: Should revoke registration if write fails
        expect(result.current.permissionError).toBe(true);
        // CRITICAL FIX: isRegistered should be false after write probe fails
        expect(result.current.isRegistered).toBe(false);
        expect(result.current.isAdmin).toBe(false);
      },
      { timeout: 2000 }
    );
  });

  // ========================================
  // Test: Successful Auth Flow
  // ========================================

  it("sets correct state on successful registration check", async () => {
    const showMessage = vi.fn();

    checkUserRegistration.mockResolvedValue({
      registered: true,
      role: "admin",
    });
    setDoc.mockResolvedValue(); // Write probe succeeds

    const { result } = renderHook(() => useAuth(showMessage));

    const user = {
      uid: "admin-uid",
      email: "admin@epicgames.com",
    };

    await act(async () => {
      authStateCallback(user);
    });

    await waitFor(
      () => {
        expect(result.current.user).toEqual(user);
        expect(result.current.isRegistered).toBe(true);
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.userRole).toBe("admin");
      },
      { timeout: 2000 }
    );
  });

  // ========================================
  // Test: Unregistered User
  // ========================================

  it("handles unregistered user correctly", async () => {
    const showMessage = vi.fn();

    checkUserRegistration.mockResolvedValue({
      registered: false,
      role: "user",
    });
    setupInitialAdmin.mockRejectedValue(new Error("Not admin"));

    const { result } = renderHook(() => useAuth(showMessage));

    const user = { uid: "new-uid", email: "newuser@example.com" };

    await act(async () => {
      authStateCallback(user);
    });

    await waitFor(
      () => {
        expect(result.current.user).toEqual(user);
        expect(result.current.isRegistered).toBe(false);
        expect(result.current.isAdmin).toBe(false);
      },
      { timeout: 2000 }
    );
  });

  // ========================================
  // Test: Network Error Handling
  // ========================================

  it("handles network errors gracefully (fail closed)", async () => {
    const showMessage = vi.fn();

    // Simulate network error
    checkUserRegistration.mockRejectedValue(
      new Error("Network request failed")
    );

    const { result } = renderHook(() => useAuth(showMessage));

    const user = { uid: "test-uid", email: "test@example.com" };

    await act(async () => {
      authStateCallback(user);
    });

    await waitFor(
      () => {
        // SECURITY: Fail closed - no access on error
        expect(result.current.isRegistered).toBe(false);
        expect(result.current.isAdmin).toBe(false);
      },
      { timeout: 2000 }
    );
  });
});

describe("useAuth - State Management", () => {
  let authStateCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    onIdTokenChanged.mockImplementation((auth, callback) => {
      authStateCallback = callback;
      return vi.fn();
    });
    checkUserRegistration.mockResolvedValue({ registered: true, role: "user" });
    setDoc.mockResolvedValue();
  });

  it("clears all auth state on logout", async () => {
    const showMessage = vi.fn();
    const { result } = renderHook(() => useAuth(showMessage));

    // Login
    const user = { uid: "test-uid", email: "test@example.com" };
    await act(async () => {
      authStateCallback(user);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(user);
    });

    // Logout
    await act(async () => {
      authStateCallback(null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isRegistered).toBe(false);
      expect(result.current.userRole).toBe("user");
    });
  });

  it("starts in loading state", () => {
    const showMessage = vi.fn();
    const { result } = renderHook(() => useAuth(showMessage));

    expect(result.current.authLoading).toBe(true);
  });

  it("exits loading state after auth check", async () => {
    const showMessage = vi.fn();
    const { result } = renderHook(() => useAuth(showMessage));

    await act(async () => {
      authStateCallback(null);
    });

    await waitFor(() => {
      expect(result.current.authLoading).toBe(false);
    });
  });
});
