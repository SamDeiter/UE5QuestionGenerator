"""
Console.log to Logger Migration Script
Migrates console.* calls to use the centralized logger utility.

This script:
1. Adds logger import at the top of the file
2. Replaces console.log -> logger.log
3. Replaces console.warn -> logger.warn
4. Replaces console.error -> logger.error
5. Replaces console.info -> logger.info
6. Replaces console.debug -> logger.debug
"""

import re
import sys
from pathlib import Path

def get_relative_import_path(file_path: str) -> str:
    """Calculate relative import path from file to logger.js"""
    file = Path(file_path)
    logger_path = Path("src/utils/logger.js")
    
    # Calculate relative path
    file_dir = file.parent
    
    # Count directory levels up from file to src
    parts = list(file_dir.parts)
    if 'src' in parts:
        src_index = parts.index('src')
        depth = len(parts) - src_index - 1
        if depth == 0:
            return "./utils/logger"
        else:
            return "../" * depth + "utils/logger"
    return "../utils/logger"

def migrate_file(file_path: str, dry_run: bool = False) -> dict:
    """Migrate a single file to use logger utility"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    stats = {
        'log': 0,
        'warn': 0,
        'error': 0,
        'info': 0,
        'debug': 0,
        'table': 0,
        'group': 0,
    }
    
    # Check if already has logger import
    has_logger_import = 'from' in content and 'logger' in content and '/logger' in content
    
    # Count and replace console.* calls
    for method in ['log', 'warn', 'error', 'info', 'debug', 'table']:
        pattern = rf'console\.{method}\('
        matches = re.findall(pattern, content)
        stats[method] = len(matches)
        content = re.sub(pattern, f'logger.{method}(', content)
    
    # Handle console.group -> logger.group (different signature, leave as-is for now)
    # console.groupEnd -> just remove or leave
    
    total_replaced = sum(stats.values())
    
    if total_replaced == 0:
        return {'file': file_path, 'replaced': 0, 'stats': stats}
    
    # Add logger import if not present and we made replacements
    if not has_logger_import and total_replaced > 0:
        import_path = get_relative_import_path(file_path)
        import_statement = f'import {{ logger }} from "{import_path}";\n'
        
        # Find the best place to add import (after all existing imports)
        # Must handle multi-line imports like: import {\n  foo,\n  bar\n} from "x";
        lines = content.split('\n')
        last_import_end = -1
        in_import = False
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # Check if this line starts an import
            if stripped.startswith('import ') or stripped.startswith('import{'):
                in_import = True
            
            # Check if this line ends an import (has semicolon at end after 'from')
            if in_import:
                if ';' in line:
                    last_import_end = i
                    in_import = False
                # Also handle imports that end with just the module path
                elif stripped.endswith('";') or stripped.endswith("';"):
                    last_import_end = i
                    in_import = False
        
        if last_import_end >= 0:
            # Insert after the last import's closing line
            lines.insert(last_import_end + 1, import_statement.strip())
            content = '\n'.join(lines)
        else:
            # No imports found, add at top after any comments
            content = import_statement + content

    
    if not dry_run:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    return {
        'file': file_path,
        'replaced': total_replaced,
        'stats': stats,
        'import_added': not has_logger_import
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python migrate_console_to_logger.py <file_path> [--dry-run]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    dry_run = '--dry-run' in sys.argv
    
    if not Path(file_path).exists():
        print(f"Error: File not found: {file_path}")
        sys.exit(1)
    
    result = migrate_file(file_path, dry_run)
    
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Migration Results for {result['file']}:")
    print(f"  Total replaced: {result['replaced']}")
    for method, count in result['stats'].items():
        if count > 0:
            print(f"    console.{method} -> logger.{method}: {count}")
    if result.get('import_added'):
        print(f"  Logger import added: Yes")
    
if __name__ == '__main__':
    main()
