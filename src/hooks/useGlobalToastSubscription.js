import { useEffect } from "react";
import { subscribeToToasts } from "../services/toastEvents";

/**
 * Hook to subscribe to global toast events from services
 *
 * Allows services (firebaseSave, offlineQueue, etc.) to trigger
 * UI notifications without direct access to React state.
 *
 * @param {Function} showMessage - Toast notification function from useToast
 */
export function useGlobalToastSubscription(showMessage) {
  useEffect(() => {
    const unsubscribe = subscribeToToasts((message, type, duration) => {
      showMessage(message, type, duration);
    });
    return unsubscribe;
  }, [showMessage]);
}
