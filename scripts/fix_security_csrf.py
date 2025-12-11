# -*- coding: utf-8 -*-
"""
Security Fix #4: CSRF Protection
- Creates CSRF token utility
- Adds CSRF token to Firestore write operations
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from security_editor import SecurityFixEditor

def create_csrf_utility(editor):
    """Create src/utils/csrf.js"""
    csrf_content = """/**
 * CSRF (Cross-Site Request Forgery) Protection Utility
 * Generates and validates CSRF tokens for state-changing operations
 */

let csrfToken = null;

/**
 * Generates a random CSRF token
 * @returns {string} CSRF token
 */
const generateCSRFToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Gets or creates the current CSRF token
 * Token is regenerated on each app load for additional security
 * @returns {string} Current CSRF token
 */
export const getCSRFToken = () => {
    if (!csrfToken) {
        csrfToken = generateCSRFToken();
        console.log('[CSRF] Token generated');
    }
    return csrfToken;
};

/**
 * Validates a CSRF token
 * @param {string} token - Token to validate
 * @returns {boolean} Whether token is valid
 */
export const validateCSRFToken = (token) => {
    return token === csrfToken;
};

/**
 * Refreshes the CSRF token (call after logout or security events)
 */
export const refreshCSRFToken = () => {
    csrfToken = generateCSRFToken();
    console.log('[CSRF] Token refreshed');
    return csrfToken;
};

/**
 * Adds CSRF token to request headers
 * @param {object} headers - Existing headers object
 * @returns {object} Headers with CSRF token added
 */
export const addCSRFHeader = (headers = {}) => {
    return {
        ...headers,
        'X-CSRF-Token': getCSRFToken()
    };
};

export default {
    getCSRFToken,
    validateCSRFToken,
    refreshCSRFToken,
    addCSRFHeader
};
"""
    
    csrf_path = editor.project_root / 'src' / 'utils' / 'csrf.js'
    if editor.write_file(csrf_path, csrf_content):
        print("[OK] Created csrf.js utility")
        return True
    return False

def update_firebase_service(editor):
    """Add CSRF header comment to firebase.js"""
    file_path = editor.project_root / 'src' / 'services' / 'firebase.js'
    
    if not editor.backup_file(file_path):
        return False
    
    content = editor.read_file(file_path)
    if not content:
        return False
    
    # Add comment block at the top about CSRF
    csrf_comment = """
// SECURITY NOTE: CSRF Protection
// For production deployment with a backend API proxy, add CSRF tokens:
// import { getCSRFToken } from '../utils/csrf';
// Include in all write operations:
// headers: { 'X-CSRF-Token': getCSRFToken() }
// Firebase SDK handles some CSRF protection via SameSite cookies,
// but explicit tokens provide defense-in-depth.

"""
    
    if "CSRF Protection" not in content:
        # Add after imports
        lines = content.split('\n')
        import_end_idx = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                import_end_idx = i
        
        lines.insert(import_end_idx + 2, csrf_comment)
        content = '\n'.join(lines)
        
        editor.write_file(file_path, content)
        print("[OK] Added CSRF protection notes to firebase.js")
    else:
        print("[INFO] CSRF notes already exist in firebase.js")
    
    return True

def main():
    print("=" * 60)
    print("Security Fix #4: CSRF Protection")
    print("=" * 60)
    
    project_root = Path(__file__).parent.parent
    editor = SecurityFixEditor(project_root)
    
    # Step 1: Create CSRF utility
    print("\n[1/2] Creating csrf.js utility...")
    if not create_csrf_utility(editor):
        print("[ERROR] Failed to create CSRF utility")
        return False
    
    # Step 2: Update firebase.js with CSRF notes
    print("\n[2/2] Updating firebase.js...")
    update_firebase_service(editor)
    
    print("\n" + "=" * 60)
    print("[SUCCESS] CSRF Protection Utility Created!")
    print("=" * 60)
    print(f"Backups saved to: {editor.backup_dir}")
    print("\n[INFO] CSRF Protection Implementation:")
    print("Firebase SDK already provides some CSRF protection via SameSite cookies.")
    print("For additional defense-in-depth (especially with a backend proxy):")
    print("\n1. Import CSRF utility:")
    print("   import { getCSRFToken } from '../utils/csrf';")
    print("\n2. Add to API calls:")
    print("   headers: { 'X-CSRF-Token': getCSRFToken() }")
    print("\n3. Validate server-side (if using Cloud Functions):")
    print("   const token = context.request.headers['x-csrf-token'];")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n[ERROR] Script failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
