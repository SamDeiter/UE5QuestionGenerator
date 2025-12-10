"""
Refactor useGeneration.js to use extracted hooks
"""

# Read the original file
with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useGeneration.js', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = f.readlines()

# Create the refactored version
refactored = """import { useState } from 'react';
import { generateContent, generateCritique } from '../services/gemini';
import { constructSystemPrompt } from '../services/promptBuilder';
import { parseQuestions } from '../utils/helpers';
import { validateQuestion } from '../utils/questionValidator';
import { analyzeRequest, estimateTokens } from '../utils/tokenCounter';
import { logGeneration, logQuestion } from '../utils/analyticsStore';
import { validateGeneration } from '../utils/quotaEnforcement';

// Import extracted hooks
import { convertMCtoTF } from './generation/utils/questionConverter';
import { useQuestionActions } from './generation/useQuestionActions';
import { useTranslation } from './generation/useTranslation';

export const useGeneration = (
    config,
    setConfig,
    effectiveApiKey,
    isApiReady,
    isTargetMet,
    maxBatchSize,
    getFileContext,
    checkAndStoreQuestions,
    addQuestionsToState,
    updateQuestionInState,
    handleLanguageSwitch,
    showMessage,
    setStatus,
    setShowNameModal,
    setShowApiError,
    setShowHistory,
    translationMap,
    allQuestionsMap
) => {
    const [isGenerating, setIsGenerating] = useState(false);

    // Use extracted hooks
    const questionActions = useQuestionActions({
        effectiveApiKey,
        isApiReady,
        config,
        getFileContext,
        checkAndStoreQuestions,
        addQuestionsToState,
        updateQuestionInState,
        showMessage,
        setStatus
    });

    const translation = useTranslation({
        effectiveApiKey,
        isApiReady,
        checkAndStoreQuestions,
        addQuestionsToState,
        handleLanguageSwitch,
        showMessage,
        setStatus,
        setShowHistory,
        translationMap,
        allQuestionsMap
    });
"""

# Find the handleGenerate function (lines 115-419)
handle_generate_start = 114  # 0-indexed
handle_generate_end = 419

# Extract handleGenerate
handle_generate_lines = lines[handle_generate_start:handle_generate_end]
handle_generate_code = ''.join(handle_generate_lines)

# Add handleGenerate to refactored version
refactored += "\n    " + handle_generate_code

# Add the return statement
refactored += """
    return {
        isGenerating,
        isProcessing: questionActions.isProcessing || translation.isProcessing,
        translationProgress: translation.translationProgress,
        handleGenerate,
        handleTranslateSingle: translation.handleTranslateSingle,
        handleExplain: questionActions.handleExplain,
        handleVariate: questionActions.handleVariate,
        handleCritique: questionActions.handleCritique,
        handleBulkTranslateMissing: translation.handleBulkTranslateMissing,
        handleApplyRewrite: questionActions.handleApplyRewrite
    };
};
"""

# Write the refactored file
with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useGeneration.js', 'w', encoding='utf-8') as f:
    f.write(refactored)

print("✓ Refactored useGeneration.js")
print(f"Original: 763 lines")
print(f"Refactored: {len(refactored.splitlines())} lines")
print(f"Reduction: {763 - len(refactored.splitlines())} lines")
