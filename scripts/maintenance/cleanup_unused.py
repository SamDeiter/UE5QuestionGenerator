"""
Cleanup script to remove unused variables from the codebase.
This script removes variables prefixed with _ that are destructured but never used.
"""

import re
import os

# Define the cleanup targets based on ESLint report
CLEANUP_TARGETS = [
    # App.jsx - unused destructured variables
    {
        "file": "src/App.jsx",
        "replacements": [
            # Line 61: Remove _addToast from destructuring
            (r"const \{ toasts, addToast: _addToast, removeToast, showMessage \} = useToast\(\);",
             "const { toasts, removeToast, showMessage } = useToast();"),
            # Line 75: Remove _setCustomTags
            (r"setCustomTags: _setCustomTags,\n", ""),
            # Line 82: Remove _termsAccepted
            (r"termsAccepted: _termsAccepted,\n", ""),
            # Line 190: Remove _pendingCount
            (r"_pendingCount,\n", ""),
            # Lines 225-230: Remove file handler unused vars
            (r"_files,\n", ""),
            (r"_setFiles,\n", ""),
            (r"_isDetecting,\n", ""),
            (r"_removeFile,\n", ""),
            # Line 261: Remove _contextFilteredQuestions
            (r"_contextFilteredQuestions,\n", ""),
            # Lines 357, 363-365: Remove menu vars
            (r"_showExportMenu,\n", ""),
            (r"_dataMenuOpen,\n", ""),
            (r"_setDataMenuOpen,\n", ""),
            (r"_dataMenuRef,\n", ""),
            # Line 430: Remove _auth
            (r"const \{ db, auth: _auth \}", "const { db }"),
        ]
    },
    # AdminPanel.jsx - unused _result
    {
        "file": "src/components/AdminPanel.jsx",
        "replacements": [
            (r"const _result = await revokeInvite\(code\);",
             "await revokeInvite(code);"),
            (r"const _result = await revokeUserFn\(\{ userId \}\);",
             "await revokeUserFn({ userId });"),
        ]
    },
    # DatabaseView.jsx
    {
        "file": "src/components/DatabaseView.jsx",
        "replacements": [
            (r"const \[_isSyncing, _setIsSyncing\] = useState\(false\);\n", ""),
            (r"const \[_syncProgress, _setSyncProgress\] = useState\(0\);\n", ""),
            (r"const \[_loadMenuOpen, setLoadMenuOpen\] = useState\(false\);",
             "const [, setLoadMenuOpen] = useState(false);"),
        ]
    },
    # QuestionItem.jsx
    {
        "file": "src/components/QuestionItem.jsx",
        "replacements": [
            (r"const \[_lockStatus, setLockStatus\] = useState\(null\);",
             "const [, setLockStatus] = useState(null);"),
            (r"const \[_isAcquiring, setIsAcquiring\] = useState\(false\);",
             "const [, setIsAcquiring] = useState(false);"),
        ]
    },
    # LanguageControls.jsx
    {
        "file": "src/components/QuestionItem/LanguageControls.jsx",
        "replacements": [
            (r"const \[_translateMenuOpen, setTranslateMenuOpen\] = useState\(false\);",
             "const [, setTranslateMenuOpen] = useState(false);"),
        ]
    },
    # QuestionActions.jsx - remove unused functions
    {
        "file": "src/components/QuestionItem/QuestionActions.jsx",
        "replacements": [
            # These are defined but never used - remove the entire const declarations
            (r"const _handleVerify = .*?;\n", ""),
            (r"const _handleAccept = [\s\S]*?};\n\n", ""),
            (r"const _getAcceptButtonStyle = [\s\S]*?};\n\n", ""),
            (r"const _getAcceptTooltip = [\s\S]*?};\n\n", ""),
        ]
    },
    # QuestionHeader.jsx - unused import
    {
        "file": "src/components/QuestionItem/QuestionHeader.jsx",
        "replacements": [
            (r"import \{ getDisplayUrl \} from \"../../utils/urlValidator\";\n", ""),
        ]
    },
    # QuestionMenu.jsx
    {
        "file": "src/components/QuestionItem/QuestionMenu.jsx",
        "replacements": [
            (r"const \[_menuOpen, setMenuOpen\] = useState\(false\);",
             "const [, setMenuOpen] = useState(false);"),
        ]
    },
    # Header.jsx
    {
        "file": "src/components/Header.jsx",
        "replacements": [
            (r"const \[_showTutorialCenter, setShowTutorialCenter\] = useState\(false\);",
             "const [, setShowTutorialCenter] = useState(false);"),
        ]
    },
    # AnalyticsView.jsx - unused import
    {
        "file": "src/components/AnalyticsView.jsx",
        "replacements": [
            (r", _CATEGORY_KEYS", ""),
        ]
    },
    # CritiqueDisplay.jsx
    {
        "file": "src/components/CritiqueDisplay.jsx",
        "replacements": [
            (r"const _ListTag = [\s\S]*?;\n\n", ""),
        ]
    },
    # useAuth.js - unused error variable
    {
        "file": "src/hooks/useAuth.js",
        "replacements": [
            (r"} catch \(setupError\) \{", "} catch {"),
        ]
    },
]

def cleanup_file(filepath, replacements):
    """Apply regex replacements to a file."""
    full_path = os.path.join(os.getcwd(), filepath)
    
    if not os.path.exists(full_path):
        print(f"⚠️ File not found: {filepath}")
        return 0
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = 0
    
    for pattern, replacement in replacements:
        new_content, count = re.subn(pattern, replacement, content, flags=re.MULTILINE)
        if count > 0:
            changes += count
            content = new_content
    
    if changes > 0:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ {filepath}: {changes} changes")
    else:
        print(f"ℹ️ {filepath}: no changes needed")
    
    return changes

def main():
    """Run cleanup on all target files."""
    print("🧹 Starting unused code cleanup...\n")
    
    total_changes = 0
    for target in CLEANUP_TARGETS:
        changes = cleanup_file(target["file"], target["replacements"])
        total_changes += changes
    
    print(f"\n✨ Total: {total_changes} unused code items removed")

if __name__ == "__main__":
    main()
