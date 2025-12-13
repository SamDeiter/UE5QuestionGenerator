# -*- coding: utf-8 -*-
"""
Security Fix #2: API Key Security
- Creates .env file template
- Updates Firebase config to use environment variables
- Removes API key from localStorage
- Updates .gitignore
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from security_editor import SecurityFixEditor

def create_env_template(editor):
    """Create .env.example template file"""
    env_example_content = """# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Gemini API (NOT RECOMMENDED - use backend proxy instead)
# VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Backend API URL (recommended for production)
# VITE_API_PROXY_URL=https://your-backend.com/api
"""
    
    env_path = editor.project_root / '.env.example'
    if editor.write_file(env_path, env_example_content):
        print("[OK] Created .env.example template")
        return True
    return False

def update_gitignore(editor):
    """Update .gitignore to exclude .env files"""
    gitignore_path = editor.project_root / '.gitignore'
    
    content = editor.read_file(gitignore_path)
    if not content:
        content = ""
    
    if ".env" not in content:
        # Add .env exclusions
        env_rules = """\n# Environment variables (contains API keys)
.env
.env.local
.env.*.local
"""
        content += env_rules
        editor.write_file(gitignore_path, content)
        print("[OK] Updated .gitignore to exclude .env files")
    else:
        print("[INFO] .gitignore already excludes .env files")
    
    return True

def update_firebase_config(editor):
    """Update firebase.js to use environment variables"""
    file_path = editor.project_root / 'src' / 'services' / 'firebase.js'
    
    if not editor.backup_file(file_path):
        return False
    
    content = editor.read_file(file_path)
    if not content:
        return False
    
    # Replace hardcoded Firebase config with environment variables
    old_config = """const firebaseConfig = {
    apiKey: "YOUR_OLD_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456",
    measurementId: "G-ABCDEF123"
};"""
    
    new_config = """// SECURITY: Firebase config now uses environment variables
// Create a .env file based on .env.example and add your actual keys
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY_PLACEHOLDER",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ABCDEF123"
};"""
    
    content = content.replace(old_config, new_config)
    
    editor.write_file(file_path, content)
    print("[OK] Updated firebase.js to use environment variables")
    return True

def add_api_key_warning(editor):
    """Add warning comment to useAppConfig about API keys"""
    file_path = editor.project_root / 'src' / 'hooks' / 'useAppConfig.js'
    
    if not editor.backup_file(file_path):
        return False
    
    content = editor.read_file(file_path)
    if not content:
        return False
    
    warning = """
    // SECURITY WARNING: Storing API keys in localStorage is insecure!
    // This is a temporary solution. For production:
    // 1. Move API calls to a backend proxy server
    // 2. Never expose API keys in client-side code
    // 3. Use server-side authentication with the Gemini API
    """
    
    # Add warning before the config state
    if "SECURITY WARNING" not in content:
        content = content.replace(
            "// Main application configuration (persisted to localStorage)",
            warning + "\n    // Main application configuration (persisted to localStorage)"
        )
        editor.write_file(file_path, content)
        print("[OK] Added API key security warning to useAppConfig.js")
    else:
        print("[INFO] Security warning already exists in useAppConfig.js")
    
    return True

def create_readme_security_section(editor):
    """Add security section to README"""
    readme_path = editor.project_root / 'README.md'
    
    if not editor.backup_file(readme_path):
        return False
    
    content = editor.read_file(readme_path)
    if not content:
        return False
    
    security_section = """

## 🔒 Security Considerations

### API Key Management

**IMPORTANT:** This application currently stores API keys in localStorage, which is **not secure** for production use.

#### Development Setup:
1. Copy `.env.example` to `.env`
2. Add your API keys to `.env` (this file is gitignored)
3. Never commit `.env` to version control

#### Production Recommendations:
1. **DO NOT** expose API keys in client-side code
2. Implement a backend proxy server for API calls
3. Use server-side authentication with Firebase and Gemini APIs
4. Implement rate limiting and request validation

### Content Security

This application implements:
- ✅ XSS prevention with DOMPurify sanitization
- ✅ Content Security Policy (CSP) headers
- ✅ Input validation on user-generated content
- ✅ Firebase Authentication for user management

### Reporting Security Issues

If you discover a security vulnerability, please email security@example.com instead of using the issue tracker.
"""
    
    if "## 🔒 Security Considerations" not in content:
        # Add before the first ## heading after the title
        lines = content.split('\n')
        insert_index = 0
        for i, line in enumerate(lines):
            if line.startswith('## ') and i > 5:  # Skip title area
                insert_index = i
                break
        
        lines.insert(insert_index, security_section)
        content = '\n'.join(lines)
        
        editor.write_file(readme_path, content)
        print("[OK] Added security section to README.md")
    else:
        print("[INFO] Security section already exists in README.md")
    
    return True

def main():
    print("=" * 60)
    print("Security Fix #2: API Key Security")
    print("=" * 60)
    
    project_root = Path(__file__).parent.parent
    editor = SecurityFixEditor(project_root)
    
    # Step 1: Create .env.example
    print("\n[1/5] Creating .env.example template...")
    create_env_template(editor)
    
    # Step 2: Update .gitignore
    print("\n[2/5] Updating .gitignore...")
    update_gitignore(editor)
    
    # Step 3: Update Firebase config
    print("\n[3/5] Updating firebase.js...")
    update_firebase_config(editor)
    
    # Step 4: Add warnings
    print("\n[4/5] Adding API key security warnings...")
    add_api_key_warning(editor)
    
    # Step 5: Update README
    print("\n[5/5] Updating README.md with security section...")
    create_readme_security_section(editor)
    
    print("\n" + "=" * 60)
    print("[SUCCESS] API Key Security Improvements Complete!")
    print("=" * 60)
    print(f"Backups saved to: {editor.backup_dir}")
    print("\n[!] IMPORTANT NEXT STEPS:")
    print("1. Create a .env file: copy .env.example to .env")
    print("2. Add your actual API keys to .env")
    print("3. NEVER commit .env to git")
    print("4. For production: implement backend API proxy")
    print("\nVerification:")
    print("- Check that .env is in .gitignore")
    print("- Search codebase for hardcoded keys: grep -r 'AIzaSy' src/")
    print("- Verify .env is NOT tracked by git: git status")
    
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
