#!/usr/bin/env python3
"""
Phase 7: Verify Exports
Verifies that all expected exports are present in the new thin entrypoint
"""

import os
import re
import sys

# Paths
FUNCTIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'functions')
INDEX_JS_PATH = os.path.join(FUNCTIONS_DIR, 'index.js')

# Expected exports
EXPECTED_EXPORTS = [
    # AI Functions
    'generateQuestions',
    'generateCritique',
    # Invite Functions
    'validateInvite',
    'consumeInvite',
    'createInvite',
    'revokeInvite',
    # User Functions
    'listRegisteredUsers',
    'changeUserRole',
    'revokeUserAccess',
    'checkUserRegistration',
    'setupInitialAdmin',
    # Migration Functions
    'migrateTranslations',
    'importAIScores',
    # Email Functions
    'sendReviewerInvites',
]

def check_module_files_exist():
    """Check that all module files exist"""
    print("Checking module files...")
    
    modules_to_check = [
        ('ai/generateQuestions.js', 'AI'),
        ('ai/generateCritique.js', 'AI'),
        ('invites/validateInvite.js', 'Invites'),
        ('invites/consumeInvite.js', 'Invites'),
        ('invites/createInvite.js', 'Invites'),
        ('invites/revokeInvite.js', 'Invites'),
        ('users/listRegisteredUsers.js', 'Users'),
        ('users/changeUserRole.js', 'Users'),
        ('users/revokeUserAccess.js', 'Users'),
        ('users/checkUserRegistration.js', 'Users'),
        ('users/setupInitialAdmin.js', 'Users'),
        ('migrations/migrateTranslations.js', 'Migrations'),
        ('migrations/importAIScores.js', 'Migrations'),
        ('email/sendReviewerInvites.js', 'Email'),
        ('utils/isAdminUser.js', 'Utils'),
        ('utils/rateLimit.js', 'Utils'),
        ('utils/apiUsage.js', 'Utils'),
        ('utils/grounding.js', 'Utils'),
    ]
    
    missing_files = []
    for module_path, category in modules_to_check:
        full_path = os.path.join(FUNCTIONS_DIR, module_path)
        if not os.path.exists(full_path):
            missing_files.append((module_path, category))
        else:
            print(f"  ✓ {module_path}")
    
    if missing_files:
        print()
        print("❌ Missing module files:")
        for path, category in missing_files:
            print(f"  - {path} ({category})")
        return False
    
    print(f"✓ All {len(modules_to_check)} module files exist")
    return True

def check_index_exports():
    """Check that index.js has all required Object.assign() calls"""
    print()
    print("Checking index.js exports...")
    
    with open(INDEX_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for Object.assign patterns
    assign_pattern = r'Object\.assign\(exports,\s*require\("\./([\w/]+)"\)\)'
    matches = re.findall(assign_pattern, content)
    
    print(f"  Found {len(matches)} Object.assign() calls")
    
    if len(matches) < len(EXPECTED_EXPORTS):
        print(f"⚠️  WARNING: Expected at least {len(EXPECTED_EXPORTS)} assigns")
    
    # Verify each expected export can be found
    missing_requires = []
    for export_name in EXPECTED_EXPORTS:
        # Check if this export is imported (rough check)
        if export_name not in content:
            missing_requires.append(export_name)
    
    if missing_requires:
        print()
        print("❌ Missing exports in index.js:")
        for name in missing_requires:
            print(f"  - {name}")
        return False
    
    print(f"✓ All {len(EXPECTED_EXPORTS)} expected exports are referenced")
    return True

def check_index_size():
    """Check that index.js is thin (<200 lines)"""
    print()
    print("Checking index.js size...")
    
    with open(INDEX_JS_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    line_count = len(lines)
    print(f"  index.js has {line_count} lines")
    
    if line_count > 200:
        print(f"⚠️  WARNING: index.js should be <200 lines (currently {line_count})")
        return False
    
    print(f"✓ index.js is thin ({line_count} lines < 200)")
    return True

def main():
    """Run all verification checks"""
    print("=" * 60)
    print("Phase 7: Verify Exports")
    print("=" * 60)
    print()
    
    all_pass = True
    
    all_pass &= check_module_files_exist()
    all_pass &= check_index_exports()
    all_pass &= check_index_size()
    
    print()
    print("=" * 60)
    if all_pass:
        print("✅ PASS: All verification checks passed")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Test with Firebase emulator: firebase emulators:start --only functions")
        print("2. Deploy to Firebase: firebase deploy --only functions")
        print("3. Tag release: git tag refactor-functions-modular")
        sys.exit(0)
    else:
        print("❌ FAIL: Some verification checks failed")
        print("=" * 60)
        print()
        print("Please review the errors above and fix them before deploying.")
        sys.exit(1)

if __name__ == "__main__":
    main()
