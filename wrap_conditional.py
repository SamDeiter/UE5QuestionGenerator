"""
Wrap section content with conditional rendering based on collapsed state
"""
import re

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Section markers and their state keys
sections = [
    ("Feature Access Overview", "featureAccess"),
    ("Generate Invite Code", "generateInvite"),
    ("Registered Users", "registeredUsers"),
    ("API Configuration", "apiConfig"),
    ("Source Material", "sourceMaterial"),
    ("Custom Tags", "customTags"),
    ("Training Data Export", "trainingData"),
    ("Environment Info", "envInfo"),
    ("Database Management", "databaseMgmt"),
]

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    new_lines.append(line)
    
    # Check if this is a section header closing </h2>
    if "</h2>" in line:
        # Check if next line is content (not another comment/section)
        if i + 1 < len(lines):
            next_line = lines[i + 1]
            
            # If next line is content (starts with whitespace + <div or similar)
            if next_line.strip() and not next_line.strip().startswith("{/*"):
                # Find which section this belongs to
                for section_name, state_key in sections:
                    if section_name in ''.join(lines[max(0,i-10):i]):
                        # Get the indentation
                        indent = len(next_line) - len(next_line.lstrip())
                        
                        # Add conditional rendering wrapper
                        new_lines.append(' ' * indent + f'{{!collapsed.{state_key} && (\n')
                        
                        # Find the closing div of this section
                        depth = 0
                        j = i + 1
                        while j < len(lines):
                            if '<div' in lines[j]:
                                depth += lines[j].count('<div')
                            if '</div>' in lines[j]:
                                depth -= lines[j].count('</div>')
                            
                            new_lines.append(lines[j])
                            
                            if depth <= 0 and '</div>' in lines[j]:
                                # Close the conditional
                                new_lines.append(' ' * indent + ')}\n')
                                i = j
                                break
                            j += 1
                        break
    i += 1

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("✅ Wrapped all section content with conditional rendering!")
