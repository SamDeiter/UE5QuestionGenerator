import sys

def apply_changes(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add Reviewer to role dropdown
    target1 = '''<option value="user">User</option>
                  <option value="admin">Admin</option>'''
    replacement1 = '''<option value="user">User</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>'''
    
    if target1 in content:
        content = content.replace(target1, replacement1)
    else:
        # Try with different indentation or spacing
        target1_alt = '<option value="user">User</option>\n                  <option value="admin">Admin</option>'
        if target1_alt in content:
             content = content.replace(target1_alt, replacement1)
        else:
            print(f"Warning: Could not find target1 in {file_path}")

    # 2. Update handleChangeRole cycle
    target2 = 'const newRole = currentRole === "admin" ? "user" : "admin";'
    replacement2 = '''const getNextRole = (role) => {
      if (role === "admin") return "user";
      if (role === "reviewer") return "admin";
      return "reviewer";
    };
    const newRole = getNextRole(currentRole);'''
    
    if target2 in content:
        content = content.replace(target2, replacement2)
    else:
        print(f"Error: Could not find target2 in {file_path}")
        return False

    # 3. Add Reviewer card to Feature Access Overview
    # Find the King/Admin card and insert Reviewer card before it
    target3 = '<div className="bg-slate-800/50 p-4 rounded border border-purple-500/30">'
    reviewer_card = '''<div className="bg-slate-800/50 p-4 rounded border border-blue-500/30">
              <h3 className="text-sm font-bold text-blue-400 mb-3">
                🔍 Reviewers (Limited Access)
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Icon name="check" size={12} className="text-blue-400" />
                  All Regular User Features
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="database" size={12} className="text-blue-400" />
                  Database View (Extended Access)
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <Icon name="x" size={12} className="text-red-400" />
                  <span className="line-through">Create Questions</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <Icon name="x" size={12} className="text-red-400" />
                  <span className="line-through">Admin Panel</span>
                </li>
              </ul>
            </div>

            '''
    if target3 in content:
        content = content.replace(target3, reviewer_card + target3)
    else:
        print(f"Warning: Could not find target3 in {file_path}")

    # 4. Update Grid columns for 3 cards
    target4 = '<div className="grid grid-cols-2 gap-4">'
    replacement4 = '<div className="grid grid-cols-1 md:grid-cols-3 gap-4">'
    if target4 in content:
        content = content.replace(target4, replacement4)

    # 5. Fix role badge color for reviewer
    target5 = 'user.role === "admin"\n                            ? "bg-purple-600 text-white"\n                            : "bg-slate-600 text-slate-300"'
    # This is multiline and tricky with replace. Let's try a simpler regex-like approach or just direct match if exact.
    # Actually let's look at the file again for the exact lines.
    
    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    
    print(f"Successfully updated {file_path}")
    return True

if __name__ == "__main__":
    file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx'
    if apply_changes(file_path):
        sys.exit(0)
    else:
        sys.exit(1)
