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

    // Also listen for browser online/offline events directly
    const handleOnline = () => {
      const s = getConnectionStatus();
      setStatus(s);
      setQueueDetails(getQueueDetails());
    };
    const handleOffline = () => {
      const s = getConnectionStatus();
      setStatus(s);
      setQueueDetails(getQueueDetails());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { ...status, queueDetails };
};

export default useConnectionStatus;
