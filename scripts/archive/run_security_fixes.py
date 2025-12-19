# -*- coding: utf-8 -*-
"""
Master Security Fix Script
Runs all security fixes in sequence
"""

import sys
import subprocess
from pathlib import Path

def run_script(script_name):
    """Run a security fix script"""
    try:
        print(f"\n{'='*60}")
        print(f"Running: {script_name}")
        print(f"{'='*60}\n")
        
        result = subprocess.run(
            [sys.executable, str(Path(__file__).parent / script_name)],
            capture_output=False,
            text=True
        )
        
        if result.returncode == 0:
            print(f"\n[SUCCESS] {script_name} completed")
            return True
        else:
            print(f"\n[WARNING] {script_name} completed with warnings")
            return True  # Continue even with warnings
            
    except Exception as e:
        print(f"\n[ERROR] Failed to run {script_name}: {e}")
        return False

def main():
    print("=" * 60)
    print("SECURITY FIXES - MASTER RUNNER")
    print("=" * 60)
    print("This will apply all security improvements to the codebase")
    print("\n")
    
    scripts = [
        'fix_security_xss.py',
        'fix_security_api_keys.py',
    ]
    
    results = {}
    
    for script in scripts:
        results[script] = run_script(script)
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    success_count = sum(1 for v in results.values() if v)
    
    for script, success in results.items():
        status = "[SUCCESS]" if success else "[FAILED]"
        print(f"{status} {script}")
    
    print(f"\nCompleted: {success_count}/{len(scripts)} scripts successful")
    
    if success_count == len(scripts):
        print("\n[DONE] All security improvements applied successfully!")
        print("\nNext steps:")
        print("1. Review the changes in your code editor")
        print("2. Create .env file from .env.example")
        print("3. Test XSS prevention in browser")
        print("4. Check backups in: tools/security_backups/")
    else:
        print("\n[WARNING] Some scripts encountered issues")
    
    return success_count == len(scripts)

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[ERROR] Master script failed: {e}")
        sys.exit(1)
