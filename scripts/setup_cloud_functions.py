"""
Configure Firebase Cloud Functions with Gemini API key.
This keeps the API key server-side and secure.
"""
import subprocess
import sys


def set_firebase_function_config(api_key: str) -> None:
    """Set Gemini API key in Firebase Functions config."""
    print("=" * 60)
    print("🔐 Configuring Firebase Cloud Functions")
    print("=" * 60)
    
    # Set the API key in Firebase Functions config
    cmd = [
        "firebase",
        "functions:config:set",
        f"gemini.api_key={api_key}",
        "--project", "ue5-questions-prod"
    ]
    
    print(f"\n📤 Setting Gemini API key in Cloud Functions config...")
    print(f"   Command: {' '.join(cmd[:3])} gemini.api_key=***")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        print("\n✅ API key configured successfully!")
        print(result.stdout)
        
        print("\n" + "=" * 60)
        print("📋 Next Steps:")
        print("=" * 60)
        print("1. Deploy the Cloud Functions:")
        print("   firebase deploy --only functions --project ue5-questions-prod")
        print("\n2. The client app will now use Cloud Functions for AI calls")
        print("   (API key stays secure on the server)")
        print("=" * 60)
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error: {e.stderr}")
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/setup_cloud_functions.py <GEMINI_API_KEY>")
        sys.exit(1)
    
    api_key = sys.argv[1].strip()
    set_firebase_function_config(api_key)
