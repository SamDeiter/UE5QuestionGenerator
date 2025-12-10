# -*- coding: utf-8 -*-
"""
Phase 5: Frontend Rollback
Reverts the last deployment on GitHub Pages
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from deployment_helper import DeploymentHelper

def main():
    project_root = Path(__file__).parent.parent.parent
    helper = DeploymentHelper(project_root)
    
    helper.print_header("Phase 5: Frontend Rollback (EMERGENCY)")
    
    # Confirm rollback
    if not helper.confirm("ROLLBACK production deployment?"):
        helper.log("Rollback cancelled", 'WARNING')
        return 1
    
    # Checkout main
    helper.print_section("Reverting last commit on main")
    helper.run_command('git checkout main')
    helper.run_command('git pull origin main')
    
    # Show last commit
    result = helper.run_command('git log -1 --oneline')
    helper.log(f"Last commit: {result.stdout.strip()}")
    
    # Revert
    helper.run_command('git revert HEAD --no-edit')
    
    # Push
    helper.print_section("Pushing rollback to GitHub")
    helper.run_command('git push origin main')
    
    helper.print_section("Summary")
    helper.log("Rollback initiated!", 'SUCCESS')
    helper.log("GitHub Pages will redeploy in ~2-3 minutes")
    helper.log("Monitor site to confirm rollback is successful")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
