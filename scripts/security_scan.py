
import os
import re

# Regex patterns for leaked secrets
PATTERNS = [
    r"(AIza[0-9A-Za-z-_]{35})",  # Google API Key
    r"ak-([a-zA-Z0-9]{45,})",     # OpenAI/Similar
    r"sk-([a-zA-Z0-9]{45,})",     # OpenAI/Similar
    r"api[-_]?key",
    r"secret",
    r"password",
    r"token"
]

EXTENSIONS = (".html", ".js", ".jsx", ".json", ".py", ".env.example")
EXCLUDE_DIRS = (".git", "node_modules", "dist", "browser_recordings", ".gemini")

def scan_files():
    found_secrets = []
    for root, dirs, files in os.walk("."):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file.endswith(EXTENSIONS):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        for pattern in PATTERNS:
                            matches = re.finditer(pattern, content, re.IGNORECASE)
                            for match in matches:
                                line_no = content.count('\n', 0, match.start()) + 1
                                line_content = content.split('\n')[line_no-1].strip()
                                
                                # Ignore common false positives/placeholders
                                if "placeholder" in line_content.lower() or "REPLACE_ME" in line_content or "your_" in line_content:
                                    continue
                                if "import" in line_content or "export" in line_content or "from" in line_content:
                                    if "api" not in line_content.lower():
                                        continue
                                
                                found_secrets.append({
                                    "file": file_path,
                                    "line": line_no,
                                    "content": line_content,
                                    "match": match.group(0)
                                })
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
    return found_secrets

if __name__ == "__main__":
    print("🚀 Starting Security Scan...")
    secrets = scan_files()
    if secrets:
        print("\n⚠️  POTENTIAL SECRETS FOUND:")
        for s in secrets:
            print(f"File: {s['file']}:{s['line']}")
            print(f"Match: {s['match']}")
            print(f"Context: {s['content']}\n")
    else:
        print("\n✅ No sensitive keys found (excluding placeholders).")
