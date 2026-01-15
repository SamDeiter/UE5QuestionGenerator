
import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\Admin\DataMaintenance.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

open_tags = content.count('<div')
close_tags = content.count('</div>')

print(f"Open <div: {open_tags}")
print(f"Close </div>: {close_tags}")

# Also check for other tags
for tag in ['CollapsibleSection', 'MaintenanceActionCard', 'Icon', 'button']:
    o = content.count(f'<{tag}')
    c_full = content.count(f'</{tag}>')
    c_self = content.count('/>') # This is a bit rough but okay for a check
    print(f"{tag}: Open={o}, CloseFull={c_full}")
