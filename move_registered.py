"""
Move Registered Users section to right after Generate Invite Code
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the end of Generate Invite Code section and start of Registered Users
generate_invite_end = None
registered_users_start = None
registered_users_end = None

for i, line in enumerate(lines):
    # Find Generate Invite section end (next section after it)
    if "{/* Create Invite Section */}" in line:
        # Find the next section marker after this
        for j in range(i+1, len(lines)):
            if "{/*" in lines[j] and "Create Invite" not in lines[j]:
                generate_invite_end = j
                break
    
    # Find Registered Users section
    if "{/* Registered Users */}" in line:
        registered_users_start = i
        # Find next section after Registered Users
        for j in range(i+1, len(lines)):
            if "{/*" in lines[j] and "Registered Users" not in lines[j]:
                registered_users_end = j
                break

if all([generate_invite_end, registered_users_start, registered_users_end]):
    print(f"Found Generate Invite end at line {generate_invite_end}")
    print(f"Found Registered Users from line {registered_users_start} to {registered_users_end}")
    
    # Extract Registered Users section
    registered_section = lines[registered_users_start:registered_users_end]
    
    # Remove from current position
    del lines[registered_users_start:registered_users_end]
    
    # Recalculate insertion point (generate_invite_end might have shifted)
    generate_invite_end_new = None
    for i, line in enumerate(lines):
        if "{/* Create Invite Section */}" in line:
            for j in range(i+1, len(lines)):
                if "{/*" in lines[j] and "Create Invite" not in lines[j]:
                    generate_invite_end_new = j
                    break
            break
    
    if generate_invite_end_new:
        # Insert Registered Users right after Generate Invite
        for line in reversed(registered_section):
            lines.insert(generate_invite_end_new, line)
        
        with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
            f.writelines(lines)
        
        print("✅ Moved Registered Users to right after Generate Invite Code!")
        print("New order:")
        print("  1. Feature Access Overview")
        print("  2. Generate Invite Code")
        print("  3. Registered Users")
        print("  4. API Configuration")
        print("  5. (rest of sections)")
    else:
        print("❌ Could not find insertion point after deletion")
else:
    print(f"❌ Could not find all sections")
    print(f"generate_invite_end: {generate_invite_end}")
    print(f"registered_users_start: {registered_users_start}")
    print(f"registered_users_end: {registered_users_end}")
