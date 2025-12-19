"""
Update Firebase API key in .env.production file.
Usage: python scripts/update_env_key.py <NEW_API_KEY>
"""
import sys
from pathlib import Path


def update_api_key(new_key: str) -> None:
    """Update VITE_FIREBASE_API_KEY in .env.production."""
    env_file = Path(__file__).parent.parent / ".env.production"
    
    if not env_file.exists():
        print(f"❌ Error: {env_file} not found")
        sys.exit(1)
    
    # Read current content
    lines = env_file.read_text(encoding='utf-8').splitlines()
    
    # Update the API key line
    updated_lines = []
    key_found = False
    
    for line in lines:
        if line.startswith("VITE_FIREBASE_API_KEY="):
            updated_lines.append(f"VITE_FIREBASE_API_KEY={new_key}")
            key_found = True
            print(f"✅ Updated API key")
        else:
            updated_lines.append(line)
    
    if not key_found:
        print("⚠️ VITE_FIREBASE_API_KEY not found, adding it")
        updated_lines.append(f"VITE_FIREBASE_API_KEY={new_key}")
    
    # Write back
    env_file.write_text('\n'.join(updated_lines) + '\n', encoding='utf-8')
    print(f"✅ Updated {env_file}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/update_env_key.py <NEW_API_KEY>")
        sys.exit(1)
    
    new_api_key = sys.argv[1].strip()
    
    if len(new_api_key) != 39:
        print(f"⚠️ Warning: API key length is {len(new_api_key)}, expected 39 characters")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(0)
    
    update_api_key(new_api_key)
