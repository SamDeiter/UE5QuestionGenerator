#!/usr/bin/env python3
"""
Phase 4: Extract User Management Functions
Extracts user-related functions to functions/users/
"""

import os
import re
import sys

# Paths
FUNCTIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'functions')
INDEX_JS_PATH = os.path.join(FUNCTIONS_DIR, 'index.js')
USERS_DIR = os.path.join(FUNCTIONS_DIR, 'users')

# Force flag
FORCE = '--force' in sys.argv

def read_index_js():
    """Read the entire index.js file"""
    with open(INDEX_JS_PATH, 'r', encoding='utf-8') as f:
        return f.read()

def extract_cloud_function(content, function_name):
    """Extract a Firebase Cloud Function export"""
    pattern = rf'exports\.{function_name}\s*=\s*functions.*?;(?=\s*(?:exports\.|/\*\*|async function|function|$))'
    
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return None
    
    func_code = match.group(0)
    
    # Find JSDoc comment above
    start_pos = match.start()
    jsdoc_pattern = r'/\*\*.*?\*/\s*$'
    text_before = content[:start_pos]
    jsdoc_match = re.search(jsdoc_pattern, text_before, re.DOTALL)
    
    if jsdoc_match:
        jsdoc = jsdoc_match.group(0)
        func_code = jsdoc + '\n' + func_code
    
    return func_code

def create_user_module(function_name, func_code):
    """Create a user management module file"""
    header = '''const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Import utility functions
const { isAdminUser } = require("../utils/isAdminUser");

'''
    
    output_path = os.path.join(USERS_DIR, f"{function_name}.js")
    with open(output_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(header)
        f.write(func_code)
        f.write('\n')
    
    print(f"✓ Created {function_name}.js")
    return output_path

def main():
    """Main extraction workflow"""
    print("=" * 60)
    print("Phase 4: Extract User Management Functions")
    print("=" * 60)
    print()
    
    # Create users directory
    if not os.path.exists(USERS_DIR):
        os.makedirs(USERS_DIR)
        print(f"✓ Created directory: {USERS_DIR}")
    
    # Functions to extract
    user_functions = [
        'listRegisteredUsers',
        'changeUserRole',
        'revokeUserAccess',
        'checkUserRegistration',
        'setupInitialAdmin'
    ]
    
    # Check for existing files
    existing_files = []
    for func in user_functions:
        output_path = os.path.join(USERS_DIR, f"{func}.js")
        if os.path.exists(output_path):
            existing_files.append(f"{func}.js")
    
    if existing_files and not FORCE:
        print(f"⚠️  ERROR: Files already exist:")
        for f in existing_files:
            print(f"    - {f}")
        print()
        print("Use --force flag to overwrite")
        sys.exit(1)
    
    # Read index.js
    print("Reading index.js...")
    content = read_index_js()
    print(f"✓ Loaded {len(content)} characters")
    print()
    
    # Extract each user function
    extracted_count = 0
    for func_name in user_functions:
        print(f"Extracting {func_name}...")
        func_code = extract_cloud_function(content, func_name)
        
        if func_code is None:
            print(f"❌ ERROR: Could not find function: {func_name}")
            continue
        
        print(f"   Found {len(func_code)} characters")
        create_user_module(func_name, func_code)
        extracted_count += 1
        print()
    
    print("=" * 60)
    print(f"✅ Successfully extracted {extracted_count}/{len(user_functions)} user functions")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the generated files in functions/users/")
    print("2. Run: git add functions/users")
    print("3. Run: git commit -m 'refactor: extract user management'")
    print("4. Continue with Phase 5: python scripts/functions/5_extract_migrations_email.py")

if __name__ == "__main__":
    main()
