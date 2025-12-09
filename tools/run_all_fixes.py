"""
Master Runner - Execute all UX improvement scripts
Runs all 5 fixes in sequence with error handling.
"""

import sys
from pathlib import Path
import subprocess

def run_script(script_name):
    """Run a Python script and capture output"""
    script_path = Path(__file__).parent / script_name
    
    print(f"\n{'='*60}")
    print(f"Running: {script_name}")
    print('='*60)
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            cwd=script_path.parent
        )
        
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:", result.stderr)
        
        if result.returncode != 0:
            print(f"[ERROR] Script failed with return code {result.returncode}")
            return False
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Error running script: {e}")
        return False


if __name__ == '__main__':
    print("=" * 60)
    print("UX IMPROVEMENTS - MASTER RUNNER")
    print("=" * 60)
    print("This will apply all 5 UX improvements to the codebase")
    print()
    
    scripts = [
        'fix_01_api_banner.py',
        'fix_02_modal_provider.py',
        'fix_03_bulk_actions.py',
        'fix_04_progress_tracking.py',
        'fix_05_autosave.py'
    ]
    
    results = {}
    
    for script in scripts:
        results[script] = run_script(script)
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    for script, success in results.items():
        status = "[SUCCESS] SUCCESS" if success else "[ERROR] FAILED"
        print(f"{status}: {script}")
    
    total_success = sum(results.values())
    print(f"\nCompleted: {total_success}/{len(scripts)} scripts successful")
    
    if total_success == len(scripts):
        print("\n[DONE] All UX improvements applied successfully!")
        print("\nNext steps:")
        print("1. Review the changes in your code editor")
        print("2. Start the dev server: npm run dev")
        print("3. Test each improvement in the browser")
        print(f"4. Check backups in: tools/backups/")
    else:
        print("\n[WARN] Some fixes failed - review errors above")
