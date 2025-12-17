"""
Move Feature Access Overview to the very top (after header)
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find Feature Access Overview section
feature_start = None
feature_end = None
header_end = None

for i, line in enumerate(lines):
    if "{/* Header */}" in line:
        # Find the end of header section (next section marker)
        for j in range(i+1, len(lines)):
            if "{/*" in lines[j]:
                header_end = j
                break
    if "{/* Feature Access Overview */}" in line:
        feature_start = i
    elif feature_start and not feature_end and "{/*" in line and i != feature_start:
        feature_end = i
        break

if feature_start and feature_end and header_end:
    # Extract the Feature Access section
    feature_section = lines[feature_start:feature_end]
    
    # Remove from current position
    del lines[feature_start:feature_end]
    
    # Recalculate header_end after deletion
    for i, line in enumerate(lines):
        if "{/* Header */}" in line:
            for j in range(i+1, len(lines)):
                if "{/*" in lines[j]:
                    header_end = j
                    break
            break
    
    # Insert at top (right after header)
    for line in reversed(feature_section):
        lines.insert(header_end, line)
    
    with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
        f.writelines(lines)
    
    print("✅ Moved Feature Access Overview to top!")
    print("New order:")
    print("  1. Feature Access Overview")
    print("  2. Generate Invite Code")
    print("  3. Active Invites")
    print("  4. Registered Users")
    print("  5. (everything else)")
else:
    print(f"❌ Could not find sections")
    print(f"feature_start: {feature_start}, feature_end: {feature_end}, header_end: {header_end}")
