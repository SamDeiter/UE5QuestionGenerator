import re

# Read the file
with open(r'src\hooks\useFiltering.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and comment out the entire reset index useEffect
# We'll replace it with a smarter version that only resets when the current question is not in the new list

pattern = r'(  // Reset review index when filters change.*?useEffect\(\(\) => \{.*?setCurrentReviewIndex\(0\);.*?\}, \[.*?searchTerm,.*?\]\);)'

replacement = r'''  // DISABLED: Old reset logic that was causing questions to jump
  // We now handle this more intelligently below
  /*
\1
  */'''

content = re.sub(pattern, replacement, flags=re.DOTALL)

# Write back
with open(r'src\hooks\useFiltering.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Disabled automatic index reset")
