"""
JSX Editor Utility
Provides safe file editing functions for React/JSX files with automatic backups.
"""

import os
import shutil
import re
from datetime import datetime
from pathlib import Path


class JSXEditor:
    """Utility class for editing JSX files safely."""
    
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / 'tools' / 'backups'
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def backup_file(self, file_path):
        """Create a timestamped backup of a file."""
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{file_path.stem}_{timestamp}{file_path.suffix}"
        backup_path = self.backup_dir / backup_name
        
        shutil.copy2(file_path, backup_path)
        print(f"[OK] Backed up {file_path.name} to {backup_path}")
        return backup_path
    
    def read_file(self, file_path):
        """Read file contents."""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def write_file(self, file_path, content):
        """Write content to file."""
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"[OK] Updated {Path(file_path).name}")
    
    def insert_before(self, content, search_pattern, new_content, regex=False):
        """Insert new content before the first occurrence of search_pattern."""
        if regex:
            match = re.search(search_pattern, content)
            if match:
                pos = match.start()
                return content[:pos] + new_content + content[pos:]
        else:
            pos = content.find(search_pattern)
            if pos != -1:
                return content[:pos] + new_content + content[pos:]
        
        raise ValueError(f"Pattern not found: {search_pattern[:50]}...")
    
    def insert_after(self, content, search_pattern, new_content, regex=False):
        """Insert new content after the first occurrence of search_pattern."""
        if regex:
            match = re.search(search_pattern, content)
            if match:
                pos = match.end()
                return content[:pos] + new_content + content[pos:]
        else:
            pos = content.find(search_pattern)
            if pos != -1:
                end_pos = pos + len(search_pattern)
                return content[:end_pos] + new_content + content[end_pos:]
        
        raise ValueError(f"Pattern not found: {search_pattern[:50]}...")
    
    def replace_content(self, content, search_pattern, replacement, regex=False):
        """Replace content matching search_pattern with replacement."""
        if regex:
            new_content = re.sub(search_pattern, replacement, content, count=1)
            if new_content == content:
                raise ValueError(f"Pattern not found: {search_pattern[:50]}...")
            return new_content
        else:
            if search_pattern not in content:
                raise ValueError(f"Pattern not found: {search_pattern[:50]}...")
            return content.replace(search_pattern, replacement, 1)
    
    def insert_import(self, content, import_statement):
        """Insert an import statement at the top of the file after existing imports."""
        # Find the last import statement
        import_pattern = r'^import .+?;$'
        matches = list(re.finditer(import_pattern, content, re.MULTILINE))
        
        if matches:
            last_import = matches[-1]
            pos = last_import.end()
            return content[:pos] + '\n' + import_statement + content[pos:]
        else:
            # No imports found, insert at the beginning
            return import_statement + '\n\n' + content
    
    def add_prop_to_component(self, content, component_name, prop_name):
        """Add a prop to a component's parameter list."""
        # Find the component function declaration
        pattern = rf'(const {component_name} = \(\{{[^}}]*?)(\}})'
        
        def replacement(match):
            params = match.group(1)
            closing = match.group(2)
            # Add prop with comma if needed
            if params.strip().endswith(','):
                return f"{params} {prop_name}{closing}"
            else:
                return f"{params}, {prop_name}{closing}"
        
        new_content = re.sub(pattern, replacement, content)
        if new_content == content:
            raise ValueError(f"Component {component_name} not found or pattern didn't match")
        
        return new_content
    
    def safe_edit(self, file_path, edit_function):
        """
        Safely edit a file with automatic backup.
        
        Args:
            file_path: Path to the file to edit
            edit_function: Function that takes content string and returns modified content
        """
        file_path = Path(file_path)
        
        # Backup original
        self.backup_file(file_path)
        
        # Read, edit, write
        content = self.read_file(file_path)
        new_content = edit_function(content)
        self.write_file(file_path, new_content)
        
        return new_content


if __name__ == '__main__':
    print("JSX Editor Utility - Ready for use")
    print(f"Backup directory: {Path(__file__).parent / 'backups'}")
