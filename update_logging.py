import re

# Read the file
with open(r'src\hooks\useFiltering.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add detailed logging to contextFilteredQuestions to track which dependency changed
old_pattern = r'(const contextFilteredQuestions = useMemo\(\s*\(\) => \{)'
new_code = r'''\1
    console.log("🔍 [useFiltering] contextFilteredQuestions recalculating. Counts:", {
      questionsCount: questions.length,
      historicalQuestionsCount: historicalQuestions.length,
      discipline,
      difficulty,
      type,
      language,
      filterTags,
      filterScoreTier,
    });'''

content = re.sub(old_pattern, new_code, content)

# Write back
with open(r'src\hooks\useFiltering.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Updated contextFilteredQuestions logging")
