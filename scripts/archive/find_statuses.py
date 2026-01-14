import os
import re

status_pattern = re.compile(r'status:\s*["\']([^"\']+)["\']')
unique_statuses = set()

for root, dirs, files in os.walk(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src'):
    for file in files:
        if file.endswith(('.js', '.jsx')):
            try:
                with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = status_pattern.findall(content)
                    unique_statuses.update(matches)
            except Exception as e:
                print(f"Error reading {file}: {e}")

print("Unique Statuses found in code:")
for status in sorted(unique_statuses):
    print(f"- {status}")
