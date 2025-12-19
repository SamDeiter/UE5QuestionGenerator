"""
Refactor App.jsx to use the new useReviewActions hook.
This script:
1. Adds the import for useReviewActions
2. Removes the inline review action handlers
3. Adds the hook call
"""
import re
from pathlib import Path

def refactor_app_jsx():
    file_path = Path(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\App.jsx")
    
    content = file_path.read_text(encoding='utf-8')
    original = content
    
    # 1. Add import for useReviewActions after useTutorial import
    import_pattern = r"(import { useTutorial } from './hooks/useTutorial';)"
    import_replacement = r"\1\nimport { useReviewActions } from './hooks/useReviewActions';"
    content = re.sub(import_pattern, import_replacement, content)
    
    # 2. Remove the inline review action handlers (handleClearPending, handleBulkAcceptHighScores, handleBulkCritiqueAll)
    # Find and remove handleClearPending
    clear_pending_pattern = r"""    const handleClearPending = \(\) => \{\r?\n        if \(window\.confirm\("Are you sure you want to delete ALL pending questions\? This cannot be undone\."\)\) \{\r?\n            // Filter out pending questions from the main state\r?\n            setQuestions\(prev => prev\.filter\(q => q\.status === 'accepted' \|\| q\.status === 'rejected'\)\);\r?\n            showMessage\("All pending questions cleared\.", 3000\);\r?\n        \}\r?\n    \};\r?\n\r?\n"""
    content = re.sub(clear_pending_pattern, "", content)
    
    # Remove handleBulkAcceptHighScores
    bulk_accept_pattern = r"""    // Bulk accept all questions with critique score >= 70\r?\n    const handleBulkAcceptHighScores = \(\) => \{\r?\n        const highScoreQuestions = uniqueFilteredQuestions\.filter\(\r?\n            q => q\.critiqueScore >= 70 && q\.status !== 'accepted' && q\.humanVerified\r?\n        \);\r?\n\r?\n        if \(highScoreQuestions\.length === 0\) \{\r?\n            showMessage\("No verified questions with score ≥ 70 to accept\.", 3000\);\r?\n            return;\r?\n        \}\r?\n\r?\n        highScoreQuestions\.forEach\(q => handleUpdateStatus\(q\.id, 'accepted'\)\);\r?\n        showMessage\(`✓ Accepted \$\{highScoreQuestions\.length\} high-scoring questions!`, 4000\);\r?\n    \};\r?\n\r?\n"""
    content = re.sub(bulk_accept_pattern, "", content)
    
    # Remove handleBulkCritiqueAll
    bulk_critique_pattern = r"""    // Bulk critique all questions without scores\r?\n    const handleBulkCritiqueAll = async \(\) => \{\r?\n        const uncritiquedQuestions = uniqueFilteredQuestions\.filter\(\r?\n            q => q\.critiqueScore === undefined \|\| q\.critiqueScore === null\r?\n        \);\r?\n\r?\n        if \(uncritiquedQuestions\.length === 0\) \{\r?\n            showMessage\("All questions already have critique scores\.", 3000\);\r?\n            return;\r?\n        \}\r?\n\r?\n        showMessage\(`Running critique on \$\{uncritiquedQuestions\.length\} questions\.\.\.`, 3000\);\r?\n\r?\n        // Process sequentially to avoid rate limits\r?\n        for \(const q of uncritiquedQuestions\) \{\r?\n            await handleCritique\(q\);\r?\n        \}\r?\n\r?\n        showMessage\(`✓ Critique complete for \$\{uncritiquedQuestions\.length\} questions!`, 4000\);\r?\n    \};\r?\n\r?\n"""
    content = re.sub(bulk_critique_pattern, "", content)
    
    # 3. Add the hook call after uniqueFilteredQuestions is computed
    # Find the selectAll callback and add hook before it
    hook_call_pattern = r"(    // Bulk selection callbacks \(must be after uniqueFilteredQuestions is defined\)\r?\n    const selectAll = useCallback)"
    hook_call_replacement = r"""    // 8. Review Actions (bulk operations)
    const {
        handleClearPending,
        handleBulkAcceptHighScores,
        handleBulkCritiqueAll
    } = useReviewActions({
        uniqueFilteredQuestions,
        setQuestions,
        handleUpdateStatus,
        handleCritique,
        showMessage
    });

\1"""
    content = re.sub(hook_call_pattern, hook_call_replacement, content)
    
    if content != original:
        file_path.write_text(content, encoding='utf-8')
        print("✅ Successfully refactored App.jsx to use useReviewActions hook")
        print("   - Added import for useReviewActions")  
        print("   - Removed handleClearPending inline function")
        print("   - Removed handleBulkAcceptHighScores inline function")
        print("   - Removed handleBulkCritiqueAll inline function")
        print("   - Added hook call with proper dependencies")
    else:
        print("❌ No changes made - patterns may not have matched")
        # Debug: show which patterns didn't match
        if "import { useReviewActions }" not in content:
            print("   - Import pattern didn't match")
        if "handleClearPending = ()" in content:
            print("   - handleClearPending pattern didn't match")
        if "handleBulkAcceptHighScores = ()" in content:
            print("   - handleBulkAcceptHighScores pattern didn't match")
        if "handleBulkCritiqueAll = async" in content:
            print("   - handleBulkCritiqueAll pattern didn't match")

if __name__ == "__main__":
    refactor_app_jsx()
