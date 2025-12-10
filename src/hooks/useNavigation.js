import { useCallback } from 'react';

/**
 * Hook for managing app navigation and mode switching.
 * Handles mode selection, database view, and home navigation.
 * 
 * @param {Object} params - Hook parameters
 * @param {Function} params.setAppMode - Setter for app mode state
 * @param {Function} params.setShowExportMenu - Setter for export menu visibility
 * @param {Function} params.setShowHistory - Setter for history visibility
 * @param {Function} params.setFilterMode - Setter for filter mode
 * @param {Function} params.handleLoadFromFirestore - Function to load data from Firestore
 * @returns {Object} Navigation handlers
 */
export const useNavigation = ({
    setAppMode,
    setShowExportMenu,
    setShowHistory,
    setFilterMode,
    handleLoadFromFirestore
}) => {
    /**
     * Handle mode selection with appropriate setup for each mode.
     * - Review mode: Shows history and filters to pending
     * - Other modes: Hides history and filters to pending
     * 
     * @param {string} mode - The mode to switch to ('create', 'review', 'database', 'analytics', 'landing')
     */
    const handleModeSelect = useCallback((mode) => {
        setAppMode(mode);
        setShowExportMenu(false);
        if (mode === 'review') {
            setShowHistory(true);
            setFilterMode('pending'); // Hide accepted items by default
        } else {
            setShowHistory(false);
            setFilterMode('pending');
        }
    }, [setAppMode, setShowExportMenu, setShowHistory, setFilterMode]);

    /**
     * Navigate to database view and load data from Firestore.
     */
    const handleViewDatabase = useCallback(async () => {
        setAppMode('database');
        // Load from Firestore (primary database)
        await handleLoadFromFirestore();
    }, [setAppMode, handleLoadFromFirestore]);

    /**
     * Navigate back to landing page.
     */
    const handleGoHome = useCallback(() => {
        setAppMode('landing');
    }, [setAppMode]);

    return {
        handleModeSelect,
        handleViewDatabase,
        handleGoHome
    };
};
