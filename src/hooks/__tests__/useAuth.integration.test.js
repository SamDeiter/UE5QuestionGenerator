/**
 * useAuth Integration Tests
 *
 * Tests critical auth flow edge cases:
 * - Race condition protection (logout mid-fetch)
 * - Write probe failure handling
 * - Listener cleanup on unmount
 *
 * NOTE: useAuth subscribes to auth state via authManager.onAuthChange (centralized).
 * Tests mock AuthManager to control when auth state changes fire.
 *
 * Run with: npm test -- --grep "useAuth"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { setDoc } from "firebase/firestore";

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

// Setup mocks before imports
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
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

vi.mock("../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

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
import { authManager } from "../../services/AuthManager";
import {
  checkUserRegistration,
  setupInitialAdmin,
} from "../../services/inviteService";

describe("useAuth - Race Condition Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChangeCallback = null;
    // Default: defer callback so tests control timing
    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      return mockAuthUnsubscribe;
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
      authChangeCallback(user);
    });

    // Immediately simulate logout BEFORE checkUserRegistration completes
    await act(async () => {
      authChangeCallback(null);
    });

    // Wait for states to settle
    await waitFor(
      () => {
        expect(result.current.user).toBeNull();
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

  it("unsubscribes from authManager.onAuthChange on unmount", () => {
    const showMessage = vi.fn();
    const { unmount } = renderHook(() => useAuth(showMessage));

    unmount();

    expect(mockAuthUnsubscribe).toHaveBeenCalledTimes(1);
  });

  // ========================================
  // Test: Write Probe Failure (CRITICAL 3)
  // ========================================

  it("revokes isRegistered when write probe fails with permission-denied", async () => {
    const showMessage = vi.fn();

    checkUserRegistration.mockResolvedValue({
      registered: true,
      role: "reviewer",
    });

    // But write probe fails
    setDoc.mockRejectedValue({ code: "permission-denied" });

    const { result } = renderHook(() => useAuth(showMessage));

    const user = { uid: "ghost-uid", email: "ghost@example.com" };

    await act(async () => {
      authChangeCallback(user);
    });

    await waitFor(
      () => {
        expect(result.current.permissionError).toBe(true);
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
      authChangeCallback(user);
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
      authChangeCallback(user);
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

    checkUserRegistration.mockRejectedValue(
      new Error("Network request failed")
    );

    const { result } = renderHook(() => useAuth(showMessage));

    const user = { uid: "test-uid", email: "test@example.com" };

    await act(async () => {
      authChangeCallback(user);
    });

    await waitFor(
      () => {
        expect(result.current.isRegistered).toBe(false);
        expect(result.current.isAdmin).toBe(false);
      },
      { timeout: 2000 }
    );
  });
});

describe("useAuth - State Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChangeCallback = null;
    authManager.onAuthChange.mockImplementation((cb) => {
      authChangeCallback = cb;
      return mockAuthUnsubscribe;
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
      authChangeCallback(user);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(user);
    });

    // Logout
    await act(async () => {
      authChangeCallback(null);
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
      authChangeCallback(null);
    });

    await waitFor(() => {
      expect(result.current.authLoading).toBe(false);
    });
  });
});
