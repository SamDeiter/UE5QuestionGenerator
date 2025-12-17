"""
Add collapsible functionality to Admin Panel sections
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Define section mappings (section title -> state key)
sections_config = [
    ("Feature Access Overview", "featureAccess", False),
    ("Generate Invite Code", "generateInvite", False),
    ("Registered Users", "registeredUsers", False),
    ("API Configuration", "apiConfig", True),
    ("Source Material", "sourceMaterial", True),
    ("Custom Tags", "customTags", True),
    ("Training Data Export", "trainingData", True),
    ("Environment Info", "envInfo", True),
    ("Database Management", "databaseMgmt", False),
]

# Replace each section header with collapsible version
for section_title, state_key, _ in sections_config:
    # Find the h2 header for this section
    old_pattern = f'<h2 className="text-lg font-bold text-'
    
    # Find and replace each h2 that contains this section title
    lines = content.split('\n')
    new_lines = []
    
    for i, line in enumerate(lines):
        if section_title in line and '<h2 className="text-lg font-bold'  in line:
            # Get the color class
            if 'blue-400' in line:
                color = 'blue-400'
            elif 'indigo-400' in line:
                color = 'indigo-400'
            elif 'green-400' in line:
                color = 'green-400'
            elif 'purple-400' in line:
                color = 'purple-400'
            elif 'yellow-400' in line:
                color = 'yellow-400'
            elif 'red-400' in line:
                color = 'red-400'
            else:
                color = 'slate-400'
            
            # Replace with clickable header
            indent = len(line) - len(line.lstrip())
            new_lines.append(' ' * indent + f'<h2')
            new_lines.append(' ' * (indent + 2) + f'className="text-lg font-bold text-{color} mb-3 flex items-center gap-2 cursor-pointer hover:opacity-80"')
            new_lines.append(' ' * (indent + 2) + f'onClick={{() => toggleCollapse("{state_key}")')
            new_lines.append(' ' * (indent + 2) + '}')
            new_lines.append(' ' * indent + '>')
            
            # Skip the original line and next lines until we find the icon and title
            j = i + 1
            while j < len(lines) and '</h2>' not in lines[j]:
                if '<Icon' in lines[j]:
                    new_lines.append(lines[j])
                elif section_title in lines[j]:
                    new_lines.append(lines[j].replace('>', f'  <Icon name={{collapsed.{state_key} ? "chevron-down" : "chevron-up"}} size={{14}} className="ml-auto" />'))
                    new_lines.append(' ' * indent + '</h2>')
                    break
                j += 1
            
            # Skip to after </h2>
            while i < len(lines) - 1 and '</h2>' not in lines[i]:
                i += 1
            continue
        
        new_lines.append(line)
    
    content = '\n'.join(new_lines)

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Added collapsible headers to Admin Panel sections")
