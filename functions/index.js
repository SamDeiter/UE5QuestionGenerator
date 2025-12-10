const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Load environment variables from .env file (for local development)
require('dotenv').config();

admin.initializeApp();

/**
 * Cloud Function: generateQuestions
 * Securely calls the Gemini API with server-side API key
 * 
 * This function:
 * 1. Validates the user is authenticated
 * 2. Implements rate limiting per user
 * 3. Calls Gemini API with server-side key
 * 4. Returns generated content
 */
exports.generateQuestions = functions.https.onCall(async (data, context) => {
    // 1. Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to generate questions.'
        );
    }

    const userId = context.auth.uid;
    const { systemPrompt, userPrompt, temperature = 0.2, model = 'gemini-2.0-flash' } = data;

    // 2. Input validation
    if (!systemPrompt || !userPrompt) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'systemPrompt and userPrompt are required.'
        );
    }

    // 3. Rate limiting check
    const rateLimitCheck = await checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            `Rate limit exceeded. ${rateLimitCheck.message}`
        );
    }

    try {
        // 4. Get API key from environment variable
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Gemini API key not configured. Set GEMINI_API_KEY environment variable.'
            );
        }

        // 5. Call Gemini API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [{
                googleSearch: {} // Enable grounding
            }],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: 8192
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new functions.https.HttpsError(
                'internal',
                `Gemini API error: ${errorData.error?.message || response.statusText}`
            );
        }

        const responseData = await response.json();
        
        // 6. Log usage for rate limiting
        await logApiUsage(userId, {
            model,
            tokensUsed: responseData.usageMetadata || {},
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 7. Return response
        return {
            success: true,
            data: responseData,
            textResponse: responseData.candidates?.[0]?.content?.parts?.[0]?.text || '',
            groundingSources: extractGroundingSources(responseData)
        };

    } catch (error) {
        console.error('Error in generateQuestions:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Failed to generate questions: ${error.message}`
        );
    }
});

/**
 * Cloud Function: generateCritique
 * Securely calls Gemini API for question critique
 */
exports.generateCritique = functions.https.onCall(async (data, context) => {
    // Authentication check
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated.'
        );
    }

    const userId = context.auth.uid;
    const { question, options, correct, modeLabel } = data;

    // Input validation
    if (!question || !options || !correct) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'question, options, and correct are required.'
        );
    }

    // Rate limiting
    const rateLimitCheck = await checkRateLimit(userId, 'critique');
    if (!rateLimitCheck.allowed) {
        throw new functions.https.HttpsError(
            'resource-exhausted',
            `Rate limit exceeded. ${rateLimitCheck.message}`
        );
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'Gemini API key not configured.'
            );
        }

        // Build critique prompt (similar to client-side logic)
        const systemPrompt = "UE5 Expert Critic. Output valid JSON only. YOU MUST BE EXTREMELY HARSH AND CRITICAL.";
        
        let strictnessInstruction = "";
        if (modeLabel === "Strict") {
            strictnessInstruction = `
            CONTEXT: The user requested a STRICT, FOUNDATIONAL question. 
            - If this is obscure, tricky, or niche: DEDUCT 20 POINTS. 
            - If it has multiple valid workflows (ambiguous) without context: DEDUCT 30 POINTS.
            - Must be textbook quality.`;
        } else if (modeLabel === "Wild") {
            strictnessInstruction = `
            CONTEXT: The user requested a WILD, EDGE-CASE question. 
            - If this is basic or obvious ("Documentation 101"): DEDUCT 20 POINTS.
            - Must be challenging and specific.`;
        }

        const userPrompt = `Critique this UE5 question as an EXTREMELY HARSH, PEDANTIC Senior Technical Editor.
        ${strictnessInstruction}
        
        **CRITICAL MINDSET:** You are a perfectionist who RARELY gives scores above 80. Most questions have flaws.
        
        MANDATORY OUTPUT FORMAT: Return ONLY a raw JSON object (no markdown formatting) with this structure:
        {
            "score": number, // 0-100
            "critique": "string", // Detailed critique text
            "rewrite": {
                "question": "string", // Improved question text
                "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
                "correct": "string" // Correct letter (A, B, C, or D)
            },
            "changes": "string" // Brief explanation of what was changed and why
        }

        Question: ${question}
        Options: ${JSON.stringify(options)}
        Correct: ${correct}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { 
                    temperature: 0.2, 
                    maxOutputTokens: 8192, 
                    responseMimeType: "application/json" 
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const responseData = await response.json();
        const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Parse JSON response
        let result;
        try {
            const cleanJson = rawText.replace(/```json\n?|\n?```/g, '').trim();
            result = JSON.parse(cleanJson);
        } catch (e) {
            // Fallback: extract score if JSON parsing fails
            const scoreMatch = rawText.match(/SCORE:\s*(\d+)/i) || rawText.match(/"score"\s*:\s*(\d+)/i);
            result = {
                score: scoreMatch ? parseInt(scoreMatch[1]) : null,
                text: rawText,
                rewrite: null,
                changes: null
            };
        }

        // Log usage
        await logApiUsage(userId, {
            model: 'gemini-2.0-flash-exp',
            type: 'critique',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
            success: true,
            score: result.score,
            text: result.critique || result.text,
            rewrite: result.rewrite,
            changes: result.changes
        };

    } catch (error) {
        console.error('Error in generateCritique:', error);
        throw new functions.https.HttpsError(
            'internal',
            `Failed to generate critique: ${error.message}`
        );
    }
});

/**
 * Rate limiting helper
 * Checks if user has exceeded rate limits
 */
async function checkRateLimit(userId, type = 'generation') {
    const db = admin.firestore();
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    // Get user's recent API calls
    const recentCalls = await db.collection('apiUsage')
        .where('userId', '==', userId)
        .where('timestamp', '>', new Date(oneMinuteAgo))
        .get();

    const callCount = recentCalls.size;

    // Rate limits (adjust as needed)
    const RATE_LIMITS = {
        generation: 10, // 10 requests per minute
        critique: 20    // 20 critiques per minute
    };

    const limit = RATE_LIMITS[type] || 10;

    if (callCount >= limit) {
        return {
            allowed: false,
            message: `You can make ${limit} ${type} requests per minute. Please wait.`
        };
    }

    return { allowed: true };
}

/**
 * Log API usage for rate limiting and analytics
 */
async function logApiUsage(userId, data) {
    const db = admin.firestore();
    await db.collection('apiUsage').add({
        userId,
        ...data,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Extract grounding sources from Gemini response
 */
function extractGroundingSources(responseData) {
    const groundingMetadata = responseData.candidates?.[0]?.groundingMetadata;
    const sources = [];

    if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach(chunk => {
            if (chunk.web?.uri && chunk.web?.title) {
                const url = chunk.web.uri.toLowerCase();
                
                // Only accept Epic Games documentation
                if (url.includes('dev.epicgames.com/documentation')) {
                    sources.push({
                        url: chunk.web.uri,
                        title: chunk.web.title
                    });
                }
            }
        });
    }

    return sources;
}
