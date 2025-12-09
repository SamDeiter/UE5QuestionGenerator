# -*- coding: utf-8 -*-
"""
Master Deployment Script
Orchestrates the entire deployment pipeline
"""

import sys
from pathlib import Path
import argparse
import subprocess

sys.path.insert(0, str(Path(__file__).parent))
from deployment_helper import DeploymentHelper

def run_script(helper, script_name, args=None):
    """Run a deployment script"""
    script_path = Path(__file__).parent / script_name
    
    cmd = f'python "{script_path}"'
    if args:
        cmd += f' {args}'
    
    helper.log(f"Running {script_name}...")
    result = subprocess.run(cmd, shell=True, cwd=helper.project_root)
    
    if result.returncode != 0:
        helper.log(f"{script_name} failed with exit code {result.returncode}", 'ERROR')
        return False
    
    return True

def main():
    parser = argparse.ArgumentParser(description='Master deployment script')
    parser.add_argument('--version', required=True, help='Version number (e.g., 1.7.0)')
    parser.add_argument('--skip-checks', action='store_true', help='Skip pre-deployment checks')
    parser.add_argument('--dry-run', action='store_true', help='Run checks only, do not deploy')
    args = parser.parse_args()
    
    project_root = Path(__file__).parent.parent.parent
    helper = DeploymentHelper(project_root)
    
    helper.print_header(f"Master Deployment Pipeline - v{args.version}")
    
    # Phase 1: Pre-deployment checks
    if not args.skip_checks:
        helper.print_section("Phase 1: Pre-Deployment Validation")
        
        if not run_script(helper, '01_pre_deploy_checks.py'):
            helper.log("Pre-deployment checks failed", 'ERROR')
            if not helper.confirm("Continue anyway?"):
                return 1
        
        if not run_script(helper, '02_environment_validator.py'):
            helper.log("Environment validation failed", 'ERROR')
            if not helper.confirm("Continue anyway?"):
                return 1
    
    if args.dry_run:
        helper.log("Dry run complete - deployment cancelled", 'WARNING')
        return 0
    
    # Phase 2: Create release branch
    helper.print_section("Phase 2: Branch Management")
    
    if not run_script(helper, '03_branch_merger.py', f'--version {args.version}'):
        helper.log("Branch creation failed", 'ERROR')
        return 1
    
    # Manual UAT reminder
    helper.print_section("Phase 3: User Acceptance Testing")
    helper.log("MANUAL STEP: Perform UAT on staging environment")
    helper.log("Test these critical flows:")
    helper.log("  1. Google OAuth login/logout")
    helper.log("  2. Question generation with Gemini")
    helper.log("  3. Firestore data persistence")
    helper.log("  4. Review workflow")
    helper.log("  5. Export to Google Sheets")
    
    if not helper.confirm("UAT passed and ready to deploy to production?"):
        helper.log("Deployment cancelled - UAT not completed", 'WARNING')
        return 1
    
    # Phase 4: Production deployment
    helper.print_section("Phase 4: Production Deployment")
    
    if not run_script(helper, '05_deploy_production.py', f'--version {args.version}'):
        helper.log("Production deployment failed", 'ERROR')
        return 1
    
    # Phase 5: Health checks
    helper.print_section("Phase 5: Health Checks")
    
    if not run_script(helper, '07_health_check.py'):
        helper.log("Health checks failed", 'ERROR')
        helper.log("Consider rolling back with: python 09_rollback_frontend.py", 'WARNING')
        return 1
    
    # Success!
    helper.print_section("Deployment Complete!")
    helper.log(f"Version {args.version} successfully deployed to production!", 'SUCCESS')
    helper.log("Next steps:")
    helper.log("  1. Monitor Firebase console for errors")
    helper.log("  2. Verify site functionality at https://samdeiter.github.io/UE5QuestionGenerator/")
    helper.log(f"  3. If issues occur, rollback with: python tools/deploy/09_rollback_frontend.py")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
