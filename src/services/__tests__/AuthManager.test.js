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
