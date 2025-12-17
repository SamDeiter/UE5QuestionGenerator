"""
Move invite sections to the top of AdminPanel
"""
import re

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find key section markers
create_invite_start = None
create_invite_end = None
active_invites_start = None
active_invites_end = None
feature_access_start = None

for i, line in enumerate(lines):
    if "{/* Create Invite Section */}" in line:
        create_invite_start = i
    elif create_invite_start and "{/* Registered Users */}" in line:
        create_invite_end = i
    elif "{/* Active Invites */}" in line:
        active_invites_start = i
    elif active_invites_start and "{/* Database Management */}" in line:
        active_invites_end = i
    elif "{/* Feature Access Overview */}" in line:
        feature_access_start = i

if all([create_invite_start, create_invite_end, active_invites_start, active_invites_end, feature_access_start]):
    # Extract the sections
    create_invite_section = lines[create_invite_start:create_invite_end]
    active_invites_section = lines[active_invites_start:active_invites_end]
    
    # Remove from original positions (in reverse order to maintain indices)
    del lines[active_invites_start:active_invites_end]
    del lines[create_invite_start:create_invite_end]
    
    # Insert both at the top (after header, before Feature Access)
    # Need to recalculate feature_access_start since we deleted lines
    for i, line in enumerate(lines):
        if "{/* Feature Access Overview */}" in line:
            feature_access_start = i
            break
    
    # Insert active invites first
    for line in reversed(active_invites_section):
        lines.insert(feature_access_start, line)
    
    # Then insert create invite
    for line in reversed(create_invite_section):
        lines.insert(feature_access_start, line)
    
    # Write back
    with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
        f.writelines(lines)
    
    print("✅ Moved invite sections to the top!")
    print("Order now:")
    print("  1. Generate Invite Code")
    print("  2. Active Invites")
    print("  3. Feature Access Overview")
    print("  4. (rest of sections)")
else:
    print("❌ Could not find all section markers")
    print(f"create_invite_start: {create_invite_start}")
    print(f"create_invite_end: {create_invite_end}")
    print(f"active_invites_start: {active_invites_start}")
    print(f"active_invites_end: {active_invites_end}")
    print(f"feature_access_start: {feature_access_start}")
