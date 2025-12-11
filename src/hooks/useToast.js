/**
 * useToast Hook
 * 
 * Manages toast notification state and handlers:
 * - Toast array state
 * - Add toast with deduplication
 * - Remove toast
 * - Convenience showMessage function
 */
import { useState, useCallback } from 'react';

/**
 * Custom hook for managing toast notifications.
 * 
 * @returns {Object} Toast state and handlers
 */
export function useToast() {
    const [toasts, setToasts] = useState([]);

    /**
     * Add a toast notification.
     * Prevents duplicate messages and limits to 3 most recent.
     * 
     * @param {string} message - Toast message
     * @param {string} type - Toast type ('info', 'success', 'error', 'warning')
     * @param {number} duration - Duration in ms before auto-dismiss
     */
    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => {
            // Prevent duplicate messages
            if (prev.some(t => t.message === message)) {
                return prev;
            }
            const newToasts = [...prev, { id, message, type, duration }];
            // Keep only the 3 most recent toasts
            return newToasts.slice(-3);
        });
    }, []);

    /**
     * Remove a toast by ID.
     * 
     * @param {number|string} id - Toast ID to remove
     */
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    /**
     * @param {string} msg - Message to display
     * @param {string|number} type - Toast type ('info', 'success', 'warning', 'error') OR duration (backward compat)
     * @param {number} duration - Duration in ms
     */
    const showMessage = useCallback((msg, type = 'info', duration = 3000) => {
        // Backward compatibility: if type is number, treat as duration
        if (typeof type === 'number') {
            duration = type;
            type = 'info';
        }
        addToast(msg, type, duration);
    }, [addToast]);

    return {
        toasts,
        addToast,
        removeToast,
        showMessage
    };
}
