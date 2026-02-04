import os
import re

def search_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Search for current, total, and message in the same code block or object
                        if 'current' in content and 'total' in content and 'message' in content:
                            print(f"Match found in: {filepath}")
                            # Try to find the specific object
                            matches = re.findall(r'\{[^{}]*current[^{}]*total[^{}]*message[^{}]*\}', content, re.DOTALL)
                            for match in matches:
                                print(f"Object match:\n{match}")
                except Exception as e:
                    pass

if __name__ == "__main__":
    search_files('c:/Users/Sam Deiter/Documents/GitHub/UE5QuestionGenerator/src')
