import sys

def apply_changes(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update createInvite to allow "reviewer"
    target1 = 'role: role === "admin" ? "admin" : "user",'
    replacement1 = 'role: ["admin", "reviewer"].includes(role) ? role : "user",'
    
    if target1 in content:
        content = content.replace(target1, replacement1)
    else:
        print(f"Error: Could not find target1 in {file_path}")
        return False

    # 2. Update changeUserRole to allow "reviewer"
    target2 = 'if (!["user", "admin"].includes(role)) {'
    replacement2 = 'if (!["user", "admin", "reviewer"].includes(role)) {'
    
    if target2 in content:
        content = content.replace(target2, replacement2)
    else:
        print(f"Error: Could not find target2 in {file_path}")
        return False

    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    
    print(f"Successfully updated {file_path}")
    return True

if __name__ == "__main__":
    file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\functions\index.js'
    if apply_changes(file_path):
        sys.exit(0)
    else:
        sys.exit(1)
