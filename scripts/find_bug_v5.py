import os

def check_file(path):
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        indicators = ['current', 'total', 'message']
        if all(ind in content for ind in indicators):
            # Check for object structure
            import re
            # Matches { ... current: ..., total: ..., message: ... } in any order
            # This is a bit loose but should find it
            if re.search(r'\{\s*(?:current|total|message)\s*:', content):
                 print(f"BINGO: {path}")

for root, dirs, files in os.walk('c:/Users/Sam Deiter/Documents/GitHub/UE5QuestionGenerator/src'):
    if 'node_modules' in dirs: dirs.remove('node_modules')
    if '.git' in dirs: dirs.remove('.git')
    for file in files:
        if file.endswith(('.js', '.jsx')):
            check_file(os.path.join(root, file))
