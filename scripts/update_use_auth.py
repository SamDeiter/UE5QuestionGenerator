import sys

def apply_changes(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add userRole state
    target1 = 'const [isAdmin, setIsAdmin] = useState(false);'
    replacement1 = 'const [isAdmin, setIsAdmin] = useState(false);\n  const [userRole, setUserRole] = useState("user");'
    
    if target1 in content:
        content = content.replace(target1, replacement1)
    else:
        print(f"Error: Could not find target1 in {file_path}")
        return False

    # 2. Update role in useEffect
    target2 = 'setIsRegistered(regStatus.registered);\n\n          // Admin status comes from the registration check\n          if (regStatus.role === "admin") {\n            setIsAdmin(true);\n          } else {\n            setIsAdmin(false);\n          }'
    replacement2 = 'setIsRegistered(regStatus.registered);\n          setUserRole(regStatus.role || "user");\n\n          // Admin status comes from the registration check\n          if (regStatus.role === "admin") {\n            setIsAdmin(true);\n          } else {\n            setIsAdmin(false);\n          }'
    
    if target2 in content:
        content = content.replace(target2, replacement2)
    else:
        # Try a more flexible match if direct fails
        print(f"Warning: Could not find target2 exactly, trying alternative...")
        target2_alt = 'setIsRegistered(regStatus.registered);'
        if target2_alt in content:
             content = content.replace(target2_alt, 'setIsRegistered(regStatus.registered);\n          setUserRole(regStatus.role || "user");')
        else:
            print(f"Error: Could not find target2 in {file_path}")
            return False

    # 3. Update whitelist fallback
    target3 = 'setIsAdmin(isWhitelisted);\n          setIsRegistered(isWhitelisted);'
    replacement3 = 'setIsAdmin(isWhitelisted);\n          setIsRegistered(isWhitelisted);\n          if (isWhitelisted) setUserRole("admin");'
    
    if target3 in content:
        content = content.replace(target3, replacement3)

    # 4. Update logout state
    target4 = 'setIsAdmin(false);\n        setIsRegistered(false);'
    replacement4 = 'setIsAdmin(false);\n        setIsRegistered(false);\n        setUserRole("user");'
    
    if target4 in content:
        content = content.replace(target4, replacement4)

    # 5. Update markAsRegistered
    target5 = 'const markAsRegistered = (role = "user") => {\n    setIsRegistered(true);\n    if (role === "admin") {\n      setIsAdmin(true);\n    }\n  };'
    replacement5 = 'const markAsRegistered = (role = "user") => {\n    setIsRegistered(true);\n    setUserRole(role);\n    if (role === "admin") {\n      setIsAdmin(true);\n    }\n  };'
    
    if target5 in content:
        content = content.replace(target5, replacement5)

    # 6. Update return object
    target6 = 'isAdmin,\n\n    // Registration state'
    replacement6 = 'isAdmin,\n    userRole,\n\n    // Registration state'
    
    if target6 in content:
        content = content.replace(target6, replacement6)

    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    
    print(f"Successfully updated {file_path}")
    return True

if __name__ == "__main__":
    file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useAuth.js'
    if apply_changes(file_path):
        sys.exit(0)
    else:
        sys.exit(1)
