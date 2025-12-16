"""
Script to integrate ImprovementModal into QuestionItem.jsx
Phase 1.1 & 1.2: Add badge button and modal rendering
"""

import re

def integrate_modal():
    filepath = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\QuestionItem.jsx"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Task 1.1: Add improvement badge button after QuestionActions (line 105-106 area)
    badge_code = '''          </div>

          {/* AI Improvement Badge */}
          {q.suggestedRewrite && (
            <button
              onClick={() => setShowImprovementModal(true)}
              className="px-3 py-2 rounded-lg font-bold text-sm bg-green-600/20 text-green-300 hover:bg-green-600/30 border-2 border-green-500/50 hover:border-green-400 transition-all flex items-center gap-2 animate-pulse hover:animate-none"
              title="AI improvement available"
            >
              <Icon name="sparkles" size={16} />
              <span>+{(q.suggestedRewrite.critiqueScore || 0) - (q.critiqueScore || 0)} pts</span>
            </button>
          )}'''
    
    # Replace the closing div after QuestionActions
    pattern = r'(\s+</div>\s+</div>\s+{/\* Review Progress Bar)'
    replacement = badge_code + r'''
        </div>

        {/* Review Progress Bar'''
    
    content = re.sub(pattern, replacement, content, count=1)
    
    # Task 1.2: Add modal rendering before the closing div (before line 190)
    modal_code = '''
      {/* AI Improvement Modal */}
      {showImprovementModal && q.suggestedRewrite && (
        <ImprovementModal
          originalQuestion={q}
          improvedQuestion={{...q, ...q.suggestedRewrite}}
          onApply={async (improved) => {
            // Apply improvements to question
            await onUpdateQuestion(q.id, {
              question: improved.question,
              options: improved.options,
              optionA: improved.optionA,
              optionB: improved.optionB,
              optionC: improved.optionC,
              optionD: improved.optionD,
              tags: improved.tags,
              critiqueScore: improved.critiqueScore,
              suggestedRewrite: null, // Clear suggestion after apply
            });
            setShowImprovementModal(false);
            if (showMessage) {
              showMessage("✅ Improvement applied! Now verify and accept.", 3000);
            }
          }}
          onDismiss={() => setShowImprovementModal(false)}
        />
      )}
    </div>'''
    
    # Find the closing div before the export
    pattern2 = r'(\s+</div>\s+</div>\s+\);\s+};\s+export default)'
    replacement2 = modal_code + r'''
  );
};

export default'''
    
    content = re.sub(pattern2, replacement2, content, count=1)
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Phase 1.1 & 1.2 Complete: ImprovementModal integrated into QuestionItem.jsx")
    print("   - Added AI Improvement badge button")
    print("   - Added modal rendering with apply logic")

if __name__ == "__main__":
    integrate_modal()
