import sys

def apply_changes(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Extract userRole from useAuth
    target1 = 'isAdmin,\n    isRegistered: _isRegistered,'
    replacement1 = 'isAdmin,\n    userRole,\n    isRegistered: _isRegistered,'
    
    if target1 in content:
        content = content.replace(target1, replacement1)
    else:
        print(f"Error: Could not find target1 in {file_path}")
        return False

    # 2. Add registration check for authenticated users
    target2 = '// User is authenticated - proceed to app (no registration check needed)\n\n  if (appMode === "landing") {'
    replacement2 = '''// User is authenticated - enforce registration check
  if (!_isRegistered) {
    // If not registered and not on an invite URL, show invite-only message or redirect to sign in
    return (
      <InviteSignUp
        onSuccess={(role) => {
          markAsRegistered(role);
        }}
      />
    );
  }

  if (appMode === "landing") {'''
    
    if target2 in content:
        content = content.replace(target2, replacement2)
    else:
        print(f"Error: Could not find target2 in {file_path}")
        return False

    # 3. Propagate userRole to QuestionItem via viewRouterHandlers/state
    target3 = 'handleUpdateQuestion,\n    }),'
    replacement3 = 'handleUpdateQuestion,\n      userRole,\n    }),'
    
    if target3 in content:
        content = content.replace(target3, replacement3)

    target4 = 'showHistory,\n            currentUser: user, // Add user for super admin check'
    replacement4 = 'showHistory,\n            currentUser: user,\n            userRole, // Add role for component restrictions'
    if target4 in content:
        content = content.replace(target4, replacement4)

    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    
    print(f"Successfully updated {file_path}")
    return True

if __name__ == "__main__":
    file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\App.jsx'
    if apply_changes(file_path):
        sys.exit(0)
    else:
        sys.exit(1)
