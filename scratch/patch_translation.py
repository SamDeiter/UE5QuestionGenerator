import sys
import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\generation\useQuestionTranslation.js'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_single_variant = False
in_bulk_variant = False

for line in lines:
    # Detect handleTranslateSingle variant creation
    if 'const translatedVariant = {' in line:
        in_single_variant = True
        new_lines.append(line)
        continue
    
    if in_single_variant and 'uniqueId: q.uniqueId,' in line:
        new_lines.append(line)
        new_lines.append('            creatorId: q.creatorId,\n')
        new_lines.append('            creatorEmail: q.creatorEmail,\n')
        new_lines.append('            creatorName: q.creatorName,\n')
        continue

    if in_single_variant and '};' in line:
        in_single_variant = False
        new_lines.append(line)
        continue

    # Detect handleBulkTranslateMissing variant creation
    if 'const newQuestion = {' in line:
        in_bulk_variant = True
        new_lines.append(line)
        continue

    if in_bulk_variant and 'uniqueId: q.uniqueId,' in line:
        new_lines.append(line)
        new_lines.append('            creatorId: q.creatorId,\n')
        new_lines.append('            creatorEmail: q.creatorEmail,\n')
        new_lines.append('            creatorName: q.creatorName,\n')
        continue

    if in_bulk_variant and '};' in line:
        in_bulk_variant = False
        new_lines.append(line)
        continue

    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Successfully patched useQuestionTranslation.js')
