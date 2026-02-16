/* eslint-disable react-refresh/only-export-components */
/**
 * Accessibility Context
 *
 * Provides app-wide accessibility preferences including colorblind mode.
 * Preferences are persisted to localStorage.
 */
import { createContext, useContext, useState, useEffect, useMemo } from "react";

const STORAGE_KEY = "ue5_accessibility_prefs";

const defaultPrefs = {
  colorblindMode: false,
  highContrast: false,
  reducedMotion: false,
};

const AccessibilityContext = createContext(null);

/**
 * Hook to access accessibility preferences
 * @returns {Object} Accessibility context value
 */
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within an AccessibilityProvider"
    );
  }
  return context;
};

/**
 * Provider component for accessibility preferences
 */
export const AccessibilityProvider = ({ children }) => {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  // Persist to localStorage when preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // localStorage may be unavailable
    }
  }, [prefs]);

  // Check for system preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches && !prefs.reducedMotion) {
      setPrefs((prev) => ({ ...prev, reducedMotion: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColorblindMode = () => {
    setPrefs((prev) => ({ ...prev, colorblindMode: !prev.colorblindMode }));
  };

  const toggleHighContrast = () => {
    setPrefs((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const toggleReducedMotion = () => {
    setPrefs((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  };

  const value = useMemo(
    () => ({
      ...prefs,
      toggleColorblindMode,
      toggleHighContrast,
      toggleReducedMotion,
      setPrefs,
    }),
    [prefs]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityContext;
