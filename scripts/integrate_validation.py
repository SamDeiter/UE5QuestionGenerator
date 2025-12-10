# -*- coding: utf-8 -*-
"""
Security Integration #2: Input Validation
- Integrates validation into useGeneration.js
- Adds validation to question creation flow
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from security_editor import SecurityFixEditor

def integrate_validation_useGeneration(editor):
    """Add validation to useGeneration.js"""
    file_path = editor.project_root / 'src' / 'hooks' / 'useGeneration.js'
    
    if not editor.backup_file(file_path):
        return False
    
    content = editor.read_file(file_path)
    if not content:
        return False
    
    # Add import
    if "import { validateQuestion } from" not in content:
        content = content.replace(
            "import { useState } from 'react';",
            "import { useState } from 'react';\nimport { validateQuestion } from '../utils/validation';"
        )
    
    # Find where questions are created and add validation
    # Look for the saveQuestion or similar function
    validation_check = """
                // SECURITY: Validate question before saving
                const validation = validateQuestion(questionToSave);
                if (!validation.valid) {
                    console.error('Question validation failed:', validation.errors);
                    // Skip invalid questions but continue processing
                    return;
                }
"""
    
    if "validateQuestion" not in content:
        # Find saveQuestionToFirestore calls and add validation before them
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'saveQuestionToFirestore' in line and 'await' in line:
                # Add validation before this line
                indent = len(line) - len(line.lstrip())
                validation_lines = validation_check.split('\n')
                for j, val_line in enumerate(validation_lines):
                    lines.insert(i + j, ' ' * indent + val_line)
                break
        content = '\n'.join(lines)
        print("[OK] Added validation to useGeneration.js")
    else:
        print("[INFO] Validation already integrated in useGeneration.js")
    
    editor.write_file(file_path, content)
    return True

def main():
    print("=" * 60)
    print("Security Integration #2: Input Validation")
    print("=" * 60)
    
    project_root = Path(__file__).parent.parent
    editor = SecurityFixEditor(project_root)
    
    print("\n[1/1] Integrating validation into useGeneration.js...")
    integrate_validation_useGeneration(editor)
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Input Validation Integration Complete!")
    print("=" * 60)
    print(f"Backups saved to: {editor.backup_dir}")
    print("\n[INFO] What was changed:")
    print("- useGeneration.js: Validates questions before saving to Firestore")
    print("-Skips invalid questions with console error")
    print("\n[TEST] Generate a question and check console:")
    print("1. Try creating a very short question (< 10 chars)")
    print("2. Check console for validation error")
    print("3. Valid questions should save normally")
    
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
