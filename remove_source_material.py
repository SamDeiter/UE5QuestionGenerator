"""
Remove Source Material section from AdminPanel.jsx
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

start_marker = "{/* Source Files - Super Admin Only */}"
end_marker_context = "      {/* Custom Tags */}"

new_lines = []
skip = False
for line in lines:
    if start_marker in line:
        skip = True
        continue
    
    if skip and end_marker_context in line:
        skip = False
        # Don't skip the Custom Tags line itself
        new_lines.append(line)
        continue
        
    if not skip:
        new_lines.append(line)

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("✅ Removed Source Material section!")
