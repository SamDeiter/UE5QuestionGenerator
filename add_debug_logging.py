"""
Add debug logging to AdminPanel super admin check
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add console logging after the isSuperAdmin check
old_code = '''}) => {
  // Super Admin check - only sam.deiter@epicgames.com
  const isSuperAdmin = currentUser?.email === "sam.deiter@epicgames.com";

  const [users, setUsers] = useState([]);'''

new_code = '''}) => {
  // Super Admin check - only sam.deiter@epicgames.com
  const isSuperAdmin = currentUser?.email === "sam.deiter@epicgames.com";
  
  // Debug logging
  console.log("AdminPanel - currentUser:", currentUser);
  console.log("AdminPanel - currentUser email:", currentUser?.email);
  console.log("AdminPanel - isSuperAdmin:", isSuperAdmin);

  const [users, setUsers] = useState([]);'''

content = content.replace(old_code, new_code)

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Added debug logging to AdminPanel")
