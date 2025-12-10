import { useState } from 'react';
import { generateContentSecure as generateContent, generateCritiqueSecure as generateCritique } from '../../services/geminiSecure';
import { constructSystemPrompt } from '../../services/promptBuilder';
import { parseQuestions } from '../../utils/questionHelpers';

/**
 * Custom hook for question-related actions (explain, variate, critique).
 * Handles AI-powered operations on individual questions.
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.effectiveApiKey - The API key to use
 * @param {boolean} params.isApiReady - Whether the API is ready
 * @param {Object} params.config - Application configuration
 * @param {Function} params.getFileContext - Function to get file context
 * @param {Function} params.checkAndStoreQuestions - Function to store questions
 * @param {Function} params.addQuestionsToState - Function to add questions to state
 * @param {Function} params.updateQuestionInState - Function to update a question
 * @param {Function} params.showMessage - Function to show messages to user
 * @param {Function} params.setStatus - Function to set status message
 * @returns {Object} Question action handlers
 */
export const useQuestionActions = ({
    effectiveApiKey,
    isApiReady,
    config,
    getFileContext,
    checkAndStoreQuestions,
    addQuestionsToState,
    updateQuestionInState,
    showMessage,
    setStatus
}) => {
    const [isProcessing, setIsProcessing] = useState(false);

    /**
     * Generates an explanation for why an answer is correct
     * @param {Object} q - The question object
     */
    const handleExplain = async (q) => {
        if (!isApiReady) {
            showMessage("API key is required for explanation. Please enter it in the settings panel.", 5000);
            return;
        }

        setIsProcessing(true);
        setStatus('Explaining...');
        const prompt = `Explain WHY the answer is correct in simple terms: "${q.question}" Answer: "${q.correct === 'A' ? q.options.A : q.options.B}"`;
        
        try {
            const exp = await generateContent(effectiveApiKey, "Technical Assistant", prompt, setStatus);
            updateQuestionInState(q.id, (item) => ({ ...item, explanation: exp }));
            setStatus('');
        } catch (error) {
            console.error("Explanation failed:", error);
            setStatus('Fail');
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Generates improved variations of a question
     * @param {Object} q - The question object
     */
    const handleVariate = async (q) => {
        if (!isApiReady) {
            showMessage("API key is required for creation. Please enter it in the settings panel.", 5000);
            return;
        }

        setIsProcessing(true);
        setStatus('Creating improved variations...');

        // Build context-aware prompt that leverages critique feedback
        const hasCritique = q.critique && q.critiqueScore !== undefined;
        const critiqueContext = hasCritique
            ? `\n\nCRITIQUE FEEDBACK (Score: ${q.critiqueScore}/100):\n${q.critique}\n\nYour task: Generate 2 IMPROVED variations that ADDRESS the critique feedback above.`
            : `\n\nYour task: Generate 2 IMPROVED variations that are MORE CHALLENGING and PROFESSIONAL than the original.`;

        const sys = constructSystemPrompt(config, getFileContext());
        const prompt = `ORIGINAL QUESTION TO IMPROVE:
Discipline: ${q.discipline}
Difficulty: ${q.difficulty}
Type: ${q.type}
Question: "${q.question}"
Options:
  A) ${q.options.A}
  B) ${q.options.B}
  ${q.options.C ? `C) ${q.options.C}` : ''}
  ${q.options.D ? `D) ${q.options.D}` : ''}
Correct Answer: ${q.correct}
${critiqueContext}

REQUIREMENTS FOR VARIATIONS:
1. Address any weaknesses mentioned in the critique (if provided)
2. Increase depth and professional relevance
3. Use scenario-based or application-focused phrasing
4. Avoid trivial or overly simple questions
5. Maintain the same difficulty level: ${q.difficulty}
6. Keep the same type: ${q.type}

Output in Markdown Table format.`;

        try {
            const text = await generateContent(effectiveApiKey, sys, prompt, setStatus);
            const newQs = parseQuestions(text);
            if (newQs.length > 0) {
                const uniqueNewQuestions = await checkAndStoreQuestions(newQs);
                addQuestionsToState(uniqueNewQuestions, false);
                showMessage(`Added ${uniqueNewQuestions.length} improved variations.`, 3000);
            }
        } catch (e) {
            console.error("Variation generation failed:", e);
            setStatus('Fail');
            showMessage(`Failed to generate variations: ${e.message}`, 5000);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Generates an AI critique of a question with auto-reject logic
     * @param {Object} q - The question object
     */
    const handleCritique = async (q) => {
        if (!isApiReady) {
            showMessage("API key is required for critique. Please enter it in the settings panel.", 5000);
            return;
        }

        setIsProcessing(true);
        setStatus('Critiquing...');

        try {
            const { score, text, rewrite, changes } = await generateCritique(effectiveApiKey, q);

            // Track critique attempts
            const previousAttempts = q.critiqueAttempts || 0;
            const newAttemptCount = previousAttempts + 1;

            // Check if this is the 3rd failed attempt (score < 70)
            const MAX_ATTEMPTS = 3;
            const PASSING_SCORE = 70;

            if (score < PASSING_SCORE && newAttemptCount >= MAX_ATTEMPTS) {
                // Auto-reject after 3 failed attempts
                updateQuestionInState(q.id, (item) => ({
                    ...item,
                    critique: text,
                    critiqueScore: score,
                    suggestedRewrite: rewrite,
                    rewriteChanges: changes,
                    critiqueAttempts: newAttemptCount,
                    status: 'rejected',
                    rejectionReason: 'low_score_after_retries',
                    rejectedAt: new Date().toISOString()
                }));
                showMessage(`⛔ Auto-rejected: Score ${score}/100 after ${newAttemptCount} attempts. Quality too low.`, 6000);
            } else {
                // Normal update
                updateQuestionInState(q.id, (item) => ({
                    ...item,
                    critique: text,
                    critiqueScore: score,
                    suggestedRewrite: rewrite,
                    rewriteChanges: changes,
                    critiqueAttempts: newAttemptCount
                }));

                if (score < PASSING_SCORE) {
                    const attemptsLeft = MAX_ATTEMPTS - newAttemptCount;
                    showMessage(`Score: ${score}/100. ${attemptsLeft} attempt(s) left before auto-reject. Apply suggestions to improve!`, 5000);
                } else {
                    showMessage(`Critique Ready! Score: ${score}/100`, 3000);
                }
            }
        } catch (e) {
            console.error("Critique failed:", e);
            setStatus('Fail');
            showMessage(`Critique Failed: ${e.message}`, 5000);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Applies the AI-suggested rewrite to a question and re-critiques it
     * @param {Object} q - The question object with suggestedRewrite
     */
    const handleApplyRewrite = (q) => {
        if (!q.suggestedRewrite) return;

        const updatedQ = {
            ...q,
            question: q.suggestedRewrite.question,
            options: q.suggestedRewrite.options,
            correct: q.suggestedRewrite.correct,
            suggestedRewrite: null,
            rewriteChanges: null,
            critique: null,
            critiqueScore: null,
            humanVerified: false // Reset - human must verify
        };

        // Update state
        updateQuestionInState(q.id, () => updatedQ);

        showMessage("✓ Applied! Re-critiquing...", 2000);

        // Auto-run critique on the NEW version
        setTimeout(() => {
            handleCritique({ ...updatedQ, id: q.id });
        }, 300);
    };

    return {
        isProcessing,
        handleExplain,
        handleVariate,
        handleCritique,
        handleApplyRewrite
    };
};
