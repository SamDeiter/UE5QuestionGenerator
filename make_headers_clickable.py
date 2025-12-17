"""
Make Admin Panel sections collapsible
1. Make headers clickable with chevron icons
2. Wrap section content in conditional rendering
"""
import re

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Section configurations: (comment marker, state key, header text pattern)
sections = [
    ("{/* Feature Access Overview */}", "featureAccess", "Feature Access Overview"),
    ("{/* Create Invite Section */}", "generateInvite", "Generate Invite Code"),
    ("{/* Registered Users */}", "registeredUsers", "Registered Users"),
    ("{/* API Configuration */}", "apiConfig", "API Configuration"),
    ("{/* Source Files */}", "sourceMaterial", "Source Material"),
    ("{/* Custom Tags */}", "customTags", "Custom Tags"),
    ("{/* Training Data Export */}", "trainingData", "Training Data Export"),
    ("{/* Environment Info */}", "envInfo", "Environment Info"),
    ("{/* Database Management */}", "databaseMgmt", "Database Management"),
]

for comment_marker, state_key, header_text in sections:
    # Find the section
    if comment_marker not in content:
        print(f"⚠️ Skipping {header_text} - marker not found")
        continue
    
    # Find the h2 header after the comment
    section_start = content.find(comment_marker)
    h2_start = content.find("<h2", section_start)
    h2_end = content.find("</h2>", h2_start)
    
    if h2_start == -1 or h2_end == -1:
        print(f"⚠️ Skipping {header_text} - h2 not found")
        continue
    
    # Extract the h2 content
    h2_full = content[h2_start:h2_end+5]
    
    # Check if already has onClick
    if "onClick" in h2_full:
        print(f"✓ {header_text} already has onClick")
        continue
    
    # Make header clickable and add chevron
    # Find the className line
    if 'className="text-lg font-bold' in h2_full:
        # Add cursor-pointer and onClick
        new_h2 = h2_full.replace(
            'className="text-lg font-bold',
            'className="text-lg font-bold cursor-pointer hover:opacity-80'
        )
        
        # Add onClick before the closing >
        new_h2 = new_h2.replace(
            'gap-2">',
            f'gap-2"\n          onClick={{() => toggleCollapse("{state_key}")}}\n        >'
        )
        
        # Add chevron icon before closing </h2>
        new_h2 = new_h2.replace(
            '</h2>',
            f'\n          <Icon name={{collapsed.{state_key} ? "chevron-down" : "chevron-up"}} size={{14}} className="ml-auto" />\n        </h2>'
        )
        
        content = content.replace(h2_full, new_h2)
        print(f"✅ Made {header_text} clickable")

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ Updated all section headers to be collapsible!")
print("Note: Content wrapping with conditional rendering needs to be done manually")
