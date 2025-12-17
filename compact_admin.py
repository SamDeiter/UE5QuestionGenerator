"""
Reorganize AdminPanel.jsx to be more compact and reorder sections
- Reduce padding from p-6 to p-4 and space-y-6 to space-y-4
- Move invites section before users section
"""
import re

# Read the file
with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r",encoding="utf-8") as f:
    content = f.read()

# 1. Make layout more compact
# Reduce main container padding
content = content.replace('<div className="space-y-6 p-6">', '<div className="space-y-4 p-4">')

# Reduce section padding from p-6 to p-4
content = content.replace('rounded-lg p-6 border', 'rounded-lg p-4 border')

# Reduce header margins
content = content.replace('mb-4 flex items-center', 'mb-3 flex items-center')

# Reduce space between items
content = content.replace('space-y-4', 'space-y-3')
content = content.replace('space-y-3', 'space-y-2', 1)  # Only first occurrence
content = content.replace('gap-4', 'gap-3')

# 2. Find and extract the invite section (starts around line 590)
invite_section_pattern = r'(      {/\* Invite Management \*/}.*?      </div>\s*\n\s*{/\* Registered Users)'
invite_match = re.search(invite_section_pattern, content, re.DOTALL)

if invite_match:
    invite_section = invite_match.group(1)
    # Remove the invite section from its current location
    content_without_invite = content.replace(invite_match.group(0), '      {/* Registered Users')
    
    # Find where to insert it (after API Configuration section and before Custom Tags)
    # Look for the end of API Configuration section
    api_end_pattern = r'(      </div>\s*\n\s*{/\* Source Material)'
    api_match = re.search(api_end_pattern, content_without_invite)
    
    if api_match:
        # Insert invite section after API Configuration
        insertion_point = api_match.start()
        content = (content_without_invite[:insertion_point] + 
                   "\n" + invite_section + "\n\n" +
                   content_without_invite[insertion_point:])
        print("✅ Reordered: Moved Invite Management section after API Configuration")
    else:
        print("⚠️ Could not find API Configuration end marker")
        content = content_without_invite
else:
    print("⚠️ Could not find Invite Management section")

# Write back
with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Made AdminPanel more compact")
print("✅ Reduced padding: p-6 → p-4, space-y-6 → space-y-4")
print("✅ If reordering succeeded, Invite Management is now after API Configuration")
