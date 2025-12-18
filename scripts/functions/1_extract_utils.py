#!/usr/bin/env python3
"""
Phase 1: Extract Utility Functions
Extracts 4 utility functions from index.js to functions/utils/
"""

import os
import re
import sys

# Paths
FUNCTIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'functions')
INDEX_JS_PATH = os.path.join(FUNCTIONS_DIR, 'index.js')
UTILS_DIR = os.path.join(FUNCTIONS_DIR, 'utils')

# Force flag
FORCE = '--force' in sys.argv

# Utility function definitions to extract
UTILS_TO_EXTRACT = [
    {
        'name': 'isAdminUser',
        'start_pattern': r'async function isAdminUser\(uid\)',
        'end_pattern': r'^\}$',  # Closing brace at start of line
        'output_file': 'isAdminUser.js',
        'description': 'Check if a user is an admin',
    },
    {
        'name': 'checkRateLimit',
        'start_pattern': r'async function checkRateLimit\(userId',
        'end_pattern': r'^\}$',
        'output_file': 'rateLimit.js',
        'description': 'Rate limiting helper function',
    },
    {
        'name': 'logApiUsage',
        'start_pattern': r'async function logApiUsage\(userId, data\)',
        'end_pattern': r'^\}$',
        'output_file': 'apiUsage.js',
        'description': 'Log API usage for analytics',
    },
    {
        'name': 'extractGroundingSources',
        'start_pattern': r'function extractGroundingSources\(responseData\)',
        'end_pattern': r'^\}$',
        'output_file': 'grounding.js',
        'description': 'Extract Google Search grounding sources',
    },
]

def read_index_js():
    """Read the entire index.js file"""
    with open(INDEX_JS_PATH, 'r', encoding='utf-8') as f:
        return f.readlines()

def extract_function(lines, start_pattern, end_pattern):
    """
    Extract a function from the file
    Returns (extracted_lines, start_line_num, end_line_num) or None if not found
    """
    start_idx = None
    end_idx = None
    
    # Find start of function
    for i, line in enumerate(lines):
        if re.search(start_pattern, line):
            # Find JSDoc comment above (if exists)
            jsdoc_start = i
            j = i - 1
            while j >= 0 and (lines[j].strip().startswith('*') or 
                              lines[j].strip().startswith('/**') or
                              lines[j].strip().startswith('//')):
                jsdoc_start = j
                j -= 1
            start_idx = jsdoc_start
            break
    
    if start_idx is None:
        return None
    
    # Find end of function (matching closing brace)
    brace_count = 0
    found_opening = False
    for i in range(start_idx, len(lines)):
        line = lines[i]
        for char in line:
            if char == '{':
                brace_count += 1
                found_opening = True
            elif char == '}':
                brace_count -= 1
                if found_opening and brace_count == 0:
                    end_idx = i
                    break
        if end_idx is not None:
            break
    
    if end_idx is None:
        return None
    
    return (lines[start_idx:end_idx+1], start_idx, end_idx)

def create_module_file(func_lines, output_path, description):
    """Create a module file with the extracted function"""
    header = f'''/**
 * Utility: {description}
 * Extracted from index.js during modularization
 */

const admin = require("firebase-admin");

'''
    
    footer = '''
module.exports = { ''' + os.path.basename(output_path).replace('.js', '') + ''' };
'''
    
    # Write the file
    with open(output_path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(header)
        f.writelines(func_lines)
        f.write('\n' + footer)
    
    print(f"✓ Created {os.path.basename(output_path)}")

def main():
    """Main extraction workflow"""
    print("=" * 60)
    print("Phase 1: Extract Utility Functions")
    print("=" * 60)
    print()
    
    # Check if utils directory exists
    if not os.path.exists(UTILS_DIR):
        os.makedirs(UTILS_DIR)
        print(f"✓ Created directory: {UTILS_DIR}")
    
    # Check for existing files
    existing_files = []
    for util in UTILS_TO_EXTRACT:
        output_path = os.path.join(UTILS_DIR, util['output_file'])
        if os.path.exists(output_path):
            existing_files.append(util['output_file'])
    
    if existing_files and not FORCE:
        print(f"⚠️  ERROR: Files already exist:")
        for f in existing_files:
            print(f"    - {f}")
        print()
        print("Use --force flag to overwrite")
        sys.exit(1)
    
    # Read index.js
    print("Reading index.js...")
    lines = read_index_js()
    print(f"✓ Loaded {len(lines)} lines")
    print()
    
    # Extract each utility function
    extracted_count = 0
    for util in UTILS_TO_EXTRACT:
        print(f"Extracting {util['name']}...")
        result = extract_function(lines, util['start_pattern'], util['end_pattern'])
        
        if result is None:
            print(f"❌ ERROR: Could not find function: {util['name']}")
            continue
        
        func_lines, start_idx, end_idx = result
        print(f"   Found at lines {start_idx+1}-{end_idx+1} ({len(func_lines)} lines)")
        
        # Create module file
        output_path = os.path.join(UTILS_DIR, util['output_file'])
        create_module_file(func_lines, output_path, util['description'])
        extracted_count += 1
        print()
    
    print("=" * 60)
    print(f"✅ Successfully extracted {extracted_count}/{len(UTILS_TO_EXTRACT)} utility functions")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the generated files in functions/utils/")
    print("2. Run: git add functions/utils")
    print("3. Run: git commit -m 'refactor: extract utility functions'")
    print("4. Continue with Phase 2: python scripts/functions/2_extract_ai.py")

if __name__ == "__main__":
    main()
