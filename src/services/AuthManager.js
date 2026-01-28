/**
 * AuthManager - Centralized Authentication State Management
 *
 * This singleton manages Firebase authentication in a centralized way,
 * providing consistent cleanup, revocation detection, and logout handling
 * across the entire application.
 *
 * Key Features:
 * - Uses onIdTokenChanged for better revocation/claim detection
 * - Centralized cleanup callbacks for logout
 * - Detects disabled/revoked users proactively
 * - Single source of truth for auth state
 *
 * @see https://firebase.google.com/docs/auth/web/manage-users
 */
import { onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "./firebaseAuth";
import { logger } from "../utils/logger";

class AuthManager {
  constructor() {
    this.listeners = new Set();
    this.cleanupCallbacks = new Set();
    this.currentUser = null;
    this.unsubscribe = null;
    this.isInitialized = false;
  }

  /**
   * Initialize auth listener (call once on app start)
   * Uses onIdTokenChanged for better revocation detection than onAuthStateChanged
   */
  init() {
    if (this.isInitialized) {
      logger.warn("[AuthManager] Already initialized");
      return;
    }

    this.unsubscribe = onIdTokenChanged(auth, async (user) => {
      const previousUser = this.currentUser;
      this.currentUser = user;

      // Detect user switch (logout + new login)
      if (previousUser && user && previousUser.uid !== user.uid) {
        logger.log("[AuthManager] User switch detected, running cleanup");
        this.runCleanupCallbacks();
      }

      // Centralized: Detect disabled/revoked users
      if (user) {
        try {
          const token = await user.getIdTokenResult();

          // Check if user explicitly disabled via custom claim
          if (token.claims.disabled) {
            logger.warn(
              "[AuthManager] User disabled via custom claim, forcing sign-out",
            );
            await this.signOut();
            return;
          }

          // React to role changes
          if (token.claims.role && this._lastKnownRole !== token.claims.role) {
            logger.log(
              `[AuthManager] Role changed: ${this._lastKnownRole} → ${token.claims.role}`,
            );
            this._lastKnownRole = token.claims.role;
          }
        } catch (error) {
          // auth/user-disabled is thrown when trying to get token for disabled user
          if (error.code === "auth/user-disabled") {
            logger.warn("[AuthManager] User disabled, forcing sign-out");
            await this.signOut();
            return;
          }

          // auth/user-token-expired or auth/id-token-revoked
          if (
            error.code === "auth/user-token-expired" ||
            error.code === "auth/id-token-revoked"
          ) {
            logger.warn(
              "[AuthManager] Token revoked/expired, forcing sign-out",
            );
            await this.signOut();
            return;
          }

          logger.error("[AuthManager] Error checking token:", error);
        }
      }

      // Notify all listeners
      this.notifyListeners(user);

      // Centralized: Cleanup on logout
      if (!user && previousUser) {
        logger.log("[AuthManager] User logged out, running cleanup callbacks");
        this.runCleanupCallbacks();
      }
    });

    this.isInitialized = true;
    logger.log("[AuthManager] Initialized with onIdTokenChanged listener");
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} callback - (user) => void
   * @returns {Function} Unsubscribe function
   */
  onAuthChange(callback) {
    this.listeners.add(callback);

    // Immediately call with current user if available
    if (this.isInitialized) {
      try {
        callback(this.currentUser);
      } catch (error) {
        logger.error("[AuthManager] Listener error on subscribe:", error);
      }
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Register cleanup callback (runs on logout)
   * Use this to clean up Firestore listeners, cached data, etc.
   * @param {Function} callback - () => void
   * @returns {Function} Unregister function
   */
  registerCleanup(callback) {
    this.cleanupCallbacks.add(callback);

    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Sign out and run cleanup
   */
  async signOut() {
    try {
      await firebaseSignOut(auth);
      // Cleanup will run via onIdTokenChanged callback
    } catch (error) {
      logger.error("[AuthManager] Sign out error:", error);
      // Still run cleanup even if signOut fails
      this.runCleanupCallbacks();
    }
  }

  /**
   * Get current user (synchronous)
   * @returns {User|null}
   */
  getUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated (synchronous)
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Notify all listeners of auth change
   * @private
   */
  notifyListeners(user) {
    this.listeners.forEach((callback) => {
      try {
        callback(user);
      } catch (error) {
        logger.error("[AuthManager] Listener error:", error);
      }
    });
  }

  /**
   * Run all registered cleanup callbacks
   * @private
   */
  runCleanupCallbacks() {
    logger.log(
      `[AuthManager] Running ${this.cleanupCallbacks.size} cleanup callbacks`,
    );

    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        logger.error("[AuthManager] Cleanup error:", error);
      }
    });

    // Clear callbacks after running (they should re-register on next mount)
    this.cleanupCallbacks.clear();
    this._lastKnownRole = null;
  }

  /**
   * Cleanup (call on app unmount)
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
    this.cleanupCallbacks.clear();
    this.isInitialized = false;
    logger.log("[AuthManager] Destroyed");
  }
}

// Singleton instance
export const authManager = new AuthManager();

// Export class for testing
export { AuthManager };
