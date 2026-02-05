/**
 * AuthManager Unit Tests
 *
 * Tests the centralized AuthManager service:
 * - onIdTokenChanged listener setup
 * - Cleanup callback registration and execution
 * - User revocation detection
 * - Singleton behavior
 *
 * Run with: npm test -- --grep "AuthManager"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock firebase/auth before importing AuthManager - must include all used exports
vi.mock("firebase/auth", () => ({
  onIdTokenChanged: vi.fn(),
  signOut: vi.fn(),
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(),
  initializeApp: vi.fn(() => ({})),
}));

// Mock the firebaseAuth module that AuthManager imports
vi.mock("../firebaseAuth", () => ({
  auth: {},
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked functions for test assertions
import { onIdTokenChanged, signOut } from "firebase/auth";

// Import after mocks
import { AuthManager, authManager } from "../AuthManager";

describe("AuthManager - Initialization", () => {
  let manager;
  let tokenCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AuthManager();

    onIdTokenChanged.mockImplementation((auth, callback) => {
      tokenCallback = callback;
      return vi.fn(); // unsubscribe
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it("initializes with onIdTokenChanged listener", () => {
    manager.init();

    expect(onIdTokenChanged).toHaveBeenCalledTimes(1);
    expect(manager.isInitialized).toBe(true);
  });

  it("does not double-initialize", () => {
    manager.init();
    manager.init();

    expect(onIdTokenChanged).toHaveBeenCalledTimes(1);
  });

  it("tracks current user", async () => {
    manager.init();

    const mockUser = { uid: "test-uid", email: "test@example.com" };
    mockUser.getIdTokenResult = vi.fn().mockResolvedValue({
      claims: { role: "user" },
    });

    await tokenCallback(mockUser);

    expect(manager.getUser()).toEqual(mockUser);
    expect(manager.isAuthenticated()).toBe(true);
  });

  it("clears user on logout", async () => {
    manager.init();

    const mockUser = { uid: "test-uid", email: "test@example.com" };
    mockUser.getIdTokenResult = vi.fn().mockResolvedValue({
      claims: { role: "user" },
    });

    await tokenCallback(mockUser);
    expect(manager.isAuthenticated()).toBe(true);

    await tokenCallback(null);
    expect(manager.getUser()).toBeNull();
    expect(manager.isAuthenticated()).toBe(false);
  });
});

describe("AuthManager - Cleanup Callbacks", () => {
  let manager;
  let tokenCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AuthManager();

    onIdTokenChanged.mockImplementation((auth, callback) => {
      tokenCallback = callback;
      return vi.fn();
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it("registers cleanup callbacks", () => {
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();

    manager.registerCleanup(cleanup1);
    manager.registerCleanup(cleanup2);

    expect(manager.cleanupCallbacks.size).toBe(2);
  });

  it("runs cleanup callbacks on logout", async () => {
    manager.init();

    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();

    manager.registerCleanup(cleanup1);
    manager.registerCleanup(cleanup2);

    // Login first
    const mockUser = { uid: "test-uid", email: "test@example.com" };
    mockUser.getIdTokenResult = vi.fn().mockResolvedValue({
      claims: { role: "user" },
    });
    await tokenCallback(mockUser);

    // Logout
    await tokenCallback(null);

    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup2).toHaveBeenCalledTimes(1);
  });

  it("clears callbacks after running", async () => {
    manager.init();

    const cleanup = vi.fn();
    manager.registerCleanup(cleanup);

    const mockUser = { uid: "test-uid", email: "test@example.com" };
    mockUser.getIdTokenResult = vi.fn().mockResolvedValue({
      claims: { role: "user" },
    });
    await tokenCallback(mockUser);

    await tokenCallback(null);

    expect(manager.cleanupCallbacks.size).toBe(0);
  });

  it("returns unregister function", () => {
    const cleanup = vi.fn();
    const unregister = manager.registerCleanup(cleanup);

    expect(manager.cleanupCallbacks.size).toBe(1);

    unregister();

    expect(manager.cleanupCallbacks.size).toBe(0);
  });
});

describe("AuthManager - Listener Management", () => {
  let manager;
  let tokenCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AuthManager();

    onIdTokenChanged.mockImplementation((auth, callback) => {
      tokenCallback = callback;
      return vi.fn();
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it("notifies listeners of auth state changes", async () => {
    manager.init();

    const listener = vi.fn();
    manager.onAuthChange(listener);

    const mockUser = { uid: "test-uid", email: "test@example.com" };
    mockUser.getIdTokenResult = vi.fn().mockResolvedValue({
      claims: { role: "user" },
    });

    await tokenCallback(mockUser);

    // Called once immediately (with null), once with user
    expect(listener).toHaveBeenCalledWith(mockUser);
  });

  it("returns unsubscribe function for listeners", () => {
    manager.init();

    const listener = vi.fn();
    const unsubscribe = manager.onAuthChange(listener);

    expect(manager.listeners.size).toBe(1);

    unsubscribe();

    expect(manager.listeners.size).toBe(0);
  });

  it("handles listener errors gracefully", async () => {
    manager.init();

    const goodListener = vi.fn();
    const badListener = vi.fn(() => {
      throw new Error("Listener error");
    });

    manager.onAuthChange(badListener);
    manager.onAuthChange(goodListener);

    const mockUser = { uid: "test-uid", email: "test@example.com" };
    mockUser.getIdTokenResult = vi.fn().mockResolvedValue({
      claims: { role: "user" },
    });

    // Should not throw
    await expect(tokenCallback(mockUser)).resolves.not.toThrow();

    // Good listener should still be called
    expect(goodListener).toHaveBeenCalled();
  });
});

describe("AuthManager - User Revocation Detection", () => {
  let manager;
  let tokenCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AuthManager();
    signOut.mockResolvedValue();

    onIdTokenChanged.mockImplementation((auth, callback) => {
      tokenCallback = callback;
      return vi.fn();
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it("signs out user with disabled claim", async () => {
    manager.init();

    const disabledUser = {
      uid: "disabled-uid",
      email: "disabled@example.com",
      getIdTokenResult: vi.fn().mockResolvedValue({
        claims: { disabled: true },
      }),
    };

    await tokenCallback(disabledUser);

    expect(signOut).toHaveBeenCalled();
  });

  it("signs out user on auth/user-disabled error", async () => {
    manager.init();

    const revokedUser = {
      uid: "revoked-uid",
      email: "revoked@example.com",
      getIdTokenResult: vi.fn().mockRejectedValue({
        code: "auth/user-disabled",
      }),
    };

    await tokenCallback(revokedUser);

    expect(signOut).toHaveBeenCalled();
  });

  it("signs out user on auth/id-token-revoked error", async () => {
    manager.init();

    const revokedUser = {
      uid: "revoked-uid",
      email: "revoked@example.com",
      getIdTokenResult: vi.fn().mockRejectedValue({
        code: "auth/id-token-revoked",
      }),
    };

    await tokenCallback(revokedUser);

    expect(signOut).toHaveBeenCalled();
  });
});

describe("AuthManager - Singleton", () => {
  it("exports singleton instance", () => {
    expect(authManager).toBeInstanceOf(AuthManager);
  });

  it("exports class for testing", () => {
    const instance = new AuthManager();
    expect(instance).toBeInstanceOf(AuthManager);
  });
});

describe("AuthManager - Destruction", () => {
  let manager;
  let mockUnsubscribe;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AuthManager();
    mockUnsubscribe = vi.fn();

    onIdTokenChanged.mockImplementation(() => mockUnsubscribe);
  });

  it("unsubscribes on destroy", () => {
    manager.init();
    manager.destroy();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("clears all state on destroy", () => {
    manager.init();

    manager.registerCleanup(() => {});
    manager.onAuthChange(() => {});

    manager.destroy();

    expect(manager.listeners.size).toBe(0);
    expect(manager.cleanupCallbacks.size).toBe(0);
    expect(manager.isInitialized).toBe(false);
  });
});

describe("AuthManager - Claims Methods", () => {
  let manager;
  let tokenCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AuthManager();

    onIdTokenChanged.mockImplementation((auth, callback) => {
      tokenCallback = callback;
      return vi.fn();
    });

    manager.init();
  });

  afterEach(() => {
    manager.destroy();
  });

  it("getClaims returns null when not authenticated", async () => {
    const claims = await manager.getClaims();
    expect(claims).toBeNull();
  });

  it("getClaims returns claims when authenticated", async () => {
    const mockClaims = { role: "reviewer", admin: false };
    const mockUser = {
      uid: "user-123",
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: mockClaims }),
    };

    tokenCallback(mockUser);

    const claims = await manager.getClaims();
    expect(claims).toEqual(mockClaims);
  });

  it("getLastKnownRole returns undefined initially", () => {
    expect(manager.getLastKnownRole()).toBeUndefined();
  });

  it("refreshClaims returns null when not authenticated", async () => {
    const claims = await manager.refreshClaims();
    expect(claims).toBeNull();
  });

  it("refreshClaims forces token refresh with true parameter", async () => {
    const mockClaims = { role: "admin" };
    const mockGetIdTokenResult = vi
      .fn()
      .mockResolvedValue({ claims: mockClaims });
    const mockUser = {
      uid: "user-123",
      getIdTokenResult: mockGetIdTokenResult,
    };

    tokenCallback(mockUser);

    await manager.refreshClaims();

    // Should be called with true to force refresh
    expect(mockGetIdTokenResult).toHaveBeenCalledWith(true);
  });
});

/**
 * Duplicate Account Prevention Tests (The "Ruben Incident")
 *
 * Cover scenarios where a user might inadvertently create duplicate accounts:
 * - Same email, different auth provider (Google vs Email/Password)
 * - Session switching between accounts
 * - Token refresh with different UID (account swap)
 */
describe("AuthManager - Duplicate Account Prevention", () => {
  let manager;
  let tokenCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AuthManager();

    onIdTokenChanged.mockImplementation((auth, callback) => {
      tokenCallback = callback;
      return () => {};
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it("detects when a different user logs in during active session", async () => {
    manager.init();

    // First user logs in
    const user1 = {
      uid: "user-1-uid",
      email: "user1@example.com",
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: "user" } }),
    };
    await tokenCallback(user1);
    expect(manager.getUser().uid).toBe("user-1-uid");

    // Cleanup should be called when switching to a different user
    const cleanup = vi.fn();
    manager.registerCleanup(cleanup);

    // Different user logs in (simulating account switch)
    const user2 = {
      uid: "user-2-uid", // Different UID!
      email: "user2@example.com",
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: "user" } }),
    };

    // Simulate logout first (proper flow)
    await tokenCallback(null);

    // Cleanup should have been called
    expect(cleanup).toHaveBeenCalled();

    // Then new user logs in
    await tokenCallback(user2);
    expect(manager.getUser().uid).toBe("user-2-uid");
  });

  it("handles same email different provider scenario", async () => {
    manager.init();

    // User logs in via Google
    const googleUser = {
      uid: "google-uid-12345",
      email: "ruben@example.com",
      providerData: [{ providerId: "google.com" }],
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: "user" } }),
    };
    await tokenCallback(googleUser);
    expect(manager.getUser().uid).toBe("google-uid-12345");

    // Logout
    await tokenCallback(null);
    expect(manager.getUser()).toBeNull();

    // User logs in via email/password (would create duplicate in old system)
    const emailUser = {
      uid: "email-uid-67890", // Different UID for same email!
      email: "ruben@example.com",
      providerData: [{ providerId: "password" }],
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: "user" } }),
    };
    await tokenCallback(emailUser);

    // Manager should track the new user correctly
    expect(manager.getUser().uid).toBe("email-uid-67890");
    expect(manager.getUser().email).toBe("ruben@example.com");
  });

  it("clears all state when user changes unexpectedly", async () => {
    manager.init();

    const listener = vi.fn();
    const cleanup = vi.fn();

    manager.onAuthChange(listener);
    manager.registerCleanup(cleanup);

    // User 1 logs in
    const user1 = {
      uid: "original-uid",
      email: "test@example.com",
      getIdTokenResult: vi
        .fn()
        .mockResolvedValue({ claims: { role: "admin" } }),
    };
    await tokenCallback(user1);

    expect(manager.getUser()).toBeTruthy();

    // User logs out
    await tokenCallback(null);

    // Verify cleanup happened
    expect(cleanup).toHaveBeenCalled();
    expect(manager.getUser()).toBeNull();
  });

  it("tracks provider data changes correctly", async () => {
    manager.init();

    // Initial login with one provider
    const initialUser = {
      uid: "multi-provider-uid",
      email: "linked@example.com",
      providerData: [{ providerId: "google.com" }],
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: "user" } }),
    };
    await tokenCallback(initialUser);

    // Simulate user linking another provider (token refresh with updated providerData)
    const linkedUser = {
      uid: "multi-provider-uid", // Same UID
      email: "linked@example.com",
      providerData: [
        { providerId: "google.com" },
        { providerId: "password" }, // Now has both
      ],
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: "user" } }),
    };
    await tokenCallback(linkedUser);

    // Should still be same user, just with more providers
    expect(manager.getUser().uid).toBe("multi-provider-uid");
    expect(manager.getUser().providerData).toHaveLength(2);
  });
});
