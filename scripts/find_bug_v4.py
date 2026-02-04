import os

def find_triplet(directory):
    for root, dirs, files in os.walk(directory):
        if '.git' in dirs:
            dirs.remove('.git')
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
            
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if 'current' in content and 'total' in content and 'message' in content:
                        print(f"Match in {path}")
                        # Look for them in an object structure
                        # Match current: ..., total: ..., message: ... in any order
                        import re
                        pattern = re.compile(r'\{[^{}]*(current|total|message)[^{}]*(current|total|message)[^{}]*(current|total|message)[^{}]*\}', re.DOTALL)
                        matches = pattern.findall(content)
                        if matches:
                            print(f"  Regex match found in {path}")

find_triplet('c:/Users/Sam Deiter/Documents/GitHub/UE5QuestionGenerator/src')
