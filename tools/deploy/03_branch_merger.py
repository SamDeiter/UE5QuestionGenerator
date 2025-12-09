# -*- coding: utf-8 -*-
"""
Phase 2.1: Branch Merger
Creates release branch and merges develop
"""

import sys
from pathlib import Path
import argparse

sys.path.insert(0, str(Path(__file__).parent))
from deployment_helper import DeploymentHelper

def main():
    parser = argparse.ArgumentParser(description='Create release branch')
    parser.add_argument('--version', required=True, help='Version number (e.g., 1.7.0)')
    parser.add_argument('--dev-branch', default='develop', help='Development branch name')
    args = parser.parse_args()
    
    project_root = Path(__file__).parent.parent.parent
    helper = DeploymentHelper(project_root)
    
    helper.print_header(f"Phase 2.1: Creating Release Branch v{args.version}")
    
    # Check current branch
    current_branch = helper.get_git_branch()
    helper.log(f"Current branch: {current_branch}")
    
    # Checkout and update develop branch
    helper.print_section(f"Updating {args.dev_branch} branch")
    helper.run_command(f'git checkout {args.dev_branch}')
    helper.run_command(f'git pull origin {args.dev_branch}')
    
    # Create release branch
    release_branch = f"release/v{args.version}"
    helper.print_section(f"Creating {release_branch}")
    
    result = helper.run_command(f'git checkout -b {release_branch}', check=False)
    if result.returncode != 0:
        helper.log(f"Branch {release_branch} may already exist", 'WARNING')
        helper.run_command(f'git checkout {release_branch}')
    
    # Update version in package.json
    helper.print_section("Updating package.json version")
    package_json = helper.read_file('package.json')
    if package_json:
        import json
        pkg = json.loads(package_json)
        pkg['version'] = args.version
        helper.write_file('package.json', json.dumps(pkg, indent=2))
        helper.log(f"Updated version to {args.version}", 'SUCCESS')
        
        # Commit version change
        helper.run_command('git add package.json')
        helper.run_command(f'git commit -m "chore: bump version to {args.version}"', check=False)
    
    # Push release branch
    helper.print_section("Pushing release branch")
    helper.run_command(f'git push origin {release_branch}')
    
    helper.print_section("Summary")
    helper.log(f"Release branch {release_branch} created successfully!", 'SUCCESS')
    helper.log(f"Next steps:")
    helper.log(f"1. Run pre-deployment checks")
    helper.log(f"2. Deploy to staging for UAT")
    helper.log(f"3. Create PR to main for production deployment")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
