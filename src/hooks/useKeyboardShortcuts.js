/**
 * useKeyboardShortcuts Hook
 * 
 * Manages all keyboard shortcuts for the application:
 * - Ctrl+Enter: Generate questions (in create mode)
 * - Ctrl+S: Quick save/export
 * - Ctrl+E: Open bulk export modal
 * - Arrow keys: Navigate review items (in review mode)
 */
import { useEffect } from 'react';

/**
 * Custom hook for managing keyboard shortcuts.
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.appMode - Current app mode
 * @param {boolean} params.isGenerating - Whether generation is in progress
 * @param {boolean} params.isTargetMet - Whether target count is met
 * @param {boolean} params.isApiReady - Whether API is ready
 * @param {number} params.maxBatchSize - Maximum batch size for generation
 * @param {Function} params.handleGenerate - Generate function
 * @param {Object} params.config - App config with sheetUrl and language
 * @param {Function} params.handleExportToSheets - Export to sheets function
 * @param {Function} params.handleBulkExport - Bulk export function
 * @param {Function} params.setShowBulkExportModal - Show bulk export modal setter
 * @param {number} params.uniqueFilteredQuestionsLength - Length of filtered questions
 * @param {Function} params.setCurrentReviewIndex - Set current review index
 */
export function useKeyboardShortcuts({
    appMode,
    isGenerating,
    isTargetMet,
    isApiReady,
    maxBatchSize,
    handleGenerate,
    config,
    handleExportToSheets,
    handleBulkExport,
    setShowBulkExportModal,
    uniqueFilteredQuestionsLength,
    setCurrentReviewIndex
}) {
    // ========================================================================
    // Ctrl+Enter - Generate Questions
    // ========================================================================
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                if (appMode === 'create' && !isGenerating && !isTargetMet && isApiReady && maxBatchSize > 0) {
                    e.preventDefault();
                    handleGenerate();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, isGenerating, isTargetMet, isApiReady, maxBatchSize, handleGenerate]);

    // ========================================================================
    // Ctrl+S - Quick Save, Ctrl+E - Bulk Export Modal
    // ========================================================================
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (config.sheetUrl) handleExportToSheets();
                else handleBulkExport({ format: 'csv', includeRejected: false, languages: [config.language], scope: 'all' });
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setShowBulkExportModal(true);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [config.sheetUrl, config.language, handleExportToSheets, handleBulkExport, setShowBulkExportModal]);

    // ========================================================================
    // Arrow Keys - Review Navigation
    // ========================================================================
    useEffect(() => {
        if (appMode !== 'review') return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') setCurrentReviewIndex(prev => Math.min(prev + 1, uniqueFilteredQuestionsLength - 1));
            else if (e.key === 'ArrowLeft') setCurrentReviewIndex(prev => Math.max(prev - 1, 0));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, uniqueFilteredQuestionsLength, setCurrentReviewIndex]);
}
