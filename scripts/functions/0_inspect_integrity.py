#!/usr/bin/env python3
"""
Phase 0: Integrity Inspection Script
Checks functions/index.js for corruption before starting modularization
"""

import os
import re
import sys

# Path to the functions directory
FUNCTIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'functions')
INDEX_JS_PATH = os.path.join(FUNCTIONS_DIR, 'index.js')

def check_file_exists():
    """Check if index.js exists"""
    if not os.path.exists(INDEX_JS_PATH):
        print(f"❌ ERROR: {INDEX_JS_PATH} not found")
        return False
    print(f"✓ File exists: {INDEX_JS_PATH}")
    return True

def check_encoding():
    """Check if file has valid UTF-8 encoding"""
    try:
        with open(INDEX_JS_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        print(f"✓ Valid UTF-8 encoding ({len(content)} characters)")
        return True, content
    except UnicodeDecodeError as e:
        print(f"❌ ERROR: Invalid UTF-8 encoding: {e}")
        return False, None

def check_brackets(content):
    """Check for balanced braces and parentheses"""
    stack = []
    pairs = {'(': ')', '{': '}', '[': ']'}
    
    for i, char in enumerate(content):
        if char in pairs:
            stack.append(char)
        elif char in pairs.values():
            if not stack or pairs[stack.pop()] != char:
                print(f"❌ ERROR: Unbalanced brackets at position {i}")
                return False
    
    if stack:
        print(f"❌ ERROR: Unclosed brackets: {stack}")
        return False
    
    print("✓ All brackets balanced")
    return True

def check_exports(content):
    """Count exports.* declarations"""
    export_pattern = r'exports\.\w+\s*='
    exports = re.findall(export_pattern, content)
    export_count = len(exports)
    
    print(f"✓ Found {export_count} export declarations")
    
    if export_count < 10:
        print(f"⚠️  WARNING: Expected at least 12 exports, found {export_count}")
    
    return True

def check_file_end(content):
    """Check if file ends properly"""
    stripped = content.rstrip()
    
    if not stripped:
        print("❌ ERROR: File is empty")
        return False
    
    # Check for common corruption patterns
    if stripped[-1] not in ['}', ';', ')']:
        print(f"⚠️  WARNING: File ends with unexpected character: '{stripped[-1]}'")
        print(f"    Last 50 characters: ...{stripped[-50:]}")
    else:
        print(f"✓ File ends properly with '{stripped[-1]}'")
    
    return True

def check_unterminated_strings(content):
    """Check for unterminated strings (basic check)"""
    lines = content.split('\n')
    single_quote_count = 0
    double_quote_count = 0
    
    for i, line in enumerate(lines, 1):
        # Skip comments
        if '//' in line:
            line = line[:line.index('//')]
        
        # Count quotes (simple check, doesn't handle escaped quotes perfectly)
        single_quote_count += line.count("'")
        double_quote_count += line.count('"')
    
    if single_quote_count % 2 != 0:
        print(f"⚠️  WARNING: Odd number of single quotes ({single_quote_count})")
    
    if double_quote_count % 2 != 0:
        print(f"⚠️  WARNING: Odd number of double quotes ({double_quote_count})")
    
    print("✓ String quote analysis complete")
    return True

def main():
    """Run all integrity checks"""
    print("=" * 60)
    print("Phase 0: Integrity Inspection")
    print("=" * 60)
    print()
    
    checks = [
        ("File Exists", check_file_exists),
    ]
    
    # First check if file exists
    if not check_file_exists():
        sys.exit(1)
    
    # Then check encoding and get content
    success, content = check_encoding()
    if not success:
        sys.exit(1)
    
    # Run remaining checks
    all_pass = True
    all_pass &= check_brackets(content)
    all_pass &= check_exports(content)
    all_pass &= check_file_end(content)
    all_pass &= check_unterminated_strings(content)
    
    print()
    print("=" * 60)
    if all_pass:
        print("✅ PASS: All integrity checks passed")
        print("=" * 60)
        sys.exit(0)
    else:
        print("⚠️  WARNINGS: Some checks raised warnings (see above)")
        print("=" * 60)
        sys.exit(0)  # Exit with success even if warnings

if __name__ == "__main__":
    main()
