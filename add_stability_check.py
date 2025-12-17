import re

# Read the file
with open(r'src\hooks\useFiltering.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the contextFilteredQuestions useMemo and wrap the result with a stability check
# We'll use useRef to store the previous result and only return a new array if the IDs changed

# First, find where we return the result and add a stability check
pattern = r'(const contextFilteredQuestions = useMemo\(\s*\(\) => \{[^}]*)(return createFilteredQuestions\([^)]+\);)'

# We need to capture the result, compare it to previous, and only return new if different
replacement = r'''\1const newResult = createFilteredQuestions(
        questions,
        historicalQuestions,
        showHistory || appMode === "review" || appMode === "create",
        "all",
        filterByCreator,
        searchTerm,
        creatorName,
        discipline,
        appMode === "review" ? null : difficulty,
        appMode === "review" ? null : type,
        language,
        filterTags,
        filterScoreTier
      );

      // STABILITY: Only return new array if the question IDs actually changed
      const newIds = newResult.map(q => q.id || q.uniqueId).join(',');
      const prevIds = prevContextFilteredRef.current.map(q => q.id || q.uniqueId).join(',');
      
      if (newIds === prevIds && prevContextFilteredRef.current.length > 0) {
        console.log("🔒 [useFiltering] contextFilteredQuestions STABLE (same IDs, reusing previous array)");
        return prevContextFilteredRef.current;
      }
      
      console.log("🔄 [useFiltering] contextFilteredQuestions CHANGED (new IDs, returning new array)");
      prevContextFilteredRef.current = newResult;
      return newResult;'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open(r'src\hooks\useFiltering.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Added stability check to contextFilteredQuestions")
