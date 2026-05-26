/**
 * Global Toast Events - Allows services to trigger toast notifications
 *
 * This uses a simple event emitter pattern so non-React code (like firebaseSave.js)
 * can trigger toast notifications in the UI.
 *
 * Usage in services:
 *   import { emitToast } from './toastEvents';
 *   emitToast('Save failed!', 'error');
 *
 * Usage in React (App.jsx):
 *   import { subscribeToToasts } from './toastEvents';
 *   useEffect(() => subscribeToToasts((msg, type) => showMessage(msg, type)), []);
 */

const listeners = new Set();

/**
 * Subscribe to toast events
 * @param {Function} callback - (message, type) => void
 * @returns {Function} Unsubscribe function
 */
export const subscribeToToasts = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

/**
 * Emit a toast notification from anywhere in the app
 * @param {string} message - Toast message
 * @param {string} type - Toast type: 'info', 'success', 'error', 'warning'
 * @param {number} duration - Optional duration in ms
 */
export const emitToast = (message, type = "error", duration) => {
  listeners.forEach((callback) => callback(message, type, duration));
};

/**
 * Pre-defined toast helpers
 */
export const toastError = (message, duration) =>
  emitToast(message, "error", duration);
