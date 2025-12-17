"""
Update Header to show SUPER ADMIN badge for super admins
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\Header.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add user prop to Header component
content = content.replace(
    '''  isAdmin,
  onSignOut,
}) => {''',
    '''  isAdmin,
  onSignOut,
  user, // Add user prop for super admin check
}) => {
  // Super Admin check
  const isSuperAdmin = user?.email === "sam.deiter@epicgames.com";'''
)

# 2. Update desktop ADMIN badge to show SUPER ADMIN for super admins
content = content.replace(
    '''              {isAdmin && (
                <span className="text-[9px] font-semibold bg-orange-900/50 text-orange-400 px-1 py-0.5 rounded border border-orange-800 ml-0.5">
                  ADMIN
                </span>
              )}''',
    '''              {isAdmin && (
                <span className={`text-[9px] font-semibold px-1 py-0.5 rounded border ml-0.5 ${
                  isSuperAdmin 
                    ? "bg-purple-900/50 text-purple-400 border-purple-800" 
                    : "bg-orange-900/50 text-orange-400 border-orange-800"
                }`}>
                  {isSuperAdmin ? "SUPER" : "ADMIN"}
                </span>
              )}'''
)

# 3. Update mobile ADMIN badge to show SUPER ADMIN for super admins
content = content.replace(
    '''                  {isAdmin && (
                    <span className="text-[11px] font-semibold bg-orange-900/50 text-orange-400 px-1.5 py-0.5 rounded border border-orange-800">
                      ADMIN
                    </span>
                  )}''',
    '''                  {isAdmin && (
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${
                      isSuperAdmin 
                        ? "bg-purple-900/50 text-purple-400 border-purple-800" 
                        : "bg-orange-900/50 text-orange-400 border-orange-800"
                    }`}>
                      {isSuperAdmin ? "SUPER" : "ADMIN"}
                    </span>
                  )}'''
)

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\Header.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Updated Header to show SUPER ADMIN badge!")
print("   - sam.deiter@epicgames.com will see purple 'SUPER' badge")
print("   - Other admins will see orange 'ADMIN' badge")
