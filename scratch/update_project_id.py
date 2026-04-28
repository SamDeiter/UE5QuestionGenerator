import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\scripts\cloud_translate_bulk.py'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
changed = False
for line in lines:
    if 'GCP_PROJECT = "development-317819"' in line:
        new_lines.append('GCP_PROJECT = "ue5-questions-prod"\n')
        changed = True
    else:
        new_lines.append(line)

if changed:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Updated GCP_PROJECT in cloud_translate_bulk.py")
else:
    print("Target not found in cloud_translate_bulk.py")
