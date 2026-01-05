import Icon from "./Icon";

/**
 * Full-page loading spinner for auth/route loading states.
 * Centers a large animated spinner in the viewport.
 */
export const FullPageSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-slate-950">
    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Suspense fallback spinner - for lazy-loaded component fallbacks.
 * Shows spinner with "Loading..." text.
 */
export const SuspenseSpinner = () => (
  <div className="flex items-center justify-center p-10 text-slate-500">
    <Icon name="loader" className="animate-spin mr-2" /> Loading...
  </div>
);

/**
 * Inline loading spinner for buttons, sections, and component loading.
 * @param {number} size - Icon size in pixels (default: 16)
 * @param {string} className - Additional CSS classes
 */
export const InlineSpinner = ({ size = 16, className = "" }) => (
  <Icon name="loader" size={size} className={`animate-spin ${className}`} />
);

// Default export for simple import
export default FullPageSpinner;
