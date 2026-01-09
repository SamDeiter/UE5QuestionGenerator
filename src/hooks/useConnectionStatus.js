import { useState, useEffect } from "react";
import {
  getConnectionStatus,
  subscribeToConnectionStatus,
  getQueueDetails,
} from "../services/firebase";

/**
 * Hook to track connection status and sync queue state.
 * Provides real-time updates when connection changes or queue updates.
 */
export const useConnectionStatus = () => {
  const [status, setStatus] = useState(() => getConnectionStatus());
  const [queueDetails, setQueueDetails] = useState(() => getQueueDetails());

  useEffect(() => {
    // Subscribe to connection status changes from firebase
    const unsubscribe = subscribeToConnectionStatus((newStatus) => {
      setStatus(newStatus);
      setQueueDetails(getQueueDetails());
    });

    // Handle connection state changes from browser events
    const handleConnectionChange = () => {
      const s = getConnectionStatus();
      setStatus(s);
      setQueueDetails(getQueueDetails());
    };

    window.addEventListener("online", handleConnectionChange);
    window.addEventListener("offline", handleConnectionChange);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleConnectionChange);
      window.removeEventListener("offline", handleConnectionChange);
    };
  }, []);

  return { ...status, queueDetails };
};

export default useConnectionStatus;
