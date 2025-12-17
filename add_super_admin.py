"""
Add super admin role support to AdminPanel
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add currentUser prop
content = content.replace(
    "  onSaveCustomTags,\n}) => {",
    "  onSaveCustomTags,\n  currentUser, // Add currentUser prop\n}) => {\n  // Super Admin check - only sam.deiter@epicgames.com\n  const isSuperAdmin = currentUser?.email === \"sam.deiter@epicgames.com\";\n"
)

# 2. Wrap Source Material section with super admin check
content = content.replace(
    "      {/* Source Files */}\n      <div className=\"bg-slate-800 rounded-lg p-4 border border-blue-500/30\">",
    "      {/* Source Files - Super Admin Only */}\n      {isSuperAdmin && (\n      <div className=\"bg-slate-800 rounded-lg p-4 border border-blue-500/30\">"
)

# Find closing div for Source Material and add closing paren
# Look for the div closing before Custom Tags
source_material_end = content.find("{/* Custom Tags */}")
if source_material_end > 0:
    # Find the </div> before this comment
    last_div = content.rfind("      </div>", 0, source_material_end)
    if last_div > 0:
        content = content[:last_div] + "      </div>\n      )}\n" + content[last_div+13:]

# 3. Wrap Training Data Export with super admin check
content = content.replace(
    "      {/* Training Data Export */}\n      <div className=\"bg-slate-800 rounded-lg p-4 border border-purple-500/30\">",
    "      {/* Training Data Export - Super Admin Only */}\n      {isSuperAdmin && (\n      <div className=\"bg-slate-800 rounded-lg p-4 border border-purple-500/30\">"
)

# Find closing div for Training Data and add closing paren
training_data_end = content.find("{/* Environment Info */}")
if training_data_end > 0:
    last_div = content.rfind("      </div>", 0, training_data_end)
    if last_div > 0:
        content = content[:last_div] + "      </div>\n      )}\n" + content[last_div+13:]

# 4. Wrap Database Management with super admin check
content = content.replace(
    "      {/* Database Management */}\n      <div className=\"bg-slate-800 rounded-lg p-4 border border-red-500/30\">",
    "      {/* Database Management - Super Admin Only */}\n      {isSuperAdmin && (\n      <div className=\"bg-slate-800 rounded-lg p-4 border border-red-500/30\">"
)

# Find closing div for Database Management (it's the last section)
# Look for the final closing div before the component's return closing
db_mgmt_start = content.find("{/* Database Management - Super Admin Only */}")
if db_mgmt_start > 0:
    # Find the section's closing div
    section_end = content.find("    </div>\n  );\n}", db_mgmt_start)
    if section_end > 0:
        # Find the last </div> before this
        last_div = content.rfind("      </div>", db_mgmt_start, section_end)
        if last_div > 0:
            content = content[:last_div] + "      </div>\n      )}\n" + content[last_div+13:]

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Added super admin role support to AdminPanel!")
print("   - Only sam.deiter@epicgames.com can see:")
print("     • Source Material")
print("     • Training Data Export")
print("     • Database Management")
