# -*- coding: utf-8 -*-
"""
Phase 1.2: Environment Configuration Validator
Ensures Firebase configs use environment variables correctly
"""

import sys
from pathlib import Path
import re

sys.path.insert(0, str(Path(__file__).parent))
from deployment_helper import DeploymentHelper

def main():
    project_root = Path(__file__).parent.parent.parent
    helper = DeploymentHelper(project_root)
    
    helper.print_header("Phase 1.2: Environment Configuration Validator")
    
    errors = []
    
    # Check firebase.js uses import.meta.env
    helper.print_section("Checking Firebase configuration")
    firebase_config = helper.read_file('src/services/firebase.js')
    
    if firebase_config:
        if 'import.meta.env' in firebase_config:
            helper.log("Firebase config uses environment variables", 'SUCCESS')
        else:
            errors.append("Firebase config should use import.meta.env")
            helper.log("Firebase config doesn't use environment variables", 'ERROR')
        
        # Check for hardcoded keys in firebase config
        if re.search(r'apiKey:\s*["\']AIza', firebase_config):
            helper.log("Fallback API keys found (acceptable for dev)", 'WARNING')
    
    # Check .env.example has all required variables
    helper.print_section("Validating .env.example")
    env_example = helper.read_file('.env.example')
    
    required_vars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID'
    ]
    
    if env_example:
        for var in required_vars:
            if var in env_example:
                helper.log(f"{var} present", 'SUCCESS')
            else:
                errors.append(f"Missing {var} in .env.example")
                helper.log(f"{var} missing", 'ERROR')
    
    # Summary
    helper.print_section("Summary")
    if errors:
        helper.log(f"Found {len(errors)} configuration error(s)", 'ERROR')
        return 1
    else:
        helper.log("Environment configuration validated successfully!", 'SUCCESS')
        return 0

if __name__ == "__main__":
    sys.exit(main())
