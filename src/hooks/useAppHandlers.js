/**
 * useAppHandlers Hook
 * 
 * Small utility handlers that don't fit into other specific hooks:
 * - handleManualUpdate: Wrapper for question updates
 * - handleSelectCategory: Category selection handler
 * - handleSaveApiKey: API key save handler
 */
import { useCallback } from 'react';

/**
 * Custom hook for small app-level handlers.
 * 
 * @param {Object} params - Hook parameters
 * @param {Function} params.updateQuestionInState - Question update function
 * @param {Function} params.setConfig - Config setter
 * @param {Function} params.handleChange - Config change handler
 * @param {Function} params.setShowApiKeyModal - API key modal setter
 * @returns {Object} Handler functions
 */
export function useAppHandlers({
    updateQuestionInState,
    setConfig,
    handleChange,
    setShowApiKeyModal
}) {
    /**
     * Wrapper to adapt (id, update) from QuestionItem to (id, fn) for useQuestionManager.
     */
    const handleManualUpdate = useCallback((id, update) => {
        updateQuestionInState(id, (prevQ) => {
            const newData = typeof update === 'function' ? update(prevQ) : update;
            return { ...prevQ, ...newData };
        });
    }, [updateQuestionInState]);

    /**
     * Handle category/difficulty selection from sidebar.
     */
    const handleSelectCategory = useCallback((key) => {
        setConfig(prev => ({ ...prev, difficulty: key }));
    }, [setConfig]);

    /**
     * Handle saving API key from modal.
     */
    const handleSaveApiKey = useCallback((newApiKey) => {
        handleChange({ target: { name: 'apiKey', value: newApiKey } });
        setShowApiKeyModal(false);
    }, [handleChange, setShowApiKeyModal]);

    return {
        handleManualUpdate,
        handleSelectCategory,
        handleSaveApiKey
    };
}
