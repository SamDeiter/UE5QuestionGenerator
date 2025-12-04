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
        tools: [{ google_search: {} }],
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

    if (!textResponse && finishReason !== 'STOP') {
        throw new Error(finishReason || 'No content generated');
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
    const systemPrompt = "UE5 Expert Critic.";
    const userPrompt = `Critique this UE5 question as a HARSH, PEDANTIC Senior Technical Editor.
    ${strictnessInstruction}
    
    Your goal is to find flaws. Do not give high scores easily. Default to 70-80 if it's "just okay".
    
    MANDATORY OUTPUT FORMAT: Start with "SCORE: <0-100>" on the first line. Then provide the critique.

    Scoring Criteria:
    - 90-100: FLAWLESS. Concise. No hints in stem. Perfect accuracy.
    - 70-89: GOOD, BUT FLAWED. Wordy? Gives away answer? Weak distractors?
    - 50-69: MEDIOCRE. Ambiguous, confusing, or poorly structured.
    - 0-49: FAIL. Factual errors, outdated terms (UE4), or wrong answer key.

    Be extremely critical of:
    - **WORDINESS:** Paragraphs = Score 60 Max.
    - **HINTS:** Hints in stem = -15 points.
    - **MULTIPLE WORKFLOWS:** Ambiguous "How to" = FAIL.

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
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 } // Low temp for consistent strictness
        })
    });

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 4. Parse Score and Text
    const scoreMatch = rawText.match(/^SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const text = scoreMatch ? rawText.replace(/^SCORE:\s*\d+[\s\n]*/i, '').trim() : rawText.trim();

    return { score, text };
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
