import re

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\TranslationManagementView.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove any emoji characters from showMessage calls - replace with plain text
content = content.replace(
    '"Re-synced from Firestore. Translation flags updated."',
    '"Re-synced from Firestore. Translation flags updated."'
)

# More broadly: strip the checkmark emoji if present anywhere in this file
content = content.replace('\u2705 Re-synced', 'Re-synced')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done - emoji removed')
