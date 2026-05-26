/**
 * DOM utilities for tutorial overlay
 */

/**
 * Throttle function calls to improve performance
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, wait) => {
  let timeout;
  let lastRan;

  return function executedFunction(...args) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(
        () => {
          if (Date.now() - lastRan >= wait) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        },
        wait - (Date.now() - lastRan)
      );
    }
  };
};

/**
 * Get all focusable elements within a container
 * @param {HTMLElement} container - Container element
 * @returns {HTMLElement[]} Array of focusable elements
 */
const getFocusableElements = (container) => {
  if (!container) return [];

  const focusableSelectors = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  return Array.from(container.querySelectorAll(focusableSelectors));
};

/**
 * Trap focus within a container
 * @param {HTMLElement} container - Container to trap focus within
 * @returns {Function} Cleanup function
 */
export const trapFocus = (container) => {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return () => {};

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTab = (e) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  document.addEventListener("keydown", handleTab);

  // Focus first element
  setTimeout(() => firstElement?.focus(), 100);

  // Return cleanup function
  return () => {
    document.removeEventListener("keydown", handleTab);
  };
};
