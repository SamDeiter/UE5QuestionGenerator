/**
 * Listener Tracker
 *
 * Simple counter to track active Firestore listeners for debugging/observability.
 * Helps diagnose billing issues and listener leaks.
 *
 * Usage:
 *   const id = registerListener("allQuestions");
 *   // ... later
 *   unregisterListener(id);
 *
 * Debug in browser console:
 *   window.__listenerDebug.getListenerCount()
 *   window.__listenerDebug.getListenerDetails()
 *
 * @module utils/listenerTracker
 */

let activeListenerCount = 0;
const listenerRegistry = new Map();
let listenerIdCounter = 0;

/**
 * Register a new listener and get a unique ID for cleanup.
 *
 * @param {string} name - Descriptive name for the listener
 * @returns {string} - Unique listener ID for unregistration
 */
export const registerListener = (name) => {
  activeListenerCount++;
  listenerIdCounter++;
  const id = `${name}-${Date.now()}-${listenerIdCounter}`;
  listenerRegistry.set(id, { name, startTime: Date.now() });
  return id;
};

/**
 * Unregister a listener by its ID.
 *
 * @param {string} id - Listener ID from registerListener
 */
export const unregisterListener = (id) => {
  if (listenerRegistry.has(id)) {
    listenerRegistry.delete(id);
    activeListenerCount--;
  }
};

/**
 * Get the current count of active listeners.
 *
 * @returns {number} - Current active listener count
 */
const getListenerCount = () => activeListenerCount;

/**
 * Get detailed information about all active listeners.
 *
 * @returns {Array<{id: string, name: string, startTime: number, durationMs: number}>}
 */
const getListenerDetails = () =>
  Array.from(listenerRegistry.entries()).map(([id, info]) => ({
    id,
    ...info,
    durationMs: Date.now() - info.startTime,
  }));

/**
 * Clear all registered listeners (for testing/cleanup).
 */
const clearAllListeners = () => {
  listenerRegistry.clear();
  activeListenerCount = 0;
};

// Export debug interface to browser console
if (typeof window !== "undefined") {
  window.__listenerDebug = {
    getListenerCount,
    getListenerDetails,
    clearAllListeners,
  };
}
