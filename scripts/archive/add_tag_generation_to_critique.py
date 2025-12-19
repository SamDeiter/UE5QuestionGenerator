"""
Script to add tag generation to handleCritique function
Phase 2: Update Critique to Generate Tags
"""

import re

def update_critique_with_tags():
    filepath = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useGeneration.js"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Step 1: Add generateTagsSecure to imports (line 4-5 area)
    old_import = 'import {\r\n  generateContentSecure as generateContent,\r\n  generateCritiqueSecure as generateCritique,\r\n} from "../services/geminiSecure";'
    
    new_import = '''import {
  generateContentSecure as generateContent,
  generateCritiqueSecure as generateCritique,
  generateTagsSecure,
} from "../services/geminiSecure";'''
    
    content = content.replace(old_import, new_import)
    
    # Step 2: Update handleCritique function to generate tags (after line 885)
    # Find the section after getting critique response
    old_critique_update = '''      const { score, text, rewrite, changes } = await generateCritique(
        effectiveApiKey,
        q
      );

      // Track critique attempts'''
    
    new_critique_update = '''      const { score, text, rewrite, changes } = await generateCritique(
        effectiveApiKey,
        q
      );

      // Generate tags if question has fewer than 3
      let suggestedTags = q.tags || [];
      if (suggestedTags.length < 3 && rewrite) {
        try {
          const improvedQuestion = {
            question: rewrite.question || q.question,
            optionA: rewrite.optionA || q.options?.A,
            optionB: rewrite.optionB || q.options?.B,
            optionC: rewrite.optionC || q.options?.C,
            optionD: rewrite.optionD || q.options?.D,
          };
          const newTags = await generateTagsSecure(effectiveApiKey, improvedQuestion);
          if (newTags && newTags.length > 0) {
            suggestedTags = [
              ...new Set([
                ...suggestedTags,
                ...newTags.map(t => t.replace(/^#/, ''))
              ])
            ];
          }
        } catch (error) {
          console.error('Tag generation failed during critique:', error);
        }
      }

      // Update rewrite object to include suggested tags
      const updatedRewrite = rewrite ? { ...rewrite, tags: suggestedTags } : null;

      // Track critique attempts'''
    
    content = content.replace(old_critique_update, new_critique_update)
    
    # Step 3: Update the rewrite assignment in updateQuestionInState calls
    # Replace "suggestedRewrite: rewrite," with "suggestedRewrite: updatedRewrite,"
    content = re.sub(
        r'suggestedRewrite: rewrite,',
        'suggestedRewrite: updatedRewrite,',
        content
    )
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Phase 2 Complete: Added tag generation to handleCritique")
    print("   - Added generateTagsSecure import")
    print("   - Added tag generation logic (runs when tags < 3)")
    print("   - Updated suggestedRewrite to include tags")

if __name__ == "__main__":
    update_critique_with_tags()
