/**
 * useToast Hook - Enhanced Version
 * 
 * Features:
 * - Smart message replacement (similar messages update instead of stack)
 * - Priority levels (high=sticky, medium=normal, low=replaceable)
 * - Progress toast support
 * - Deduplication
 */
import { useState, useCallback, useRef } from 'react';

// Patterns for messages that should replace (not stack)
const REPLACEABLE_PATTERNS = [
    /Score:\s*\d+\/100/i,           // Score updates
    /Critiquing\s+\d+/i,            // Critique progress
    /Translating.*\d+/i,            // Translation progress
    /Generated\s+\d+/i,             // Generation counts
    /Processing\s+\d+/i,            // Processing progress
    /Loading/i,                      // Loading states
    /Saving/i,                       // Saving states
    /\d+\s*of\s*\d+/i,              // X of Y progress
    /\(\d+\/\d+\)/,                  // (X/Y) progress
];

// Priority durations
const PRIORITY_CONFIG = {
    high: { duration: 0, sticky: true },      // Stays until manually dismissed
    medium: { duration: 6000, sticky: false }, // 6 seconds
    low: { duration: 3000, sticky: false },    // 3 seconds
    progress: { duration: 0, sticky: true },   // Progress toasts persist
};

/**
 * Check if a message matches any replaceable pattern
 */
const getMessagePattern = (message) => {
    for (const pattern of REPLACEABLE_PATTERNS) {
        if (pattern.test(message)) {
            return pattern;
        }
    }
    return null;
};

/**
 * Custom hook for managing toast notifications.
 * 
 * @returns {Object} Toast state and handlers
 */
export function useToast() {
    const [toasts, setToasts] = useState([]);
    const toastIdCounter = useRef(0);

    /**
     * Add or update a toast notification.
     * Smart replacement: If message matches a pattern, update existing toast.
     * 
     * @param {string} message - Toast message
     * @param {Object} options - Toast options
     * @param {string} options.type - Toast type ('info', 'success', 'error', 'warning', 'progress')
     * @param {string} options.priority - Priority level ('high', 'medium', 'low')
     * @param {number} options.duration - Custom duration in ms (overrides priority default)
     * @param {number} options.progress - Progress value 0-100 (for progress type)
     * @param {string} options.id - Custom ID for updating specific toasts
     */
    const addToast = useCallback((message, options = {}) => {
        const {
            type = 'info',
            priority = 'medium',
            duration,
            progress,
            id: customId
        } = options;

        const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
        const finalDuration = duration ?? config.duration;
        const pattern = getMessagePattern(message);

        setToasts(prev => {
            // Check for exact duplicate
            if (prev.some(t => t.message === message)) {
                return prev;
            }

            // Smart replacement: Find existing toast with matching pattern
            if (pattern || customId) {
                const existingIndex = prev.findIndex(t => 
                    (customId && t.id === customId) || 
                    (pattern && pattern.test(t.message))
                );

                if (existingIndex !== -1) {
                    // Update existing toast instead of adding new one
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        message,
                        type,
                        progress,
                        duration: finalDuration,
                        updatedAt: Date.now()
                    };
                    return updated;
                }
            }

            // Create new toast
            const id = customId || `toast-${++toastIdCounter.current}`;
            const newToast = {
                id,
                message,
                type,
                priority,
                duration: finalDuration,
                sticky: config.sticky,
                progress,
                createdAt: Date.now()
            };

            // Add new toast, keeping max 3 (but never remove high priority)
            const newToasts = [...prev, newToast];
            
            // If over limit, remove oldest low-priority toast
            if (newToasts.length > 3) {
                const lowPriorityIndex = newToasts.findIndex(t => t.priority === 'low' && !t.sticky);
                if (lowPriorityIndex !== -1) {
                    newToasts.splice(lowPriorityIndex, 1);
                } else {
                    // If no low priority, remove oldest non-sticky
                    const removableIndex = newToasts.findIndex(t => !t.sticky);
                    if (removableIndex !== -1) {
                        newToasts.splice(removableIndex, 1);
                    }
                }
            }

            return newToasts;
        });
    }, []);

    /**
     * Remove a toast by ID.
     */
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    /**
     * Update a progress toast
     */
    const updateProgress = useCallback((id, progress, message) => {
        setToasts(prev => prev.map(t => 
            t.id === id 
                ? { ...t, progress, message: message || t.message, updatedAt: Date.now() }
                : t
        ));
    }, []);

    /**
     * Complete and auto-dismiss a progress toast
     */
    const completeProgress = useCallback((id, message, duration = 2000) => {
        setToasts(prev => prev.map(t => 
            t.id === id 
                ? { ...t, progress: 100, message: message || t.message, sticky: false, duration, type: 'success' }
                : t
        ));
    }, []);

    /**
     * Legacy showMessage for backward compatibility
     * @param {string} msg - Message to display
     * @param {string|number} typeOrDuration - Toast type OR duration (backward compat)
     * @param {number} duration - Duration in ms
     */
    const showMessage = useCallback((msg, typeOrDuration = 'info', duration) => {
        let type = 'info';
        let finalDuration = duration;

        // Backward compatibility: if second arg is number, treat as duration
        if (typeof typeOrDuration === 'number') {
            finalDuration = typeOrDuration;
            type = 'info';
        } else {
            type = typeOrDuration;
        }

        // Auto-detect priority based on message content
        let priority = 'medium';
        if (msg.includes('Error') || msg.includes('Failed') || msg.includes('❌') || msg.includes('⛔')) {
            priority = 'high';
            type = 'error';
        } else if (msg.includes('⚠️') || msg.includes('Warning')) {
            priority = 'medium';
            type = 'warning';
        } else if (msg.includes('✓') || msg.includes('✅') || msg.includes('Success') || msg.includes('complete')) {
            type = 'success';
        } else if (msg.includes('...') || msg.includes('Loading') || msg.includes('Saving')) {
            priority = 'low';
        }

        addToast(msg, { type, priority, duration: finalDuration });
    }, [addToast]);

    return {
        toasts,
        addToast,
        removeToast,
        updateProgress,
        completeProgress,
        showMessage
    };
}
