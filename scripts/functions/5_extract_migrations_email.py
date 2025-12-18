#!/usr/bin/env python3
"""
Phase 5: Extract Migrations and Email Functions
Extracts migration and email functions to respective directories
"""

import os
import re
import sys

# Paths
FUNCTIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'functions')
INDEX_JS_PATH = os.path.join(FUNCTIONS_DIR, 'index.js')
MIGRATIONS_DIR = os.path.join(FUNCTIONS_DIR, 'migrations')
EMAIL_DIR = os.path.join(FUNCTIONS_DIR, 'email')

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

def create_module(function_name, func_code, output_dir, requires_admin=False):
    """Create a module file"""
    header = '''const functions = require("firebase-functions");
const admin = require("firebase-admin");

'''
    
    if requires_admin:
        header += '''// Import utility functions
const { isAdminUser } = require("../utils/isAdminUser");

'''
    
    output_path = os.path.join(output_dir, f"{function_name}.js")
    with open(output_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(header)
        f.write(func_code)
        f.write('\n')
    
    print(f"✓ Created {function_name}.js")
    return output_path

def main():
    """Main extraction workflow"""
    print("=" * 60)
    print("Phase 5: Extract Migrations & Email Functions")
    print("=" * 60)
    print()
    
    # Create directories
    for dir_path in [MIGRATIONS_DIR, EMAIL_DIR]:
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
            print(f"✓ Created directory: {dir_path}")
    
    # Functions to extract
    functions_to_extract = [
        ('migrateTranslations', MIGRATIONS_DIR, True),
        ('importAIScores', MIGRATIONS_DIR, True),
        ('sendReviewerInvites', EMAIL_DIR, True),
    ]
    
    # Check for existing files
    existing_files = []
    for func_name, output_dir, _ in functions_to_extract:
        output_path = os.path.join(output_dir, f"{func_name}.js")
        if os.path.exists(output_path):
            existing_files.append(f"{func_name}.js")
    
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
    
    # Extract each function
    extracted_count = 0
    for func_name, output_dir, requires_admin in functions_to_extract:
        print(f"Extracting {func_name}...")
        func_code = extract_cloud_function(content, func_name)
        
        if func_code is None:
            print(f"❌ ERROR: Could not find function: {func_name}")
            continue
        
        print(f"   Found {len(func_code)} characters")
        create_module(func_name, func_code, output_dir, requires_admin)
        extracted_count += 1
        print()
    
    print("=" * 60)
    print(f"✅ Successfully extracted {extracted_count}/{len(functions_to_extract)} functions")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the generated files in functions/migrations/ and functions/email/")
    print("2. Run: git add functions/migrations functions/email")
    print("3. Run: git commit -m 'refactor: extract migrations and email'")
    print("4. Continue with Phase 6: python scripts/functions/6_rewrite_index.py")

if __name__ == "__main__":
    main()
