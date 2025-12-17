import re

# Read the file
with open(r'src\hooks\useFiltering.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the contextFilteredQuestions useMemo and add logging at the start
# Look for the pattern after "const contextFilteredQuestions = useMemo("
pattern = r'(const contextFilteredQuestions = useMemo\(\s*\(\) => \{)'
replacement = r'''\1
    console.log("🔍 [useFiltering] contextFilteredQuestions recalculating. Config:", {
      discipline,
      difficulty,
      type,
      language,
      showHistory,
      appMode,
    });'''

content = re.sub(pattern, replacement, content)

# Write back
with open(r'src\hooks\useFiltering.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Added logging to contextFilteredQuestions")
