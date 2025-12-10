"""
Refactor App.jsx to use the new useAppHandlers hook.

This script:
1. Adds the import for useAppHandlers
2. Removes the inline handler functions
3. Adds the useAppHandlers hook call
"""

def refactor_app_jsx():
    """Refactor App.jsx to use useAppHandlers hook."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Add import for useAppHandlers after useModalState import
    old_import = "import { useModalState } from './hooks/useModalState';"
    new_import = """import { useModalState } from './hooks/useModalState';
import { useAppHandlers } from './hooks/useAppHandlers';"""
    content = content.replace(old_import, new_import)
    
    # 2. Remove the inline handleSaveApiKey
    old_save_api_key = """
    const handleSaveApiKey = (newApiKey) => {
        handleChange({ target: { name: 'apiKey', value: newApiKey } });
        setShowApiKeyModal(false);
    };
"""
    content = content.replace(old_save_api_key, "")
    
    # 3. Remove the inline handleManualUpdate and handleSelectCategory, add hook call
    old_handlers = """    // Wrapper to adapt (id, update) from QuestionItem to (id, fn) for useQuestionManager
    const handleManualUpdate = (id, update) => {
        updateQuestionInState(id, (prevQ) => {
            const newData = typeof update === 'function' ? update(prevQ) : update;
            return { ...prevQ, ...newData };
        });
    };

    const handleSelectCategory = (key) => setConfig(prev => ({ ...prev, difficulty: key }));

"""
    
    new_handlers = """    // App Handlers (extracted to useAppHandlers hook)
    const {
        handleManualUpdate,
        handleSelectCategory,
        handleSaveApiKey
    } = useAppHandlers({
        updateQuestionInState,
        setConfig,
        handleChange,
        setShowApiKeyModal
    });

"""
    
    content = content.replace(old_handlers, new_handlers)
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Refactored App.jsx to use useAppHandlers hook")
    print("   - Added import for useAppHandlers")
    print("   - Removed inline handleSaveApiKey")
    print("   - Removed inline handleManualUpdate")
    print("   - Removed inline handleSelectCategory")

if __name__ == '__main__':
    refactor_app_jsx()
