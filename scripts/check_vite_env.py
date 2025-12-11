"""
Check which environment variables Vite is actually loading.
"""
import subprocess
import sys


def check_vite_env():
    """Check Vite environment variables."""
    print("=" * 60)
    print("🔍 Checking Vite Environment Variables")
    print("=" * 60)
    
    # Check if .env.production is being used
    try:
        result = subprocess.run(
            ["powershell", "-Command", "Get-Content .env.production | Select-String VITE_FIREBASE_API_KEY"],
            capture_output=True,
            text=True,
            cwd=r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator"
        )
        
        if result.returncode == 0:
            api_key_line = result.stdout.strip()
            if "=" in api_key_line:
                key = api_key_line.split("=", 1)[1].strip()
                print(f"\n📋 .env.production API Key:")
                print(f"   {key[:20]}...{key[-3:]}")
                print(f"   Length: {len(key)} chars")
                
                if len(key) == 39:
                    print("   ✅ Correct length")
                else:
                    print(f"   ❌ Expected 39 chars, got {len(key)}")
        else:
            print("❌ Could not read .env.production")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("⚠️  IMPORTANT: Vite caches environment variables!")
    print("=" * 60)
    print("The dev server must be FULLY RESTARTED to pick up changes.")
    print("\nTo ensure a clean restart:")
    print("1. Stop the dev server (Ctrl+C)")
    print("2. Clear Vite cache: Remove node_modules/.vite")
    print("3. Restart: npm run dev")
    print("=" * 60)


if __name__ == "__main__":
    check_vite_env()
