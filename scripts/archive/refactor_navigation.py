"""
Refactor App.jsx to use the new useNavigation hook.
This script:
1. Adds the import for useNavigation
2. Removes the inline navigation handlers
3. Adds the hook call
"""
import re
from pathlib import Path

def refactor_app_jsx():
    file_path = Path(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\App.jsx")
    
    content = file_path.read_text(encoding='utf-8')
    original = content
    
    # 1. Add import for useNavigation after useDatabaseActions import
    import_pattern = r"(import { useDatabaseActions } from './hooks/useDatabaseActions';)"
    import_replacement = r"\1\nimport { useNavigation } from './hooks/useNavigation';"
    content = re.sub(import_pattern, import_replacement, content)
    
    # 2. Remove handleModeSelect inline function
    mode_select_pattern = r"""    const handleModeSelect = \(mode\) => \{\r?\n        setAppMode\(mode\);\r?\n        setShowExportMenu\(false\);\r?\n        if \(mode === 'review'\) \{\r?\n            setShowHistory\(true\);\r?\n            setFilterMode\('pending'\); // Changed from 'all' to 'pending' to hide accepted items\r?\n        \} else \{\r?\n            setShowHistory\(false\);\r?\n            setFilterMode\('pending'\);\r?\n        \}\r?\n    \};\r?\n\r?\n"""
    content = re.sub(mode_select_pattern, "", content)
    
    # 3. Remove handleViewDatabase inline function
    view_db_pattern = r"""    const handleViewDatabase = async \(\) => \{\r?\n        setAppMode\('database'\);\r?\n        // Load from Firestore \(primary database\)\r?\n        await handleLoadFromFirestore\(\);\r?\n    \};\r?\n\r?\n"""
    content = re.sub(view_db_pattern, "", content)
    
    # 4. Remove handleGoHome inline function
    go_home_pattern = r"    const handleGoHome = \(\) => setAppMode\('landing'\);\r?\n"
    content = re.sub(go_home_pattern, "", content)
    
    # 5. Add the hook call after useDatabaseActions hook call
    hook_call_pattern = r"(    // 9\. Database Actions\r?\n    const \{\r?\n        handleUpdateDatabaseQuestion,\r?\n        handleKickBackToReview\r?\n    \} = useDatabaseActions\(\{\r?\n        setDatabaseQuestions,\r?\n        setHistoricalQuestions,\r?\n        showMessage\r?\n    \}\);)"
    hook_call_replacement = r"""\1

    // 10. Navigation
    const {
        handleModeSelect,
        handleViewDatabase,
        handleGoHome
    } = useNavigation({
        setAppMode,
        setShowExportMenu,
        setShowHistory,
        setFilterMode,
        handleLoadFromFirestore
    });"""
    content = re.sub(hook_call_pattern, hook_call_replacement, content)
    
    if content != original:
        file_path.write_text(content, encoding='utf-8')
        print("✅ Successfully refactored App.jsx to use useNavigation hook")
        print("   - Added import for useNavigation")
        print("   - Removed handleModeSelect inline function")
        print("   - Removed handleViewDatabase inline function")
        print("   - Removed handleGoHome inline function")
        print("   - Added hook call with proper dependencies")
    else:
        print("❌ No changes made - patterns may not have matched")

if __name__ == "__main__":
    refactor_app_jsx()
