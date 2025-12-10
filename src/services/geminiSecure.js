import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase'; // Use existing Firebase app

/**
 * Secure Gemini Service using Firebase Cloud Functions
 * All API calls are routed through authenticated Cloud Functions
 * to protect the API key and implement rate limiting
 */

// Initialize Firebase Functions with the app instance
const functions = getFunctions(app);

/**
 * Generates content using Gemini API via Cloud Function
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User prompt
 * @param {Function} setStatus - Status callback
 * @param {number} temperature - Temperature (0.0-1.0)
 * @param {string} model - Gemini model name
 * @returns {Promise<string>} Generated text
 */
export const generateContentSecure = async (
    systemPrompt,
    userPrompt,
    setStatus = () => {},
    temperature = 0.2,
    model = 'gemini-2.0-flash'
) => {
    try {
        setStatus('Calling secure API...');

        const generateQuestions = httpsCallable(functions, 'generateQuestions');
        
        const result = await generateQuestions({
            systemPrompt,
            userPrompt,
            temperature,
            model
        });

        if (!result.data.success) {
            throw new Error(result.data.error || 'Generation failed');
        }

        setStatus('');
        return result.data.textResponse;

    } catch (error) {
        console.error('Secure generation error:', error);
        
        // Handle specific error codes
        if (error.code === 'unauthenticated') {
            throw new Error('Please sign in to generate questions');
        } else if (error.code === 'resource-exhausted') {
            throw new Error('Rate limit exceeded. Please wait a moment.');
        } else if (error.code === 'failed-precondition') {
            throw new Error('Server configuration error. Contact administrator.');
        }
        
        throw new Error(error.message || 'Failed to generate content');
    }
};

/**
 * Generates critique using Gemini API via Cloud Function
 * @param {Object} question - Question object
 * @returns {Promise<Object>} Critique result with score, text, rewrite, changes
 */
export const generateCritiqueSecure = async (question) => {
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

        return {
            score: result.data.score,
            text: result.data.text,
            rewrite: result.data.rewrite,
            changes: result.data.changes
        };

    } catch (error) {
        console.error('Secure critique error:', error);
        
        if (error.code === 'unauthenticated') {
            throw new Error('Please sign in to use AI critique');
        } else if (error.code === 'resource-exhausted') {
            throw new Error('Rate limit exceeded. Please wait a moment.');
        }
        
        throw new Error(error.message || 'Failed to generate critique');
    }
};

/**
 * Migration helper: Checks if user should use secure functions
 * @param {Object} user - Firebase user object
 * @param {string} clientApiKey - Client-side API key (if any)
 * @returns {boolean} True if should use secure functions
 */
export const shouldUseSecureFunctions = (user, clientApiKey) => {
    // If user is authenticated and no client key, use secure functions
    if (user && !clientApiKey) {
        return true;
    }
    
    // If user is authenticated, prefer secure functions
    if (user) {
        return true;
    }
    
    // Fallback to client-side API if not authenticated
    return false;
};
