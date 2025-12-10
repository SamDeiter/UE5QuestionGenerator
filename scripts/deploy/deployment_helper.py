# -*- coding: utf-8 -*-
"""
Deployment Utility Base Class
Provides common functionality for all deployment scripts
"""

import subprocess
import sys
import json
from pathlib import Path
from datetime import datetime

class DeploymentHelper:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.deploy_dir = self.project_root / 'tools' / 'deploy'
        self.logs_dir = self.deploy_dir / 'logs'
        self.logs_dir.mkdir(exist_ok=True)
        
    def log(self, message, level='INFO'):
        """Log a message with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        prefix = {
            'INFO': '  [INFO]',
            'SUCCESS': '[SUCCESS]',
            'ERROR': '  [ERROR]',
            'WARNING': '[WARNING]'
        }.get(level, '[INFO]')
        
        print(f"{prefix} {message}")
        
        # Also write to log file
        log_file = self.logs_dir / f"deploy_{datetime.now().strftime('%Y%m%d')}.log"
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"{timestamp} {prefix} {message}\n")
    
    def run_command(self, command, cwd=None, check=True):
        """Run a shell command and return output"""
        if cwd is None:
            cwd = self.project_root
        
        self.log(f"Running: {command}")
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True,
                check=check
            )
            
            if result.stdout:
                self.log(f"Output: {result.stdout.strip()}")
            
            return result
        except subprocess.CalledProcessError as e:
            self.log(f"Command failed with exit code {e.returncode}", 'ERROR')
            self.log(f"Error: {e.stderr}", 'ERROR')
            if check:
                raise
            return e
    
    def read_file(self, file_path):
        """Read file contents"""
        path = self.project_root / file_path if not Path(file_path).is_absolute() else Path(file_path)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            self.log(f"Failed to read {file_path}: {e}", 'ERROR')
            return None
    
    def write_file(self, file_path, content):
        """Write content to file"""
        path = self.project_root / file_path if not Path(file_path).is_absolute() else Path(file_path)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with open(path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            self.log(f"Wrote to {file_path}")
            return True
        except Exception as e:
            self.log(f"Failed to write {file_path}: {e}", 'ERROR')
            return False
    
    def get_git_branch(self):
        """Get current git branch"""
        result = self.run_command('git branch --show-current', check=False)
        return result.stdout.strip() if result.returncode == 0 else None
    
    def get_git_status(self):
        """Check if working directory is clean"""
        result = self.run_command('git status --porcelain', check=False)
        return result.stdout.strip() == '' if result.returncode == 0 else False
    
    def file_exists(self, file_path):
        """Check if file exists"""
        path = self.project_root / file_path if not Path(file_path).is_absolute() else Path(file_path)
        return path.exists()
    
    def print_header(self, title):
        """Print a formatted header"""
        print("\n" + "=" * 70)
        print(f"  {title}")
        print("=" * 70 + "\n")
    
    def print_section(self, title):
        """Print a section header"""
        print(f"\n{'-' * 70}")
        print(f"  {title}")
        print(f"{'-' * 70}\n")
    
    def confirm(self, prompt):
        """Ask for user confirmation"""
        response = input(f"\n{prompt} (y/n): ").strip().lower()
        return response == 'y'
    
    def load_package_json(self):
        """Load package.json"""
        content = self.read_file('package.json')
        if content:
            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                self.log(f"Failed to parse package.json: {e}", 'ERROR')
        return None
    
    def get_version(self):
        """Get current version from package.json"""
        pkg = self.load_package_json()
        return pkg.get('version', '0.0.0') if pkg else '0.0.0'
