// Global rate limit state
let rateLimitState = {
    isLimited: false,
    retryAfter: 0
};

/**
 * Helper to handle API calls with retry logic and error handling.
 * @param {string} url 
 * @param {object} options 
 * @param {function} setStatus 
 * @returns {Promise<any>}
 */
const fetchWithRetry = async (url, options, setStatus = () => { }) => {
    // Check global rate limit before making request
    if (rateLimitState.isLimited) {
        const now = Date.now();
        if (now < rateLimitState.retryAfter) {
            const waitTime = Math.ceil((rateLimitState.retryAfter - now) / 1000);
            const msg = `Global Rate Limit Active. Waiting ${waitTime}s...`;
            setStatus(msg);
            // Wait out the remaining time locally without hitting the API
            await new Promise(resolve => setTimeout(resolve, rateLimitState.retryAfter - now));
        }
        // Reset state after waiting
        rateLimitState.isLimited = false;
        rateLimitState.retryAfter = 0;
    }

    let retries = 0;
    const maxRetries = 5;

    while (retries <= maxRetries) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Handle 429 Rate Limit specifically
                if (response.status === 429) {
                    const message = errorData.error?.message || "Rate limit exceeded";
                    const waitMatch = message.match(/retry in (\d+(\.\d+)?)s/);

                    // Base wait time: Use parsed time OR exponential backoff (5s, 10s, 20s...)
                    let waitTime = waitMatch ? parseFloat(waitMatch[1]) * 1000 : Math.pow(2, retries) * 5000;

                    // Add jitter (random 0-1000ms) to prevent thundering herd
                    waitTime += Math.random() * 1000;

                    // Update global rate limit state
                    rateLimitState.isLimited = true;
                    rateLimitState.retryAfter = Date.now() + waitTime;

                    if (retries === maxRetries) {
                        console.warn("Rate limit exhausted after max retries.");
                        throw new Error(`Rate Limit Exhausted. Please wait ${Math.ceil(waitTime / 1000)}s and try again.`);
                    }

                    setStatus(`Rate limited. Retrying in ${Math.ceil(waitTime / 1000)}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retries++;
                    continue;
                }

                // Handle 403 Leaked Key specifically
                if (response.status === 403) {
                    throw new Error("API Key Leaked/Invalid. Please generate a new key at aistudio.google.com");
                }

                // Handle 400 Bad Request (often invalid key)
                if (response.status === 400) {
                    throw new Error("Invalid API Key or Request. Please check your key in settings.");
                }

                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`Attempt ${retries + 1} failed:`, error);
            if (retries === maxRetries) throw error;

            // For non-429 errors, use standard backoff
            setStatus(`Error: ${error.message}. Retrying... (${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            retries++;
        }
    }
};

export const generateContent = async (effectiveKey, systemPrompt, userPrompt, setStatus, temperature = 0.2, model = 'gemini-2.0-flash') => {
    // Note: If effectiveKey is "", the platform runtime will inject the correct key.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        tools: [{
            googleSearch: {} // Enable grounding to get real documentation sources
        }],
        generationConfig: {
            temperature: temperature,
            maxOutputTokens: 8192
        }
    };

    const data = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }, setStatus);

    const candidate = data.candidates?.[0];
    const textResponse = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;

    // Extract grounding metadata for source URLs
    const groundingMetadata = candidate?.groundingMetadata;
    const groundingSources = [];

    // Forbidden domains - even if from Epic's official channels
    const forbiddenInGrounding = ['youtube.com', 'youtu.be', 'vimeo.com', 'twitter.com', 'x.com', 'reddit.com', 'forums.'];

    if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach(chunk => {
            if (chunk.web?.uri && chunk.web?.title) {
                const url = chunk.web.uri.toLowerCase();

                // Skip forbidden sources (including Epic's YouTube)
                if (forbiddenInGrounding.some(domain => url.includes(domain))) {
                    console.log('🚫 Filtered out grounding source:', chunk.web.uri);
                    return;
                }

                // Only accept Epic Games documentation
                if (url.includes('dev.epicgames.com/documentation')) {
                    groundingSources.push({
                        url: chunk.web.uri,
                        title: chunk.web.title
                    });
                }
            }
        });
    }

    // Also check searchEntryPoint for additional sources
    if (groundingMetadata?.webSearchQueries) {
        console.log('Grounding searches performed:', groundingMetadata.webSearchQueries);
    }

    if (!textResponse && finishReason !== 'STOP') {
        throw new Error(finishReason || 'No content generated');
    }

    // Store grounding sources globally for this request (will be used by generation hook)
    if (groundingSources.length > 0) {
        console.log('📚 Grounding sources found:', groundingSources);
        window.__lastGroundingSources = groundingSources;
    }

    return textResponse || "";
};

/**
 * Calls Gemini to critique a specific question.
 * Dependency-free, pure JavaScript.
 * @param {string} apiKey - Your Gemini API Key
 * @param {object} q - The question object { question, options, correct, modeLabel }
 * @returns {Promise<{score: number, text: string}>}
 */
export const generateCritique = async (apiKey, q) => {
    // 1. Context-Aware Instructions
    let strictnessInstruction = "";
    if (q.modeLabel === "Strict") {
        strictnessInstruction = `
    CONTEXT: The user requested a STRICT, FOUNDATIONAL question. 
    - If this is obscure, tricky, or niche: DEDUCT 20 POINTS. 
    - If it has multiple valid workflows (ambiguous) without context: DEDUCT 30 POINTS.
    - Must be textbook quality.`;
    } else if (q.modeLabel === "Wild") {
        strictnessInstruction = `
    CONTEXT: The user requested a WILD, EDGE-CASE question. 
    - If this is basic or obvious ("Documentation 101"): DEDUCT 20 POINTS.
    - Must be challenging and specific.`;
    }

    // 2. The Prompt
    const systemPrompt = "UE5 Expert Critic. Output valid JSON only. YOU MUST BE EXTREMELY HARSH AND CRITICAL.";
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

    **STRICT Scoring Criteria (APPLY RUTHLESSLY):**
    - 95-100: PRACTICALLY IMPOSSIBLE. Near-perfect question. Concise (single sentence), zero ambiguity, expert-level difficulty, perfect distractors. Reserve for truly exceptional questions only.
    - 85-94: EXCELLENT. Very good but has minor improvements possible (slight wordiness, one weak distractor).
    - 70-84: GOOD WITH FLAWS. Competent but has clear issues (wordy, hints in stem, mediocre distractors, too basic).
    - 50-69: MEDIOCRE. Multiple problems (ambiguous, confusing structure, weak options, trivial topic).
    - 30-49: POOR. Serious issues (factual concerns, very weak question, bad distractors).
    - 0-29: FAIL. Fundamentally broken (wrong answer key, outdated info, nonsensical).

    **DEDUCT POINTS FOR (cumulative):**
    - **TOO EASY/TRIVIAL**: Basic "What is X?" questions START at 60 max. Deduct 20 points.
    - **WORDINESS**: More than 20 words in question = -10 points. More than 30 words = -20 points.
    - **HINTS IN STEM**: Any hint toward answer = -15 points per hint.
    - **WEAK DISTRACTORS**: Obviously wrong options = -10 points per weak distractor.
    - **AMBIGUITY**: Multiple valid interpretations = -25 points.
    - **LACK OF SOURCE**: No clear source or genericdocumentation = -15 points.
    - **POOR GRAMMAR**: Any grammar/spelling issues = -10 points.

    **DEFAULT ASSUMPTION: Start at 75 and deduct points. Only award 90+ if truly exceptional.**

    **CRITICAL RULE FOR TRUE/FALSE:** 
    - If original is T/F, rewrite MUST remain T/F. 
    - T/F should be single, unambiguous assertion.

    Question: ${q.question}
    Options: ${JSON.stringify(q.options)}
    Correct: ${q.correct}`;

    // 3. API Call
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const data = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" }
        })
    });

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 4. Parse JSON
    try {
        // Clean up markdown code blocks if present (just in case)
        const cleanJson = rawText.replace(/```json\n?|\n?```/g, '').trim();
        const result = JSON.parse(cleanJson);

        return {
            score: result.score,
            text: result.critique,
            rewrite: result.rewrite,
            changes: result.changes
        };
    } catch (e) {
        console.error("Failed to parse critique JSON:", e, rawText);
        // Fallback to simple text parsing if JSON fails
        const scoreMatch = rawText.match(/SCORE:\s*(\d+)/i);
        const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
        return { score, text: rawText, rewrite: null, changes: null };
    }
};

/**
 * Uses the critique feedback to automatically rewrite the question.
 * @param {string} apiKey - Your Gemini API Key
 * @param {object} q - The original question object
 * @param {string} critiqueText - The feedback text from generateCritique
 * @returns {Promise<string>} - The raw text of the rewritten question table (needs parsing)
 */
export const rewriteQuestion = async (apiKey, q, critiqueText) => {
    const sys = `Role: Senior Epic Games Tech Writer. Task: Rewrite the question to fix errors found in the critique.
    Format: Pipe-delimited table, NO headers. Cols: |ID|Discipline|Type|Difficulty|Question|OptionA|OptionB|OptionC|OptionD|CorrectLetter|SourceURL|Excerpt|QualityScore|
    Critique to Address: ${critiqueText}
    Original Context: Discipline: ${q.discipline}, Type: ${q.type}.
    Rules: 
    1. Fix the issues identified in the critique. 
    2. Keep UE5 accuracy. 
    3. Maintain strict formatting. 
    4. QualityScore (0-100) should reflect the improved quality.
    5. CONCISENESS IS KING. Max 2 sentences. Remove fluff.`;

    const userPrompt = `Rewrite this question:\n${q.question}\nOptions: ${JSON.stringify(q.options)}\nCorrect: ${q.correct}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    const data = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.5, maxOutputTokens: 8192 } // Balanced temp for rewriting
        })
    });

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

/**
 * Lists available models for the given API key.
 * @param {string} apiKey 
 * @returns {Promise<string[]>} List of model names
 */
export const listModels = async (apiKey) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`List Models Failed: ${response.status}`);
        const data = await response.json();
        return data.models?.map(m => m.name.replace('models/', '')) || [];
    } catch (error) {
        console.error("Failed to list models:", error);
        return [];
    }
};
