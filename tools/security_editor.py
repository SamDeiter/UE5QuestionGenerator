# -*- coding: utf-8 -*-
"""
Security Fix Script Infrastructure
Provides utilities for safely modifying source files with automatic backups
"""

import os
import re
import shutil
from pathlib import Path
from datetime import datetime

class SecurityFixEditor:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.backup_dir = self.project_root / 'tools' / 'security_backups'
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def backup_file(self, file_path):
        """Create timestamped backup of file"""
        file_path = Path(file_path)
        if not file_path.exists():
            print(f"[WARN] File does not exist: {file_path}")
            return False
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"{file_path.stem}_{timestamp}{file_path.suffix}"
        backup_path = self.backup_dir / backup_name
        
        try:
            shutil.copy2(file_path, backup_path)
            print(f"[OK] Backed up {file_path.name} to {backup_path}")
            return True
        except Exception as e:
            print(f"[ERROR] Backup failed: {e}")
            return False
    
    def read_file(self, file_path):
        """Read file content"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"[ERROR] Failed to read {file_path}: {e}")
            return None
    
    def write_file(self, file_path, content):
        """Write content to file"""
        try:
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            print(f"[OK] Updated {Path(file_path).name}")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to write {file_path}: {e}")
            return False
    
    def replace_in_file(self, file_path, search, replace, backup=True):
        """Replace text in file with optional backup"""
        file_path = Path(file_path)
        
        if backup:
            if not self.backup_file(file_path):
                return False
        
        content = self.read_file(file_path)
        if content is None:
            return False
        
        if search not in content:
            print(f"[WARN] Search pattern not found in {file_path.name}")
            return False
        
        new_content = content.replace(search, replace)
        return self.write_file(file_path, new_content)
    
    def add_import(self, file_path, import_statement, after_imports=True):
        """Add import statement to file"""
        content = self.read_file(file_path)
        if content is None:
            return False
        
        # Check if import already exists
        if import_statement in content:
            print(f"[INFO] Import already exists in {Path(file_path).name}")
            return True
        
        lines = content.split('\n')
        
        if after_imports:
            # Find last import line
            last_import_idx = 0
            for i, line in enumerate(lines):
                if line.strip().startswith('import ') or line.strip().startswith('from '):
                    last_import_idx = i
            
            # Insert after last import
            lines.insert(last_import_idx + 1, import_statement)
        else:
            # Insert at beginning
            lines.insert(0, import_statement)
        
        new_content = '\n'.join(lines)
        return self.write_file(file_path, new_content)
    
    def install_npm_package(self, package_name):
        """Install npm package"""
        import subprocess
        try:
            print(f"[INFO] Installing {package_name}...")
            
            # Use full path to npm on Windows
            npm_cmd = r'C:\Progra~1\nodejs\npm.cmd'
            
            result = subprocess.run(
                [npm_cmd, 'install', package_name],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                shell=False
            )
            if result.returncode == 0:
                print(f"[OK] Installed {package_name}")
                return True
            else:
                print(f"[ERROR] Failed to install {package_name}: {result.stderr}")
                return False
        except Exception as e:
            print(f"[ERROR] npm install failed: {e}")
            return False

if __name__ == "__main__":
    # Test the editor
    project_root = Path(__file__).parent.parent
    editor = SecurityFixEditor(project_root)
    print(f"Security Fix Editor initialized")
    print(f"Project root: {editor.project_root}")
    print(f"Backup directory: {editor.backup_dir}")
