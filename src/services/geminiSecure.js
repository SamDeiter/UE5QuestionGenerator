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
            console.log('🔒 Using secure Cloud Function for critique');
            return await generateCritiqueViaCloudFunction(question);
        } catch (error) {
            console.warn('Critique Cloud Function failed, falling back to direct API:', error.message);
        }
    } else {
        console.log('❓ User not authenticated - using direct API for critique');
    }

    // Fallback to direct API
    return await generateCritiqueDirect(apiKey, question);
};

// Re-export other functions from gemini.js for backward compatibility
export { rewriteQuestion, listModels } from './gemini.js';
