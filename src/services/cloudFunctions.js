/**
 * Cloud Functions Service
 * Secure wrapper for calling Firebase Cloud Functions
 * This replaces direct Gemini API calls to keep the API key server-side
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from './firebase';

// Initialize Cloud Functions
const functions = getFunctions(app, 'us-central1');

/**
 * Calls the generateQuestions Cloud Function
 * @param {string} systemPrompt - System instruction for the AI
 * @param {string} userPrompt - User's question/request
 * @param {function} setStatus - Optional status callback
 * @param {number} temperature - Temperature for generation (default 0.2)
 * @param {string} model - Model name (default 'gemini-2.0-flash')
 * @returns {Promise<string>} Generated text response
 */
export const generateContentViaCloudFunction = async (
    systemPrompt,
    userPrompt,
    setStatus = () => {},
    temperature = 0.2,
    model = 'gemini-2.0-flash-exp'
) => {
    try {
        setStatus('Calling secure Cloud Function...');
        
        const generateQuestions = httpsCallable(functions, 'generateQuestions');
        
        const result = await generateQuestions({
            systemPrompt,
            userPrompt,
            temperature,
            model
        });

        if (!result.data.success) {
            throw new Error(result.data.error || 'Cloud Function failed');
        }

        setStatus('Response received!');
        
        // Store grounding sources globally (for backward compatibility)
        if (result.data.groundingSources && result.data.groundingSources.length > 0) {
            console.log('📚 Grounding sources found:', result.data.groundingSources);
            window.__lastGroundingSources = result.data.groundingSources;
        }

        return result.data.textResponse;

    } catch (error) {
        console.error('Cloud Function error:', error);
        setStatus(`Error: ${error.message}`);
        throw error;
    }
};

/**
 * Calls the generateCritique Cloud Function
 * @param {object} question - Question object { question, options, correct, modeLabel }
 * @returns {Promise<{score: number, text: string, rewrite: object, changes: string}>}
 */
export const generateCritiqueViaCloudFunction = async (question) => {
    try {
        const generateCritique = httpsCallable(functions, 'generateCritique');
        
        const result = await generateCritique({
            question: question.question,
            options: question.options,
            correct: question.correct,
            modeLabel: question.modeLabel
        });

        if (!result.data.success) {
            throw new Error(result.data.error || 'Critique failed');
        }

        console.log('[CloudFunction DEBUG] Raw result.data:', JSON.stringify(result.data).substring(0, 200));
        console.log('[CloudFunction DEBUG] Extracted score:', result.data.score);

        return {
            score: result.data.score,
            text: result.data.text,
            rewrite: result.data.rewrite,
            changes: result.data.changes
        };

    } catch (error) {
        console.error('Critique Cloud Function error:', error);
        throw error;
    }
};

/**
 * Helper to check if user is authenticated (required for Cloud Functions)
 * @returns {boolean}
 */
export const isUserAuthenticated = () => {
    return !!auth.currentUser;
};
