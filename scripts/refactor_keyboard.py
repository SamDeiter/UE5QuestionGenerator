"""
Refactor App.jsx to use the new useKeyboardShortcuts hook.

This script:
1. Adds the import for useKeyboardShortcuts
2. Removes the inline keyboard shortcut useEffect hooks
3. Adds the useKeyboardShortcuts hook call
"""

def refactor_app_jsx():
    """Refactor App.jsx to use useKeyboardShortcuts hook."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add import for useKeyboardShortcuts after useFiltering import
    old_import = "import { useFiltering } from './hooks/useFiltering';"
    new_import = """import { useFiltering } from './hooks/useFiltering';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';"""
    content = content.replace(old_import, new_import)
    
    # 2. Remove the keyboard shortcut effects and replace with hook call
    # This covers lines 342-392 approximately
    old_keyboard_section = """    // Keyboard Shortcuts
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
    }, [config.sheetUrl, config.language, handleExportToSheets, handleBulkExport]);

    // Click-outside handler for Data dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
                setDataMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Review Mode Navigation (index reset is handled in useFiltering)
    useEffect(() => {
        if (appMode !== 'review') return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') setCurrentReviewIndex(prev => Math.min(prev + 1, uniqueFilteredQuestions.length - 1));
            else if (e.key === 'ArrowLeft') setCurrentReviewIndex(prev => Math.max(prev - 1, 0));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, uniqueFilteredQuestions.length, setCurrentReviewIndex]);"""
    
    new_keyboard_section = """    // Keyboard Shortcuts (extracted to useKeyboardShortcuts hook)
    useKeyboardShortcuts({
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
        uniqueFilteredQuestionsLength: uniqueFilteredQuestions.length,
        setCurrentReviewIndex
    });

    // Click-outside handler for Data dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
                setDataMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);"""
    
    content = content.replace(old_keyboard_section, new_keyboard_section)
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Refactored App.jsx to use useKeyboardShortcuts hook")
    print("   - Added import for useKeyboardShortcuts")
    print("   - Replaced 3 keyboard useEffect hooks with single hook call")
    print("   - Kept click-outside handler (not keyboard related)")

if __name__ == '__main__':
    refactor_app_jsx()
