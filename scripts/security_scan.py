
import os
import re

patterns = [
    r"AIza[0-9A-Za-z-_]{35}", # Google API Key
    r"sk-[0-9A-Za-z]{48}",    # OpenAI API Key
    r"api[_-]?key",
    r"secret",
    r"password",
    r"token"
]

regex = re.compile('|'.join(patterns), re.IGNORECASE)

base_dir = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator'
includes = ['.html', '.js', '.json', '.py', '.env.example']
excludes = ['node_modules', '.git', '.gemini', 'scripts']

matches = []

for root, dirs, files in os.walk(base_dir):
    # Skip excluded directories
    dirs[:] = [d for d in dirs if d not in excludes]
    
    for file in files:
        if any(file.endswith(ext) for ext in includes):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    for i, line in enumerate(f, 1):
                        if regex.search(line):
                            # Filter out obvious false positives or mocks
                            if 'vi.mock' in line or 'test-api-key' in line or 'REPLACE_ME' in line:
                                continue
                            matches.append(f"{path}:{i}: {line.strip()}")
            except Exception as e:
                print(f"Error reading {path}: {e}")

if matches:
    print("Security Scan Found Potential Issues:")
    for match in matches:
        print(match)
else:
    print("Security Scan: No real keys or secrets found (only mocks/placeholders checked).")
