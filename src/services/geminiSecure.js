/**
 * Secure Gemini Service Wrapper
 * 
 * This module provides a secure interface for calling Gemini AI.
 * It automatically uses Cloud Functions when the user is authenticated,
 * otherwise falls back to direct API calls.
 */

import { isUserAuthenticated, generateContentViaCloudFunction, generateCritiqueViaCloudFunction } from './cloudFunctions.js';
import { generateContent as generateContentDirect, generateCritique as generateCritiqueDirect } from './gemini.js';

/**
 * Secure generate content wrapper
 * Automatically chooses the most secure method available
 */
export const generateContentSecure = async (effectiveKey, systemPrompt, userPrompt, setStatus, temperature = 0.2, model = 'gemini-2.0-flash') => {
    // Try Cloud Functions first (most secure)
    if (isUserAuthenticated()) {
        try {
            console.log('🔒 Using secure Cloud Function for generation');
            return await generateContentViaCloudFunction(systemPrompt, userPrompt, setStatus, temperature, model);
        } catch (error) {
            console.warn('Cloud Function failed, falling back to direct API:', error.message);
        }
    } else {
        console.log('❓ User not authenticated - using direct API');
    }

    // Fallback to direct API
    return await generateContentDirect(effectiveKey, systemPrompt, userPrompt, setStatus, temperature, model);
};

/**
 * Secure critique wrapper
 * Automatically chooses the most secure method available
 */
export const generateCritiqueSecure = async (apiKey, question) => {
    // Try Cloud Functions first (most secure)
    if (isUserAuthenticated()) {
        try {
            console.log('🔒 [CritiqueSecure DEBUG] Using Cloud Function for critique');
            const result = await generateCritiqueViaCloudFunction(question);
            console.log('🔒 [CritiqueSecure DEBUG] Cloud Function returned score:', result.score);
            return result;
        } catch (error) {
            console.warn('Cloud Function failed, falling back to direct API:', error.message);
        }
    } else {
        console.log('❓ [CritiqueSecure DEBUG] User not authenticated - using direct API for critique');
    }

    // Fallback to direct API
    console.log('📡 [CritiqueSecure DEBUG] Calling direct API for critique');
    const result = await generateCritiqueDirect(apiKey, question);
    console.log('📡 [CritiqueSecure DEBUG] Direct API returned score:', result.score);
    return result;
};


// Re-export other functions from gemini.js for backward compatibility
export { rewriteQuestion, listModels } from './gemini.js';
