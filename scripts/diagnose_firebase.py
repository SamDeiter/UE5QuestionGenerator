"""
Diagnostic script to identify Firebase project configuration differences
between GitHub Pages and localhost environments.
"""

import os
import json

print("=" * 60)
print("FIREBASE PROJECT DIAGNOSTIC")
print("=" * 60)

# Check for .env files
env_files = [
    ".env",
    ".env.local",
    ".env.development",
    ".env.production"
]

print("\n1. ENVIRONMENT FILES:")
for env_file in env_files:
    if os.path.exists(env_file):
        print(f"   ✓ {env_file} EXISTS")
        with open(env_file, 'r') as f:
            for line in f:
                if 'VITE_FIREBASE_PROJECT_ID' in line:
                    print(f"      {line.strip()}")
    else:
        print(f"   ✗ {env_file} NOT FOUND")

print("\n2. GITHUB SECRETS (from workflow):")
print("   Check: .github/workflows/deploy.yml")
print("   Uses: secrets.VITE_FIREBASE_PROJECT_ID")
print("   → You need to verify this in GitHub Settings > Secrets")

print("\n3. DIAGNOSIS:")
print("   If GitHub Pages shows FEWER questions than localhost:")
print("   → GitHub Pages might be using a DIFFERENT Firebase project")
print("   → OR GitHub Pages has OLDER data (cache issue)")
print("   → OR There's a discipline filter being applied differently")

print("\n4. SOLUTION:")
print("   A) Verify GitHub Secret matches your local .env file")
print("   B) Check Firebase Console for both projects")
print("   C) Add debug logging to show project ID on app load")

print("\n" + "=" * 60)
