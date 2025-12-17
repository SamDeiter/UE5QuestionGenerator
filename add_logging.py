import re

# Read the file
with open(r'src\hooks\useFiltering.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add logging to the reset index useEffect
content = content.replace(
    '  useEffect(() => {\n    setCurrentReviewIndex(0);',
    '''  useEffect(() => {
    console.log("🔄 [useFiltering] Resetting review index to 0. Triggered by:", {
      appMode,
      filterMode,
      searchTerm,
    });
    setCurrentReviewIndex(0);'''
)

# Write back
with open(r'src\hooks\useFiltering.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Added logging to useFiltering.js")
