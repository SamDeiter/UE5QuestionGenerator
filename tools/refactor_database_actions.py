"""
Refactor App.jsx to use the new useDatabaseActions hook.
This script:
1. Adds the import for useDatabaseActions
2. Removes the inline database action handlers
3. Adds the hook call
4. Removes the deleteQuestionFromFirestore import since it's now in the hook
"""
import re
from pathlib import Path

def refactor_app_jsx():
    file_path = Path(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\App.jsx")
    
    content = file_path.read_text(encoding='utf-8')
    original = content
    
    # 1. Add import for useDatabaseActions after useReviewActions import
    import_pattern = r"(import { useReviewActions } from './hooks/useReviewActions';)"
    import_replacement = r"\1\nimport { useDatabaseActions } from './hooks/useDatabaseActions';"
    content = re.sub(import_pattern, import_replacement, content)
    
    # 2. Remove deleteQuestionFromFirestore from firebase imports since it's now in the hook
    firebase_import_pattern = r"import { auth, getCustomTags, saveCustomTags, deleteQuestionFromFirestore } from './services/firebase';"
    firebase_import_replacement = r"import { auth, getCustomTags, saveCustomTags } from './services/firebase';"
    content = re.sub(firebase_import_pattern, firebase_import_replacement, content)
    
    # 3. Remove handleUpdateDatabaseQuestion inline function
    update_db_pattern = r"""    const handleUpdateDatabaseQuestion = \(id, update\) => \{\r?\n        setDatabaseQuestions\(prev => prev\.map\(q => \{\r?\n            if \(q\.id !== id\) return q;\r?\n            const newData = typeof update === 'function' \? update\(q\) : update;\r?\n            return \{ \.\.\.q, \.\.\.newData \};\r?\n        \}\)\);\r?\n        showMessage\("Question updated locally\. Click 'Sync to Firestore' to save changes\.", 3000\);\r?\n    \};\r?\n\r?\n"""
    content = re.sub(update_db_pattern, "", content)
    
    # 4. Remove handleKickBackToReview inline function
    kickback_pattern = r"""    const handleKickBackToReview = async \(question\) => \{\r?\n        try \{\r?\n            // Delete from Firestore\r?\n            await deleteQuestionFromFirestore\(question\.uniqueId\);\r?\n\r?\n            // Remove from database view\r?\n            setDatabaseQuestions\(prev => prev\.filter\(q => q\.uniqueId !== question\.uniqueId\)\);\r?\n\r?\n            // Add to historical questions with 'pending' status so it appears in Review Mode\r?\n            setHistoricalQuestions\(prev => \{\r?\n                // Check if already exists to prevent duplicates\r?\n                if \(prev\.some\(q => q\.uniqueId === question\.uniqueId\)\) \{\r?\n                    return prev\.map\(q => q\.uniqueId === question\.uniqueId \? \{ \.\.\.question, status: 'pending' \} : q\);\r?\n                \}\r?\n                return \[\.\.\.prev, \{ \.\.\.question, status: 'pending' \}\];\r?\n            \}\);\r?\n\r?\n            showMessage\("Question removed from database and sent to Review Mode\.", 3000\);\r?\n        \} catch \(error\) \{\r?\n            console\.error\("Error kicking back question:", error\);\r?\n            showMessage\("Failed to kick back question\. Please try again\.", 3000\);\r?\n        \}\r?\n    \};\r?\n\r?\n"""
    content = re.sub(kickback_pattern, "", content)
    
    # 5. Add the hook call after useReviewActions hook call
    hook_call_pattern = r"(    // 8\. Review Actions \(bulk operations\)\r?\n    const \{\r?\n        handleClearPending,\r?\n        handleBulkAcceptHighScores,\r?\n        handleBulkCritiqueAll\r?\n    \} = useReviewActions\(\{\r?\n        uniqueFilteredQuestions,\r?\n        setQuestions,\r?\n        handleUpdateStatus,\r?\n        handleCritique,\r?\n        showMessage\r?\n    \}\);)"
    hook_call_replacement = r"""\1

    // 9. Database Actions
    const {
        handleUpdateDatabaseQuestion,
        handleKickBackToReview
    } = useDatabaseActions({
        setDatabaseQuestions,
        setHistoricalQuestions,
        showMessage
    });"""
    content = re.sub(hook_call_pattern, hook_call_replacement, content)
    
    if content != original:
        file_path.write_text(content, encoding='utf-8')
        print("✅ Successfully refactored App.jsx to use useDatabaseActions hook")
        print("   - Added import for useDatabaseActions")
        print("   - Removed deleteQuestionFromFirestore from firebase imports")
        print("   - Removed handleUpdateDatabaseQuestion inline function")
        print("   - Removed handleKickBackToReview inline function")
        print("   - Added hook call with proper dependencies")
    else:
        print("❌ No changes made - patterns may not have matched")

if __name__ == "__main__":
    refactor_app_jsx()
