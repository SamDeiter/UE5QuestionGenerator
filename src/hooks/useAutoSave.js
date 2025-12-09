import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook for auto-saving data to localStorage
 * @param {string} key - localStorage key
 * @param {any} data - Data to save
 * @param {number} interval - Save interval in milliseconds (default: 10000)
 * @param {boolean} enabled - Whether auto-save is enabled
 */
export const useAutoSave = (key, data, interval = 10000, enabled = true) => {
    const intervalRef = useRef(null);
    const lastSaveRef = useRef(null);

    const saveData = useCallback(() => {
        if (!enabled || !data) return;

        try {
            const savePayload = {
                data,
                timestamp: Date.now(),
                version: '1.0'
            };
            localStorage.setItem(key, JSON.stringify(savePayload));
            lastSaveRef.current = Date.now();
            console.log(`Auto-saved: ${key}`);
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }, [key, data, enabled]);

    const loadData = useCallback(() => {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const { data: savedData, timestamp } = JSON.parse(saved);
                return { data: savedData, timestamp };
            }
        } catch (error) {
            console.error('Failed to load saved data:', error);
        }
        return null;
    }, [key]);

    const clearSaved = useCallback(() => {
        localStorage.removeItem(key);
        lastSaveRef.current = null;
        console.log(`Cleared saved data: ${key}`);
    }, [key]);

    const hasSavedData = useCallback(() => {
        return localStorage.getItem(key) !== null;
    }, [key]);

    // Auto-save effect
    useEffect(() => {
        if (enabled && data) {
            // Initial save
            saveData();

            // Set up interval
            intervalRef.current = setInterval(saveData, interval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [enabled, data, interval, saveData]);

    return {
        saveData,
        loadData,
        clearSaved,
        hasSavedData,
        lastSaveTime: lastSaveRef.current
    };
};

export default useAutoSave;
