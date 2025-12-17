"""
Swap Registered Users and Active Invites positions
Final order should be:
1. Feature Access Overview
2. Generate Invite Code
3. Registered Users
4. Active Invites
5. (rest)
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find both sections
registered_start = None
registered_end = None
active_invites_start = None
active_invites_end = None

for i, line in enumerate(lines):
    if "{/* Registered Users */}" in line:
        registered_start = i
    elif registered_start and not registered_end and "{/* Active Invites */}" in line:
        registered_end = i
        active_invites_start = i
    elif active_invites_start and not active_invites_end and "{/* API Configuration */}" in line:
        active_invites_end = i
        break

if all([registered_start, registered_end, active_invites_start, active_invites_end]):
    # Extract both sections
    registered_section = lines[registered_start:registered_end]
    active_invites_section = lines[active_invites_start:active_invites_end]
    
    # Remove both (in reverse order)
    del lines[active_invites_start:active_invites_end]
    del lines[registered_start:registered_end]
    
    # Find insertion point (after Generate Invite Code)
    insert_point = None
    for i, line in enumerate(lines):
        if "{/* API Configuration */}" in line or "{/* Source Material */}" in line:
            insert_point = i
            break
    
    if insert_point:
        # Insert Active Invites first, then Registered Users
        for line in reversed(active_invites_section):
            lines.insert(insert_point, line)
        for line in reversed(registered_section):
            lines.insert(insert_point, line)
        
        with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
            f.writelines(lines)
        
        print("✅ Swapped Registered Users and Active Invites!")
        print("Final order:")
        print("  1. Feature Access Overview")
        print("  2. Generate Invite Code")
        print("  3. Registered Users")
        print("  4. Active Invites")
    else:
        print("❌ Could not find insertion point")
else:
    print(f"❌ Could not find sections")
    print(f"registered: {registered_start}-{registered_end}")
    print(f"active_invites: {active_invites_start}-{active_invites_end}")
