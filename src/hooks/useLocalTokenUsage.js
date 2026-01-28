/**
 * useLocalTokenUsage Hook
 *
 * Manages periodic refreshing of token usage statistics from the local analytics store.
 * Extracted from useAuth to reduce complexity.
 */
import { useState, useEffect } from "react";
import { getTokenUsage } from "../utils/analyticsStore";
import { TIMING } from "../utils/constants";

/**
 * Custom hook for tracking local/session-based token consumption.
 *
 * @returns {Object} Current token usage (input/output/cost)
 */
export function useLocalTokenUsage() {
  const [tokenUsage, setTokenUsage] = useState(() => getTokenUsage());

  // Refresh token usage periodically
  useEffect(() => {
    // Refresh interval consistent with existing useAuth logic
    const interval = setInterval(() => {
      setTokenUsage(getTokenUsage());
    }, TIMING.ANALYTICS_REFRESH_MS);

    return () => clearInterval(interval);
  }, []);

  return tokenUsage;
}
