"""
Quick diagnostic script to verify Firebase configuration.
"""
import os
from pathlib import Path


def check_env_file():
    """Check .env.production for Firebase config."""
    env_file = Path(__file__).parent.parent / ".env.production"
    
    if not env_file.exists():
        print("❌ .env.production not found")
        return
    
    print("✅ .env.production found")
    print("\n📋 Current Firebase Configuration:")
    print("-" * 60)
    
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith("VITE_FIREBASE_"):
                key, value = line.split("=", 1)
                # Mask API key for security
                if "API_KEY" in key:
                    masked = value[:20] + "..." + value[-3:] if len(value) > 23 else value
                    print(f"{key}={masked}")
                else:
                    print(line)
    
    print("-" * 60)
    print("\n🔍 API Key Length Check:")
    
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith("VITE_FIREBASE_API_KEY="):
                api_key = line.split("=", 1)[1].strip()
                print(f"   Length: {len(api_key)} characters")
                if len(api_key) == 39:
                    print("   ✅ Correct length (39 chars)")
                else:
                    print(f"   ⚠️  Expected 39 chars, got {len(api_key)}")
                break


if __name__ == "__main__":
    check_env_file()
    print("\n" + "=" * 60)
    print("🔧 Next Steps:")
    print("=" * 60)
    print("1. If API key is correct, check Google Cloud Console:")
    print("   https://console.cloud.google.com/apis/credentials?project=ue5-questions-prod")
    print("\n2. Find the API key and click to edit it")
    print("\n3. Set 'Application restrictions' to 'None'")
    print("\n4. Set 'API restrictions' to 'Don't restrict key'")
    print("\n5. Click 'Save' and wait 2-3 minutes for propagation")
    print("=" * 60)
