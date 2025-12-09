# -*- coding: utf-8 -*-
"""Fix Unicode characters in Python scripts for Windows compatibility"""

import os
from pathlib import Path

project_root = Path(__file__).parent.parent
tools_dir = project_root / 'tools'

# Mapping of Unicode characters to ASCII replacements
replacements = {
    '[OK]': '[OK]',
    '[SUCCESS]': '[SUCCESS]',
    '[ERROR]': '[ERROR]',
    '[WARN]': '[WARN]',
    '[DONE]': '[DONE]',
}

# Get all Python files in tools directory
py_files = list(tools_dir.glob('fix_*.py')) + [tools_dir / 'run_all_fixes.py', tools_dir / 'jsx_editor.py']

for py_file in py_files:
    if not py_file.exists():
        continue
    
    print(f"Processing: {py_file.name}")
    
    try:
        with open(py_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Apply replacements
        for unicode_char, ascii_replacement in replacements.items():
            content = content.replace(unicode_char, ascii_replacement)
        
        with open(py_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  Fixed: {py_file.name}")
    except Exception as e:
        print(f"  Error: {e}")

print("\nAll files processed!")
