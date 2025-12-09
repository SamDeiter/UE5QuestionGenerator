# -*- coding: utf-8 -*-
"""
Phase 1.1: Pre-Deployment Checks
Validates code quality, security, and readiness for deployment
"""

import sys
from pathlib import Path
import re

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))
from deployment_helper import DeploymentHelper

class PreDeploymentChecker:
    def __init__(self, helper):
        self.helper = helper
        self.errors = []
        self.warnings = []
    
    def check_console_logs(self):
        """Check for console.log statements in source code"""
        self.helper.print_section("Checking for console.log statements")
        
        src_dir = self.helper.project_root / 'src'
        console_logs = []
        
        for file in src_dir.rglob('*.js'):
            content = self.helper.read_file(file)
            if content and 'console.log' in content:
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    if 'console.log' in line and not line.strip().startswith('//'):
                        console_logs.append(f"{file.name}:{i}")
        
        for file in src_dir.rglob('*.jsx'):
            content = self.helper.read_file(file)
            if content and 'console.log' in content:
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    if 'console.log' in line and not line.strip().startswith('//'):
                        console_logs.append(f"{file.name}:{i}")
        
        if console_logs:
            self.warnings.append(f"Found {len(console_logs)} console.log statements")
            for log in console_logs[:5]:  # Show first 5
                self.helper.log(f"  - {log}", 'WARNING')
            if len(console_logs) > 5:
                self.helper.log(f"  ... and {len(console_logs) - 5} more", 'WARNING')
        else:
            self.helper.log("No console remaining console.log statements found", 'SUCCESS')
        
        return len(console_logs) == 0
    
    def check_hardcoded_keys(self):
        """Check for hardcoded API keys or secrets"""
        self.helper.print_section("Checking for hardcoded secrets")
        
        suspicious_patterns = [
            r'apiKey\s*[:=]\s*["\']AIza[A-Za-z0-9_-]{35}["\']',
            r'["\'][A-Za-z0-9_-]{20,}["\']',  # Long base64-like strings
        ]
        
        src_dir = self.helper.project_root / 'src'
        found_secrets = []
        
        for file in src_dir.rglob('*.js'):
            if 'firebase.js' in str(file):  # Skip firebase config (has fallbacks)
                continue
            
            content = self.helper.read_file(file)
            if not content:
                continue
            
            for pattern in suspicious_patterns:
                matches = re.finditer(pattern, content)
                for match in matches:
                    found_secrets.append(f"{file.name}: {match.group()[:30]}...")
        
        if found_secrets:
            self.errors.append("Found potential hardcoded secrets")
            for secret in found_secrets[:3]:
                self.helper.log(f"  - {secret}", 'ERROR')
        else:
            self.helper.log("No hardcoded secrets detected", 'SUCCESS')
        
        return len(found_secrets) == 0
    
    def check_env_file(self):
        """Verify .env.example exists and .env is in .gitignore"""
        self.helper.print_section("Checking environment configuration")
        
        # Check .env.example exists
        if not self.helper.file_exists('.env.example'):
            self.errors.append(".env.example file is missing")
            self.helper.log(".env.example not found", 'ERROR')
        else:
            self.helper.log(".env.example exists", 'SUCCESS')
        
        # Check .gitignore contains .env
        gitignore = self.helper.read_file('.gitignore')
        if gitignore and '.env' in gitignore:
            self.helper.log(".env is properly gitignored", 'SUCCESS')
        else:
            self.errors.append(".env not in .gitignore")
            self.helper.log(".env should be in .gitignore", 'ERROR')
        
        return len(self.errors) == 0
    
    def check_git_status(self):
        """Ensure working directory is clean"""
        self.helper.print_section("Checking git status")
        
        if self.helper.get_git_status():
            self.helper.log("Working directory is clean", 'SUCCESS')
            return True
        else:
            self.warnings.append("Working directory has uncommitted changes")
            self.helper.log("Working directory has uncommitted changes", 'WARNING')
            return False
    
    def check_dependencies(self):
        """Check that package.json dependencies are up to date"""
        self.helper.print_section("Checking dependencies")
        
        if not self.helper.file_exists('package.json'):
            self.errors.append("package.json not found")
            return False
        
        if not self.helper.file_exists('package-lock.json'):
            self.warnings.append("package-lock.json not found - dependencies may not be locked")
        
        self.helper.log("Dependencies check completed", 'SUCCESS')
        return True
    
    def run_all_checks(self):
        """Run all pre-deployment checks"""
        self.helper.print_header("Phase 1.1: Pre-Deployment Checks")
        
        checks = [
            self.check_git_status(),
            self.check_env_file(),
            self.check_console_logs(),
            self.check_hardcoded_keys(),
            self.check_dependencies()
        ]
        
        # Summary
        self.helper.print_section("Summary")
        
        if self.errors:
            self.helper.log(f"Found {len(self.errors)} error(s):", 'ERROR')
            for error in self.errors:
                self.helper.log(f"  - {error}", 'ERROR')
        
        if self.warnings:
            self.helper.log(f"Found {len(self.warnings)} warning(s):", 'WARNING')
            for warning in self.warnings:
                self.helper.log(f"  - {warning}", 'WARNING')
        
        if not self.errors and not self.warnings:
            self.helper.log("All pre-deployment checks passed!", 'SUCCESS')
            return True
        elif not self.errors:
            self.helper.log("Pre-deployment checks passed with warnings", 'SUCCESS')
            return True
        else:
            self.helper.log("Pre-deployment checks FAILED", 'ERROR')
            return False

def main():
    project_root = Path(__file__).parent.parent.parent
    helper = DeploymentHelper(project_root)
    
    checker = PreDeploymentChecker(helper)
    success = checker.run_all_checks()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
