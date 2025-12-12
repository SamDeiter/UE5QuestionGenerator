"""
Add Gemini API key to .env.production
"""
import sys

def add_gemini_key():
    if len(sys.argv) < 2:
        print("Usage: python add_gemini_key.py YOUR_PRODUCTION_GEMINI_API_KEY")
        sys.exit(1)
    
    gemini_key = sys.argv[1]
    env_file = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\.env.production"
    
    # Read existing content
    with open(env_file, 'r') as f:
        lines = f.readlines()
    
    # Check if VITE_GEMINI_API_KEY already exists
    key_exists = False
    for i, line in enumerate(lines):
        if line.startswith('VITE_GEMINI_API_KEY='):
            lines[i] = f'VITE_GEMINI_API_KEY={gemini_key}\n'
            key_exists = True
            break
    
    # If not, add it
    if not key_exists:
        lines.append(f'\nVITE_GEMINI_API_KEY={gemini_key}\n')
    
    # Write back
    with open(env_file, 'w') as f:
        f.writelines(lines)
    
    print(f"✅ Added Gemini API key to .env.production")
    print(f"\nNext steps:")
    print(f"1. Copy-Item -Path '.env.production' -Destination '.env.local' -Force")
    print(f"2. Stop-Process -Name 'node' -Force")
    print(f"3. npm run dev")

if __name__ == "__main__":
    add_gemini_key()
