import { useState, useEffect } from 'react';
import { getConnectionStatus, subscribeToConnectionStatus } from '../services/firebase';

/**
 * Hook to track connection status and sync queue state.
 * Provides real-time updates when connection changes or queue updates.
 */
export const useConnectionStatus = () => {
    const [status, setStatus] = useState(() => getConnectionStatus());

    useEffect(() => {
        // Subscribe to connection status changes from firebase
        const unsubscribe = subscribeToConnectionStatus(setStatus);

        // Also listen for browser online/offline events directly
        const handleOnline = () => setStatus(getConnectionStatus());
        const handleOffline = () => setStatus(getConnectionStatus());

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return status;
};

export default useConnectionStatus;
