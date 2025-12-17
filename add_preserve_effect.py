import re

# Read the file
with open(r'src\hooks\useFiltering.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where to insert the new useEffect (after the uniqueFilteredQuestions useMemo)
insert_index = None
for i, line in enumerate(lines):
    if '// eslint-disable-next-line react-hooks/exhaustive-deps' in line and i > 200:
        # Insert after the uniqueFilteredQuestions useMemo
        insert_index = i + 4  # After the closing of useMemo
        break

if insert_index:
    new_effect = '''
  // Preserve current question position when filters change
  useEffect(() => {
    if (uniqueFilteredQuestions.length === 0) return;
    
    // Get the current question
    const currentQ = uniqueFilteredQuestions[currentReviewIndex];
    if (!currentQ) return;
    
    // Store the current uniqueId
    const currentUniqueId = currentQ.uniqueId;
    
    // When discipline/difficulty/language changes, try to find the same question in the new list
    if (currentUniqueId) {
      const newIndex = uniqueFilteredQuestions.findIndex(q => q.uniqueId === currentUniqueId);
      if (newIndex !== -1 && newIndex !== currentReviewIndex) {
        console.log(`📍 [useFiltering] Preserving question position: ${currentUniqueId} moved from index ${currentReviewIndex} to ${newIndex}`);
        setCurrentReviewIndex(newIndex);
      }
    }
  }, [discipline, difficulty, language]); // Only run when these filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // NOTE: uniqueFilteredQuestions and currentReviewIndex intentionally excluded to avoid loops

'''
    lines.insert(insert_index, new_effect)
    
    with open(r'src\hooks\useFiltering.js', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("✅ Added question preservation effect")
else:
    print("❌ Could not find insertion point")
