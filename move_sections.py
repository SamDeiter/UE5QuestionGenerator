"""
Move Registered Users and Feature Access Overview to top
New order should be:
1. Generate Invite Code
2. Active Invites  
3. Registered Users
4. Feature Access Overview
5. (everything else)
"""
import re

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find sections
registered_users_start = None
registered_users_end = None
feature_access_start = None
feature_access_end = None
active_invites_end_marker = None

for i, line in enumerate(lines):
    if "{/* Registered Users */}" in line:
        registered_users_start = i
    elif registered_users_start and not registered_users_end and "{/* Active Invites */}" in line:
        registered_users_end = i
    elif "{/* Feature Access Overview */}" in line:
        feature_access_start = i
    elif feature_access_start and not feature_access_end and "{/* Token Usage */}" in line:
        feature_access_end = i
    elif "{/* Active Invites */}" in line:
        # Find the end of Active Invites section
        for j in range(i+1, len(lines)):
            if lines[j].strip().startswith("</div>") and "border border-yellow" in lines[i-1]:
                # Found the closing div of Active Invites
                active_invites_end_marker = j + 3  # Account for closing divs
                break

if all([registered_users_start, registered_users_end, feature_access_start, feature_access_end]):
    # Extract sections
    registered_section = lines[registered_users_start:registered_users_end]
    feature_section = lines[feature_access_start:feature_access_end]
    
    # Remove from original positions (reverse order)
    if registered_users_start < feature_access_start:
        del lines[feature_access_start:feature_access_end]
        del lines[registered_users_start:registered_users_end]
    else:
        del lines[registered_users_start:registered_users_end]
        del lines[feature_access_start:feature_access_end]
    
    # Find insertion point (after Active Invites)
    insertion_point = None
    for i, line in enumerate(lines):
        if "{/* Feature Access Overview */}" in line or "{/* Token Usage */}" in line:
            insertion_point = i
            break
    
    if insertion_point:
        # Insert Feature Access first, then Registered Users
        for line in reversed(feature_section):
            lines.insert(insertion_point, line)
        for line in reversed(registered_section):
            lines.insert(insertion_point, line)
        
        with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
            f.writelines(lines)
        
        print("✅ Moved sections to top!")
        print("New order:")
        print("  1. Generate Invite Code")
        print("  2. Active Invites")
        print("  3. Registered Users")
        print("  4. Feature Access Overview")
        print("  5. Token Usage, API Config, etc.")
    else:
        print("❌ Could not find insertion point")
else:
    print("❌ Could not find all sections")
    print(f"registered_users: {registered_users_start} - {registered_users_end}")
    print(f"feature_access: {feature_access_start} - {feature_access_end}")
