/**
 * Auth Flow Test Harness
 *
 * Simulates common auth edge cases for testing:
 * - Double-submit (rapid clicks)
 * - Network failure injection
 * - Auth state changes mid-request
 * - Offline mode simulation
 *
 * Usage:
 *   import { AuthTestHarness } from './testUtils/authHarness';
 *   const harness = new AuthTestHarness();
 *   await harness.simulateDoubleSubmit(signInFn, 3);
 */

export class AuthTestHarness {
  constructor() {
    this.submitCount = 0;
    this.networkOnline = true;
    this.authStateCallback = null;
    this.originalOnLine = null;
  }

  /**
   * Simulate double-submit (rapid clicks)
   * @param {Function} signInFn - Sign-in function to call
   * @param {number} count - Number of parallel calls (default: 3)
   * @returns {Promise<PromiseSettledResult[]>} Results of all calls
   */
  async simulateDoubleSubmit(signInFn, count = 3) {
    console.log(`[Harness] Simulating ${count} parallel sign-in calls...`);
    this.submitCount = count;

    const promises = Array.from({ length: count }, (_, i) => {
      console.log(`[Harness] Starting call ${i + 1}/${count}`);
      return signInFn().catch((err) => {
        console.log(`[Harness] Call ${i + 1} failed:`, err.message);
        throw err;
      });
    });

    const results = await Promise.allSettled(promises);

    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;

    console.log(
      `[Harness] Results: ${fulfilled} fulfilled, ${rejected} rejected`
    );

    return results;
  }

  /**
   * Simulate network failure mid-request
   * @param {Promise} requestPromise - Async operation to intercept
   * @param {number} delayMs - Delay before rejecting (default: 500ms)
   * @returns {Promise} Rejects with network error
   */
  simulateNetworkFailure(requestPromise, delayMs = 500) {
    return Promise.race([
      requestPromise,
      new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error("Network request failed");
          error.code = "auth/network-request-failed";
          reject(error);
        }, delayMs);
      }),
    ]);
  }

  /**
   * Simulate user logout during in-flight request
   * @param {Function} authStateChangeFn - Function to trigger auth state change
   * @param {Promise} inflightRequest - Pending async operation
   * @param {number} logoutDelayMs - Delay before logout (default: 500ms)
   * @returns {Promise} Result of inflight request (should be ignored due to cancellation)
   */
  async simulateLogoutMidFetch(
    authStateChangeFn,
    inflightRequest,
    logoutDelayMs = 500
  ) {
    console.log("[Harness] Starting in-flight request...");

    // Start the in-flight request
    const requestPromise = inflightRequest;

    // After delay, simulate logout
    const logoutTimer = setTimeout(() => {
      console.log("[Harness] Simulating logout (user = null)");
      authStateChangeFn(null);
    }, logoutDelayMs);

    try {
      const result = await requestPromise;
      console.log("[Harness] Request completed:", result);
      return result;
    } finally {
      clearTimeout(logoutTimer);
    }
  }

  /**
   * Mock Firebase onAuthStateChanged for testing
   * @param {Function} callback - Auth state change callback
   * @returns {Function} Unsubscribe function
   */
  mockAuthStateListener(callback) {
    this.authStateCallback = callback;

    console.log("[Harness] Auth state listener mocked");

    return () => {
      console.log("[Harness] Unsubscribing auth listener");
      this.authStateCallback = null;
    };
  }

  /**
   * Trigger auth state change manually
   * @param {Object|null} user - User object or null
   */
  triggerAuthChange(user) {
    if (this.authStateCallback) {
      const userInfo = user ? "uid=" + user.uid : "null";
      console.log(`[Harness] Triggering auth change: ${userInfo}`);
      this.authStateCallback(user);
    } else {
      console.warn("[Harness] No auth state callback registered");
    }
  }

  /**
   * Simulate offline mode
   * WARNING: This modifies navigator.onLine - call goOnline() to restore
   */
  goOffline() {
    this.originalOnLine = navigator.onLine;
    this.networkOnline = false;

    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: false,
    });

    console.log("[Harness] Network offline (navigator.onLine = false)");
  }

  /**
   * Restore online mode
   */
  goOnline() {
    this.networkOnline = true;

    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: this.originalOnLine ?? true,
    });

    console.log("[Harness] Network online (navigator.onLine = true)");
  }

  /**
   * Create a mock user object for testing
   * @param {Object} overrides - Properties to override
   * @returns {Object} Mock Firebase User
   */
  createMockUser(overrides = {}) {
    return {
      uid: "test-uid-" + Date.now(),
      email: "test@example.com",
      emailVerified: true,
      displayName: "Test User",
      photoURL: null,
      phoneNumber: null,
      isAnonymous: false,
      providerData: [
        {
          providerId: "google.com",
          uid: "google-test-uid",
          displayName: "Test User",
          email: "test@example.com",
        },
      ],
      getIdToken: async (_forceRefresh = false) => "mock-id-token",
      getIdTokenResult: async () => ({
        token: "mock-id-token",
        claims: {
          role: "user",
          ...overrides.claims,
        },
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
      }),
      ...overrides,
    };
  }

  /**
   * Create a mock admin user for testing
   * @returns {Object} Mock Firebase User with admin claims
   */
  createMockAdminUser() {
    return this.createMockUser({
      uid: "admin-uid-" + Date.now(),
      email: "admin@epicgames.com",
      claims: {
        role: "admin",
        tools: ["questions", "blueprint", "scenario", "materials"],
      },
    });
  }

  /**
   * Simulate permission-denied error
   * @returns {Error} Firestore permission-denied error
   */
  createPermissionDeniedError() {
    const error = new Error("Missing or insufficient permissions.");
    error.code = "permission-denied";
    error.name = "FirebaseError";
    return error;
  }

  /**
   * Simulate auth/user-disabled error
   * @returns {Error} Firebase auth/user-disabled error
   */
  createUserDisabledError() {
    const error = new Error(
      "The user account has been disabled by an administrator."
    );
    error.code = "auth/user-disabled";
    error.name = "FirebaseError";
    return error;
  }

  /**
   * Reset harness state
   */
  reset() {
    this.submitCount = 0;
    this.authStateCallback = null;
    if (!this.networkOnline) {
      this.goOnline();
    }
    console.log("[Harness] State reset");
  }
}

// Export singleton for convenience
export const authHarness = new AuthTestHarness();
