"""
Check Firebase Authentication Configuration
This script helps verify which Firebase project is active and provides
direct links to enable Email/Password authentication.
"""

import os
from pathlib import Path

def check_firebase_config():
    # Try to read .env.local
    env_file = Path(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\.env.local")
    
    if not env_file.exists():
        print("❌ .env.local file not found!")
        print("Run: npm run env:dev  OR  npm run env:prod")
        return
    
    # Read the file
    with open(env_file, 'r') as f:
        content = f.read()
    
    # Extract project ID
    project_id = None
    for line in content.split('\n'):
        if 'VITE_FIREBASE_PROJECT_ID' in line:
            project_id = line.split('=')[1].strip().strip('"').strip("'")
            break
    
    if not project_id:
        print("❌ Could not find VITE_FIREBASE_PROJECT_ID in .env.local")
        return
    
    print(f"\n{'='*70}")
    print(f"🔥 Current Firebase Project: {project_id}")
    print(f"{'='*70}\n")
    
    # Determine environment
    if 'dev' in project_id.lower():
        env = "DEVELOPMENT"
        color = "🟢"
    elif 'prod' in project_id.lower():
        env = "PRODUCTION"
        color = "🔴"
    else:
        env = "UNKNOWN"
        color = "⚪"
    
    print(f"{color} Environment: {env}\n")
    
    # Provide direct link
    auth_url = f"https://console.firebase.google.com/project/{project_id}/authentication/providers"
    
    print("📋 INSTRUCTIONS TO ENABLE EMAIL/PASSWORD AUTHENTICATION:")
    print("-" * 70)
    print(f"\n1. Open this URL in your browser:")
    print(f"   {auth_url}\n")
    print("2. Find 'Email/Password' in the list of providers")
    print("3. Click on it")
    print("4. Toggle 'Enable' to ON")
    print("5. Click 'Save'\n")
    print("-" * 70)
    
    print("\n✅ After enabling, users can:")
    print("   • Sign up with any email address and password")
    print("   • Sign in with their credentials")
    print("   • Use invite codes to register")
    
    print("\n⚠️  IMPORTANT:")
    print("   You need to enable this in BOTH dev and prod projects!")
    print("   • Dev project: for local testing")
    print("   • Prod project: for GitHub Pages deployment")
    
    print(f"\n{'='*70}\n")

if __name__ == "__main__":
    check_firebase_config()
