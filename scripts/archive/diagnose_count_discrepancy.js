/**
 * Diagnostic script to analyze the 2041 vs 1691 question count discrepancy
 * 
 * Run in browser console while on localhost:5173/UE5QuestionGenerator/
 */

// Paste this in the browser console to analyze the discrepancy
(async () => {
  console.log('=== QUESTION COUNT DIAGNOSTIC ===\n');
  
  // Try to access React state
  const root = document.querySelector('#root');
  const fiber = root?._reactRootContainer?._internalRoot?.current;
  
  if (!fiber) {
    console.error('Could not access React fiber. Make sure you are on the app page.');
    return;
  }
  
  // Helper to find state in fiber
  const findInFiber = (node, predicate, depth = 0) => {
    if (depth > 500 || !node) return null;
    if (predicate(node)) return node;
    return findInFiber(node.child, predicate, depth + 1) || findInFiber(node.sibling, predicate, depth + 1);
  };
  
  // Find the allQuestionsMap
  const questionsNode = findInFiber(fiber, n => n.memoizedState && n.memoizedState.allQuestionsMap);
  
  if (!questionsNode) {
    console.error('Could not find allQuestionsMap in React state');
    return;
  }
  
  const allQuestionsMap = questionsNode.memoizedState.allQuestionsMap;
  console.log(`Total unique IDs in map: ${allQuestionsMap.size}`);
  
  // Analyze the questions
  const allQuestions = Array.from(allQuestionsMap.values()).flat();
  console.log(`Total documents (including translations): ${allQuestions.length}\n`);
  
  // Group by language
  const byLanguage = {};
  allQuestions.forEach(q => {
    const lang = q.language || 'English';
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;
  });
  console.log('Documents by Language:');
  console.table(byLanguage);
  
  // Check for questions with missing or invalid uniqueId
  const noUniqueId = allQuestions.filter(q => !q.uniqueId);
  console.log(`\nQuestions without uniqueId: ${noUniqueId.length}`);
  
  // Check for duplicate uniqueIds (shouldn't happen if map is working)
  const uniqueIdCounts = {};
  Array.from(allQuestionsMap.keys()).forEach(id => {
    const variants = allQuestionsMap.get(id);
    uniqueIdCounts[variants.length] = (uniqueIdCounts[variants.length] || 0) + 1;
  });
  console.log('\nUnique IDs by variant count:');
  console.table(uniqueIdCounts);
  
  // Check for English-only questions
  const englishOnly = Array.from(allQuestionsMap.values()).filter(variants => 
    variants.length === 1 && (variants[0].language === 'English' || !variants[0].language)
  );
  console.log(`\nEnglish-only questions (no translations): ${englishOnly.length}`);
  
  // Check for questions with translations
  const withTranslations = Array.from(allQuestionsMap.values()).filter(variants => variants.length > 1);
  console.log(`Questions with translations: ${withTranslations.length}`);
  
  // Calculate expected count if we only count English versions
  const englishQuestions = Array.from(allQuestionsMap.values()).map(variants => 
    variants.find(v => v.language === 'English' || !v.language) || variants[0]
  );
  console.log(`\nEnglish/primary versions: ${englishQuestions.length}`);
  
  // Check for status distribution
  const byStatus = {};
  englishQuestions.forEach(q => {
    const status = q.status || 'no-status';
    byStatus[status] = (byStatus[status] || 0) + 1;
  });
  console.log('\nEnglish questions by status:');
  console.table(byStatus);
  
  // Check for discipline distribution
  const byDiscipline = {};
  englishQuestions.forEach(q => {
    const discipline = q.discipline || 'no-discipline';
    byDiscipline[discipline] = (byDiscipline[discipline] || 0) + 1;
  });
  console.log('\nEnglish questions by discipline:');
  console.table(byDiscipline);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total unique IDs: ${allQuestionsMap.size}`);
  console.log(`Expected count: 1691`);
  console.log(`Discrepancy: ${allQuestionsMap.size - 1691} extra questions`);
  console.log('\nPossible causes:');
  console.log('1. Database has 350 questions that should be filtered out');
  console.log('2. Expected count of 1691 is outdated');
  console.log('3. There are duplicate questions with different uniqueIds');
  
  return {
    totalUniqueIds: allQuestionsMap.size,
    totalDocuments: allQuestions.length,
    byLanguage,
    byStatus,
    byDiscipline,
    englishOnly: englishOnly.length,
    withTranslations: withTranslations.length
  };
})();
