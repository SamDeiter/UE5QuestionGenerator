"""
Add conditional rendering to ALL remaining Admin Panel sections
This creates properly formatted JSX conditional wrappers
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# List of sections that need conditional rendering (state_key, search_text_after_h2_close)
# Format: (state_key, unique text after </h2> to identify the content start)
sections_to_wrap = [
    ("generateInvite", "Generate Invite Code", "        <div className=\"grid grid-cols-2 gap-3 mb-4\">"),
    ("registeredUsers", "Registered Users", "        <div className=\"space-y-2\">"),
    ("apiConfig", "API Configuration", "        <div className=\"space-y-3\">"),
    ("sourceMaterial", "Source Material", "        <div className=\"space-y-3\">"),
    ("customTags", "Custom Tags", "        <p className=\"text-xs text-slate-400 mb-3\">"),
    ("trainingData", "Vertex AI Training Data", "        <div className=\"flex gap-3 mb-2\">"),
    ("envInfo", "Environment Info", "        <div className=\"bg-slate-700/30 p-3 rounded text-xs space-y-2\">"),
    ("databaseMgmt", "Database Management", "        <div className=\"space-y-3\">"),
]

for state_key, section_name, start_div in sections_to_wrap:
    # Skip if already has conditional for this section
    if f"!collapsed.{state_key}" in content:
        print(f"✓ {section_name} already has conditional rendering")
        continue
    
    # Find the section
    if section_name not in content:
        print(f"⚠️  Skipping {section_name} - not found")
        continue
    
    # Find where to insert the conditional (after </h2> and before the content div)
    header_pattern = f"{section_name}</h2>"
    header_pos = content.find(header_pattern)
    if header_pos == -1:
        print(f"⚠️  Skipping {section_name} - header not found")
        continue
    
    # Find the end of </h2>
    h2_end = content.find("</h2>", header_pos) + 5
    
    # Find the start of content
    content_start = content.find(start_div, h2_end)
    if content_start == -1:
        print(f"⚠️  Skipping {section_name} - content div not found")
        continue
    
    # Insert opening conditional
    before = content[:content_start]
    after = content[content_start:]
    content = before + f"{{!collapsed.{state_key} && (\n        " + after
    
    # Now find the closing div for this section
    # Look for next section comment
    next_section_pos = content.find("{/*", content_start + 50)
    if next_section_pos == -1:
        next_section_pos = len(content)
    
    # Find the last </div> before next section that closes the section container
    section_content = content[content_start:next_section_pos]
    last_closing_div = section_content.rfind("      </div>")
    
    if last_closing_div != -1:
        # Insert closing conditional before the section's closing div
        abs_pos = content_start + last_closing_div
        content = content[:abs_pos] + "        )}\n" + content[abs_pos:]
        print(f"✅ Added conditional to {section_name}")
    else:
        print(f"⚠️  Could not find closing div for {section_name}")

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ Conditional rendering complete!")
