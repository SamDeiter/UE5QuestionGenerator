# -*- coding: utf-8 -*-
"""
Security Integration #1: Encrypted localStorage
- Updates useAppConfig.js to use secureStorage
- Updates useQuestionManager.js to use secureStorage
- Adds migration logic to App.jsx
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from security_editor import SecurityFixEditor

def integrate_useAppConfig(editor):
    """Update useAppConfig.js to use secure storage"""
    file_path = editor.project_root / 'src' / 'hooks' / 'useAppConfig.js'
    
    if not editor.backup_file(file_path):
        return False
    
    content = editor.read_file(file_path)
    if not content:
        return False
    
    # Add import
    if "import { getSecureItem, setSecureItem" not in content:
        content = content.replace(
            "import { useState, useEffect } from 'react';",
            "import { useState, useEffect } from 'react';\nimport { getSecureItem, setSecureItem } from '../utils/secureStorage';"
        )
    
    # Replace localStorage.getItem with getSecureItem
    content = content.replace(
        "const saved = localStorage.getItem('ue5_gen_config');",
        "const saved = getSecureItem('ue5_gen_config');"
    )
    
    # Replace JSON.parse since getSecureItem already returns parsed object
    content = content.replace(
        "return saved ? JSON.parse(saved) :",
        "return saved ||"
    )
    
    # Replace localStorage.setItem with setSecureItem
    content = content.replace(
        "localStorage.setItem('ue5_gen_config', JSON.stringify(config));",
        "setSecureItem('ue5_gen_config', config);"
    )
    
    editor.write_file(file_path, content)
    print("[OK] Updated useAppConfig.js to use secure storage")
    return True

def integrate_useQuestionManager(editor):
    """Update useQuestionManager.js to use secure storage"""
    file_path = editor.project_root / 'src' / 'hooks' / 'useQuestionManager.js'
    
    if not editor.backup_file(file_path):
        return False
    
    content = editor.read_file(file_path)
    if not content:
        return False
    
    # Add import
    if "import { getSecureItem, setSecureItem" not in content:
        content = content.replace(
            "import { useState, useEffect } from 'react';",
            "import { useState, useEffect } from 'react';\nimport { getSecureItem, setSecureItem } from '../utils/secureStorage';"
        )
    
    # Replace localStorage.getItem
    content = content.replace(
        "const saved = localStorage.getItem('ue5_gen_questions');",
        "const saved = getSecureItem('ue5_gen_questions');"
    )
    
    # Replace JSON.parse
    content = content.replace(
        "return saved ? JSON.parse(saved) : [];",
        "return saved || [];"
    )
    
    # Replace localStorage.setItem
    content = content.replace(
        "localStorage.setItem('ue5_gen_questions', JSON.stringify(questions))",
        "setSecureItem('ue5_gen_questions', questions)"
    )
    
    editor.write_file(file_path, content)
    print("[OK] Updated useQuestionManager.js to use secure storage")
    return True

def add_migration_to_app(editor):
    """Add migration logic to App.jsx"""
    file_path = editor.project_root / 'src' / 'App.jsx'
    
    if not editor.backup_file(file_path):
        return False
    
    content = editor.read_file(file_path)
    if not content:
        return False
    
    # Add import
    if "import { migrateToSecure } from" not in content:
        # Find the last import statement
        lines = content.split('\n')
        last_import_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import_idx = i
        
        lines.insert(last_import_idx + 1, "import { migrateToSecure } from './utils/secureStorage';")
        content = '\n'.join(lines)
    
    # Add migration call in component
    migration_code = """
    // SECURITY: Migrate existing localStorage to encrypted format
    useEffect(() => {
        migrateToSecure('ue5_gen_config');
        migrateToSecure('ue5_gen_questions');
    }, []);
"""
    
    if "migrateToSecure" not in content:
        # Find the first useEffect and add before it
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'useEffect' in line and i > 50:  # Skip imports
                lines.insert(i, migration_code)
                break
        content = '\n'.join(lines)
    
    editor.write_file(file_path, content)
    print("[OK] Added migration logic to App.jsx")
    return True

def main():
    print("=" * 60)
    print("Security Integration #1: Encrypted localStorage")
    print("=" * 60)
    
    project_root = Path(__file__).parent.parent
    editor = SecurityFixEditor(project_root)
    
    print("\n[1/3] Integrating secure storage into useAppConfig.js...")
    integrate_useAppConfig(editor)
    
    print("\n[2/3] Integrating secure storage into useQuestionManager.js...")
    integrate_useQuestionManager(editor)
    
    print("\n[3/3] Adding migration logic to App.jsx...")
    add_migration_to_app(editor)
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Encrypted localStorage Integration Complete!")
    print("=" * 60)
    print(f"Backups saved to: {editor.backup_dir}")
    print("\n[INFO] What was changed:")
    print("- useAppConfig.js: Now uses getSecureItem/setSecureItem")
    print("- useQuestionManager.js: Now uses encrypted storage for questions")
    print("- App.jsx: Auto-migrates existing plain-text data on load")
    print("\n[TEST] Reload the app and check DevTools:")
    print("1. Open Application > Local Storage")
    print("2. Config and questions should now be encrypted (garbled text)")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[ERROR] Script failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
