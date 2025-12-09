# -*- coding: utf-8 -*-
"""
Phase 4: Health Checks
Verifies production deployment is healthy
"""

import sys
from pathlib import Path
import urllib.request
import urllib.error
import time

sys.path.insert(0, str(Path(__file__).parent))
from deployment_helper import DeploymentHelper

def check_url(url, timeout=10):
    """Check if URL is accessible"""
    try:
        response = urllib.request.urlopen(url, timeout=timeout)
        return response.status == 200
    except (urllib.error.URLError, urllib.error.HTTPError):
        return False

def main():
    project_root = Path(__file__).parent.parent.parent
    helper = DeploymentHelper(project_root)
    
    helper.print_header("Phase 4: Post-Deployment Health Checks")
    
    prod_url = "https://samdeiter.github.io/UE5QuestionGenerator/"
    
    # Wait for GitHub Pages to deploy
    helper.print_section("Waiting for deployment (30 seconds)")
    for i in range(6):
        time.sleep(5)
        helper.log(f"Waiting... {(i+1)*5}s")
    
    # Check main page
    helper.print_section("Checking production URL")
    if check_url(prod_url):
        helper.log(f"Site accessible at {prod_url}", 'SUCCESS')
    else:
        helper.log(f"Site NOT accessible at {prod_url}", 'ERROR')
        return 1
    
    # Check bundle size
    helper.print_section("Checking bundle sizes")
    dist_dir = project_root / 'dist' / 'assets'
    
    if dist_dir.exists():
        js_files = list(dist_dir.glob('*.js'))
        total_size = sum(f.stat().st_size for f in js_files) / 1024  # KB
        
        helper.log(f"Total JS bundle size: {total_size:.2f} KB")
        
        if total_size < 500:
            helper.log("Bundle size is optimal (<500KB)", 'SUCCESS')
        elif total_size < 800:
            helper.log("Bundle size is acceptable (<800KB)", 'WARNING')
        else:
            helper.log("Bundle size is large (>800KB)", 'ERROR')
    else:
        helper.log("Build directory not found - run 'npm run build' first", 'WARNING')
    
    # Summary
    helper.print_section("Summary")
    helper.log("Health checks completed!", 'SUCCESS')
    helper.log("Monitor Firebase console for any errors in the next 15 minutes")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
