#!/usr/bin/env python3
"""
Phase 6: Rewrite index.js as Thin Entrypoint
Backs up original index.js and rewrites it to import all modular functions
"""

import os
import shutil
import sys

# Paths
FUNCTIONS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'functions')
INDEX_JS_PATH = os.path.join(FUNCTIONS_DIR, 'index.js')
BACKUP_PATH = os.path.join(FUNCTIONS_DIR, 'index.js.backup')

# Force flag
FORCE = '--force' in sys.argv

NEW_INDEX_CONTENT = '''const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Load environment variables from .env file (for local development)
require("dotenv").config();

admin.initializeApp();

// ============================================================================
// AI Functions
// ============================================================================
Object.assign(exports, require("./ai/generateQuestions"));
Object.assign(exports, require("./ai/generateCritique"));

// ============================================================================
// Invite Functions
// ============================================================================
Object.assign(exports, require("./invites/validateInvite"));
Object.assign(exports, require("./invites/consumeInvite"));
Object.assign(exports, require("./invites/createInvite"));
Object.assign(exports, require("./invites/revokeInvite"));

// ============================================================================
// User Management Functions
// ============================================================================
Object.assign(exports, require("./users/listRegisteredUsers"));
Object.assign(exports, require("./users/changeUserRole"));
Object.assign(exports, require("./users/revokeUserAccess"));
Object.assign(exports, require("./users/checkUserRegistration"));
Object.assign(exports, require("./users/setupInitialAdmin"));

// ============================================================================
// Migration Functions
// ============================================================================
Object.assign(exports, require("./migrations/migrateTranslations"));
Object.assign(exports, require("./migrations/importAIScores"));

// ============================================================================
// Email Functions
// ============================================================================
Object.assign(exports, require("./email/sendReviewerInvites"));
'''

def main():
    """Main rewrite workflow"""
    print("=" * 60)
    print("Phase 6: Rewrite index.js as Thin Entrypoint")
    print("=" * 60)
    print()
    
    # Check if backup already exists
    if os.path.exists(BACKUP_PATH) and not FORCE:
        print(f"⚠️  ERROR: Backup already exists: {BACKUP_PATH}")
        print("Use --force flag to overwrite")
        sys.exit(1)
    
    # Backup original index.js
    print("Creating backup of original index.js...")
    shutil.copy2(INDEX_JS_PATH, BACKUP_PATH)
    print(f"✓ Backed up to: {BACKUP_PATH}")
    print()
    
    # Write new thin entrypoint
    print("Writing new thin entrypoint...")
    with open(INDEX_JS_PATH, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(NEW_INDEX_CONTENT)
    
    # Count lines
    line_count = len(NEW_INDEX_CONTENT.split('\n'))
    print(f"✓ New index.js created ({line_count} lines)")
    print()
    
    print("=" * 60)
    print("✅ Successfully rewrote index.js as thin entrypoint")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the new index.js")
    print("2. Run: git add functions/index.js")
    print("3. Run: git commit -m 'refactor: thin entrypoint'")
    print("4. Continue with Phase 7: python scripts/functions/7_verify_exports.py")
    print()
    print(f"NOTE: Original file backed up to: {BACKUP_PATH}")

if __name__ == "__main__":
    main()
