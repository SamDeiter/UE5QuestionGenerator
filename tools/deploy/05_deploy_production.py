# -*- coding: utf-8 -*-
"""
Phase 3: Production Deployment
Merges release to main and tags the release
"""

import sys
from pathlib import Path
import argparse

sys.path.insert(0, str(Path(__file__).parent))
from deployment_helper import DeploymentHelper

def main():
    parser = argparse.ArgumentParser(description='Deploy to production')
    parser.add_argument('--version', required=True, help='Version number (e.g., 1.7.0)')
    args = parser.parse_args()
    
    project_root = Path(__file__).parent.parent.parent
    helper = DeploymentHelper(project_root)
    
    helper.print_header(f"Phase 3: Production Deployment v{args.version}")
    
    # Confirm deployment
    if not helper.confirm(f"Deploy version {args.version} to PRODUCTION?"):
        helper.log("Deployment cancelled by user", 'WARNING')
        return 1
    
    release_branch = f"release/v{args.version}"
    
    # Checkout main
    helper.print_section("Merging to main branch")
    helper.run_command('git checkout main')
    helper.run_command('git pull origin main')
    
    # Merge release branch
    helper.run_command(f'git merge {release_branch} --no-ff -m "Release v{args.version}"')
    
    # Create git tag
    helper.print_section(f"Creating tag v{args.version}")
    helper.run_command(f'git tag -a v{args.version} -m "Release version {args.version}"')
    
    # Push to GitHub
    helper.print_section("Pushing to GitHub")
    helper.run_command('git push origin main')
    helper.run_command(f'git push origin v{args.version}')
    
    helper.print_section("Summary")
    helper.log(f"Version {args.version} deployed to production!", 'SUCCESS')
    helper.log("GitHub Pages will auto-deploy in ~2-3 minutes")
    helper.log("Run health checks after deployment completes")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
