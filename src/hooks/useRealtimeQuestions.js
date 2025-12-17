import { useEffect, useState, useCallback, useRef } from "react";
import { subscribeToAllQuestions } from "../services/firebase";

/**
 * Custom hook for real-time Firestore synchronization.
 * Replaces cache-based approach with live listeners.
 *
 * MULTI-USER SUPPORT:
 * - When User A accepts a question, User B sees it disappear instantly
 * - When User A is reviewing question #5, User B can review #6 simultaneously
 * - Prevents duplicate work and ensures data consistency
 *
 * @param {boolean} enabled - Whether to enable real-time sync
 * @returns {Object} { questions, isLoading, error, refresh, syncStatus }
 */
export const useRealtimeQuestions = (enabled = true) => {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState("disconnected"); // disconnected | connecting | synced

  // Track previous question count for change detection
  const prevCountRef = useRef(0);

  // Manual refresh function (forces re-subscription)
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setSyncStatus("disconnected");
      return;
    }

    console.log("🔄 Setting up real-time question sync...");
    setIsLoading(true);
    setError(null);
    setSyncStatus("connecting");

    // Subscribe to real-time updates
    const unsubscribe = subscribeToAllQuestions(
      (updatedQuestions) => {
        const prevCount = prevCountRef.current;
        const newCount = updatedQuestions.length;

        // Detect changes from other users
        if (prevCount > 0 && newCount !== prevCount) {
          const diff = newCount - prevCount;
          if (diff > 0) {
            console.log(`📥 ${diff} new question(s) added by another user`);
          } else {
            console.log(
              `📤 ${Math.abs(
                diff
              )} question(s) removed/accepted by another user`
            );
          }
        }

        prevCountRef.current = newCount;
        setQuestions(updatedQuestions);
        setIsLoading(false);
        setError(null);
        setSyncStatus("synced");
      },
      5000 // Max 5000 questions
    );

    // Cleanup on unmount or when refreshTrigger changes
    return () => {
      console.log("🛑 Cleaning up real-time listener");
      setSyncStatus("disconnected");
      unsubscribe();
    };
  }, [enabled, refreshTrigger]);

  return {
    questions,
    isLoading,
    error,
    refresh,
    syncStatus, // "disconnected" | "connecting" | "synced"
  };
};
