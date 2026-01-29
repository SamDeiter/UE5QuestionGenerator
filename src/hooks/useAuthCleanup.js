/**
 * useAuthCleanup Hook
 *
 * Provides a simple way to register cleanup callbacks that run when:
 * - User logs out
 * - User switches accounts
 * - Component unmounts
 *
 * This ensures Firestore listeners, cached data, and other user-specific
 * resources are properly cleaned up.
 *
 * Usage:
 *   const { registerCleanup } = useAuthCleanup();
 *
 *   useEffect(() => {
 *     const unsubscribe = subscribeToQuestions();
 *     return registerCleanup(() => unsubscribe());
 *   }, []);
 */
import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";

/**
 * Hook to register auth cleanup callbacks
 * @returns {{ registerCleanup: (callback: () => void) => () => void }}
 */
export function useAuthCleanup() {
  const cleanupCallbacks = useRef(new Set());
  const previousUserRef = useRef(null);

  // Import user from auth context
  // Note: This creates a soft dependency on useAuth, which should be fine
  // since any component using cleanup likely also needs auth state
  const { user } = useAuth(() => {}); // No-op showMessage

  // Run all cleanup callbacks - declare first so it can be used in useEffects
  const runAllCleanups = useCallback(() => {
    console.log(
      `[useAuthCleanup] Running ${cleanupCallbacks.current.size} cleanup callbacks`
    );

    cleanupCallbacks.current.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("[useAuthCleanup] Cleanup callback error:", error);
      }
    });

    cleanupCallbacks.current.clear();
  }, []);

  // Run cleanup when user changes (logout or account switch)
  useEffect(() => {
    const previousUser = previousUserRef.current;

    // Detect logout (user was present, now null)
    if (previousUser && !user) {
      console.log("[useAuthCleanup] User logged out, running cleanup");
      runAllCleanups();
    }

    // Detect account switch (different user)
    if (previousUser && user && previousUser.uid !== user.uid) {
      console.log("[useAuthCleanup] Account switch detected, running cleanup");
      runAllCleanups();
    }

    previousUserRef.current = user;
  }, [user, runAllCleanups]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runAllCleanups();
    };
  }, [runAllCleanups]);

  /**
   * Register a cleanup callback
   * @param {() => void} callback - Function to run on auth change
   * @returns {() => void} - Unregister function (also runs cleanup)
   */
  const registerCleanup = useCallback((callback) => {
    cleanupCallbacks.current.add(callback);

    // Return unregister function
    return () => {
      // Run the cleanup and remove from set
      try {
        callback();
      } catch (error) {
        console.error("[useAuthCleanup] Cleanup error:", error);
      }
      cleanupCallbacks.current.delete(callback);
    };
  }, []);

  return { registerCleanup, runAllCleanups };
}

/**
 * Higher-order hook factory for creating cleanup-aware subscriptions
 *
 * Usage:
 *   const subscribe = useCleanupSubscription((onData) => {
 *     return firestore.collection('items').onSnapshot(onData);
 *   });
 *
 *   useEffect(() => subscribe((data) => setItems(data)), []);
 */
export function useCleanupSubscription(subscriptionFactory) {
  const { registerCleanup } = useAuthCleanup();

  return useCallback(
    (onData) => {
      const unsubscribe = subscriptionFactory(onData);
      return registerCleanup(unsubscribe);
    },
    [registerCleanup, subscriptionFactory]
  );
}

export default useAuthCleanup;
