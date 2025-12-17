"""
Remove Token Usage and AI Score Import sections from AdminPanel
"""

with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Track sections to remove
remove_ranges = []

# Find Token Usage section
token_start = None
for i, line in enumerate(lines):
    if "{/* Token Usage */}" in line:
        token_start = i
    elif token_start and "{/* API Configuration */}" in line:
        remove_ranges.append((token_start, i))
        token_start = None
        break

# Find AI Score Import section
ai_score_start = None
for i, line in enumerate(lines):
    if "{/* AI Score Import */}" in line:
        ai_score_start = i
    elif ai_score_start and "{/* Environment Info */}" in line:
        remove_ranges.append((ai_score_start, i))
        ai_score_start = None
        break

# Remove sections in reverse order to preserve indices
for start, end in reversed(remove_ranges):
    del lines[start:end]
    print(f"✅ Removed section from line {start} to {end}")

# Write back
with open(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"✅ Removed {len(remove_ranges)} obsolete sections from Admin Panel")
