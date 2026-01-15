import os
import re

def find_specific_object(directory):
    pattern = re.compile(r'\{\s*(current|total|message)\s*:[^,}]*,\s*(current|total|message)\s*:[^,}]*,\s*(current|total|message)\s*:[^,}]*\}', re.DOTALL)
    
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
                    matches = pattern.finditer(content)
                    for match in matches:
                        print(f"Match found in {path}:")
                        print(match.group(0))

find_specific_object('c:/Users/Sam Deiter/Documents/GitHub/UE5QuestionGenerator/src')
