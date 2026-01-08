import {
  setRateLimitState,
  clearRateLimitState,
  getRateLimitStatus,
} from "../utils/rateLimitState";

/**
 * Helper to handle API calls with retry logic and error handling.
 * @param {string} url
 * @param {object} options
 * @param {function} setStatus
 * @returns {Promise<any>}
 */
const fetchWithRetry = async (url, options, setStatus = () => {}) => {
  // Check global rate limit before making request
  const status = getRateLimitStatus();
  if (status.isLimited) {
    const waitTime = status.remainingSeconds;
    if (waitTime > 0) {
      const msg = `Rate Limited. Waiting ${waitTime}s...`;
      setStatus(msg);
      // Wait out the remaining time locally without hitting the API
      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
    }
    // Clear state after waiting
    clearRateLimitState();
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
          let waitTime = waitMatch
            ? parseFloat(waitMatch[1]) * 1000
            : Math.pow(2, retries) * 5000;

          // Add jitter (random 0-1000ms) to prevent thundering herd
          // eslint-disable-next-line sonarjs/pseudo-random
          waitTime += Math.random() * 1000;

          // Update global rate limit state (for UI display)
          setRateLimitState(true, Date.now() + waitTime);

          if (retries === maxRetries) {
            console.warn("Rate limit exhausted after max retries.");
            throw new Error(
              `Rate Limit Exhausted. Please wait ${Math.ceil(
                waitTime / 1000
              )}s and try again.`
            );
          }

          setStatus(
            `Rate limited. Retrying in ${Math.ceil(waitTime / 1000)}s...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          retries++;
          continue;
        }

        // Handle 403 Leaked Key specifically
        if (response.status === 403) {
          throw new Error(
            "API Key Leaked/Invalid. Please generate a new key at aistudio.google.com"
          );
        }

        // Handle 400 Bad Request (often invalid key)
        if (response.status === 400) {
          throw new Error(
            "Invalid API Key or Request. Please check your key in settings."
          );
        }

        throw new Error(
          errorData.error?.message || `API Error: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Attempt ${retries + 1} failed:`, error);
      if (retries === maxRetries) throw error;

      // For non-429 errors, use standard backoff
      setStatus(
        `Error: ${error.message}. Retrying... (${retries + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      retries++;
    }
  }
};

export const generateContent = async (
  effectiveKey,
  systemPrompt,
  userPrompt,
  setStatus,
  temperature = 0.2,
  model = "gemini-1.5-flash"
) => {
  // Note: If effectiveKey is "", the platform runtime will inject the correct key.
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const url = effectiveKey ? `${baseUrl}?key=${effectiveKey}` : baseUrl;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    tools: [
      {
        googleSearch: {}, // Enable grounding to get real documentation sources
      },
    ],
    generationConfig: {
      temperature: temperature,
      maxOutputTokens: 8192,
    },
  };

  const data = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    setStatus
  );

  const candidate = data.candidates?.[0];
  const textResponse = candidate?.content?.parts?.[0]?.text;
  const finishReason = candidate?.finishReason;

  // Extract grounding metadata for source URLs
  const groundingMetadata = candidate?.groundingMetadata;
  const groundingSources = [];

  // Forbidden domains - even if from Epic's official channels
  const forbiddenInGrounding = [
    "youtube.com",
    "youtu.be",
    "vimeo.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    "forums.",
  ];

  if (groundingMetadata?.groundingChunks) {
    groundingMetadata.groundingChunks.forEach((chunk) => {
      if (chunk.web?.uri && chunk.web?.title) {
        const url = chunk.web.uri.toLowerCase();

        // Skip forbidden sources (including Epic's YouTube)
        if (forbiddenInGrounding.some((domain) => url.includes(domain))) {
          console.log("🚫 Filtered out grounding source:", chunk.web.uri);
          return;
        }

        // Only accept Epic Games documentation
        if (url.includes("dev.epicgames.com/documentation")) {
          groundingSources.push({
            url: chunk.web.uri,
            title: chunk.web.title,
          });
        }
      }
    });
  }

  // Also check searchEntryPoint for additional sources
  if (groundingMetadata?.webSearchQueries) {
    console.log(
      "Grounding searches performed:",
      groundingMetadata.webSearchQueries
    );
  }

  if (!textResponse && finishReason !== "STOP") {
    throw new Error(finishReason || "No content generated");
  }

  // Store grounding sources globally for this request (will be used by generation hook)
  if (groundingSources.length > 0) {
    console.log("📚 Grounding sources found:", groundingSources);
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

  // 2. The Prompt - Balanced and constructive evaluation
  const systemPrompt =
    "Expert UE5 Technical Reviewer. Output valid JSON only. Evaluate objectively and provide constructive feedback.";

  // Construct options string for prompt
  const optionsStr = JSON.stringify(q.options);

  const userPrompt = `Evaluate this UE5 question as a Senior Technical Reviewer for a professional certification exam.
    ${strictnessInstruction}
    
    **SCORING GUIDELINES:** Score based on ACTUAL quality. Use the FULL 0-100 range appropriately:
    - 90-100: Excellent - Clear, accurate, well-written, strong distractors, verifiable source
    - 80-89: Good - Minor issues but professionally acceptable
    - 70-79: Acceptable - Needs polish but fundamentally sound
    - 60-69: Needs Work - Multiple issues requiring revision
    - Below 60: Poor - Major problems with accuracy, clarity, or structure
    
    **EVALUATION CRITERIA:**
    1. Technical Accuracy: Is the answer factually correct for UE5?
    2. Clarity: Is the question clear and unambiguous?
    3. Distractors: Are wrong answers plausible but definitively incorrect?
    4. Professional Tone: Is it suitable for certification/interview use?
    5. Source Quality: Can the answer be verified from official documentation?
    
    CRITICAL: You MUST provide TWO scores in your response:
    1. originalScore: Score for the question AS PROVIDED (the current version)
    2. improvedScore: Score for your IMPROVED rewrite (should be higher)
    
    MANDATORY OUTPUT FORMAT: Return ONLY a raw JSON object (no markdown formatting) with this EXACT structure:
    {
        "originalScore": 75,  // REQUIRED: Score (0-100) for ORIGINAL question
        "critique": "string", // Detailed feedback with specific suggestions
        "rewrite": {
            "question": "string", // Improved question text
            "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
            "correct": "string" // Correct letter (A, B, C, or D)
        },
        "improvedScore": 92,  // REQUIRED: Score (0-100) for IMPROVED version (must be > originalScore)
        "changes": "string" // Brief explanation of what was changed and why
    }
    
    IMPORTANT: Both originalScore AND improvedScore are REQUIRED fields. Do not omit either one.

    Question: ${q.question}
    Options: ${optionsStr}
    Correct: ${q.correct}`;

  // 3. API Call
  // 3. API Call
  const baseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
  const url = apiKey ? `${baseUrl}?key=${apiKey}` : baseUrl;

  const data = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // DEBUG: Log raw AI response for score investigation
  console.log("[Critique DEBUG] Raw AI response:", rawText.substring(0, 500));

  // 4. Parse JSON
  try {
    // Clean up markdown code blocks if present (just in case)
    const cleanJson = rawText.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleanJson);

    const finalScore =
      typeof result.score === "number"
        ? result.score
        : parseInt(result.score || 0);
    console.log(
      "[Critique DEBUG] JSON parsed successfully. Score:",
      finalScore
    );
    console.log(
      "[Critique DEBUG] Scores - Original:",
      result.originalScore || result.score,
      "| Improved:",
      result.improvedScore
    );

    return {
      score: result.originalScore || result.score || finalScore, // Handle both new and legacy formats
      text: result.critique || result.text,
      rewrite: result.rewrite,
      improvedScore: result.improvedScore, // New: score for the improved version
      changes: result.changes,
    };
  } catch (e) {
    console.error("Failed to parse critique JSON:", e, rawText);
    // Fallback to multiple patterns for score extraction if JSON fails
    let score = null;

    // Try multiple patterns to extract score
    const patterns = [
      /SCORE:\s*(\d+)/i, // SCORE: 75
      /"score"\s*:\s*(\d+)/i, // "score": 75
      /\bscore\s*[:\-=]\s*(\d+)/i, // score: 75, score = 75
      /(\d+)\s*\/\s*100/i, // 75/100
      /^(\d{1,3})(?!\d)/m, // Just a number at start of line (0-999)
    ];

    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match) {
        const parsed = parseInt(match[1]);
        if (parsed >= 0 && parsed <= 100) {
          score = parsed;
          console.log(`Extracted score ${score} using pattern: ${pattern}`);
          break;
        }
      }
    }

    if (score === null) {
      console.warn("Could not extract score from critique response");
      score = 0; // Default to 0 to force attention
    }

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
  const systemPrompt = `Role: Senior Epic Games Tech Writer. Task: Rewrite the question to fix errors found in the critique.
    Format: Pipe-delimited table, NO headers. Cols: |ID|Discipline|Type|Difficulty|Question|OptionA|OptionB|OptionC|OptionD|CorrectLetter|SourceURL|Excerpt|QualityScore|
    Critique to Address: ${critiqueText}
    Original Context: Discipline: ${q.discipline}, Type: ${q.type}.
    Rules: 
    1. Fix the SPECIFIC issues identified in the critique. 
    2. Keep UE5 accuracy. 
    3. Maintain strict formatting. 
    4. QualityScore MUST reflect the improvement (Target: 90+).
    5. CONCISENESS IS KING. Max 2 sentences. Remove fluff.`;

  const userPrompt = `Rewrite this question:\n${
    q.question
  }\nOptions: ${JSON.stringify(q.options)}\nCorrect: ${q.correct}`;

  const baseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
  const url = apiKey ? `${baseUrl}?key=${apiKey}` : baseUrl;

  const data = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.5, maxOutputTokens: 8192 }, // Balanced temp for rewriting
    }),
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

/**
 * Classifies a question into one of the 7 disciplines.
 * @param {string} apiKey
 * @param {string} questionText
 * @returns {Promise<string>} The discipline name
 */
export const classifyQuestionDiscipline = async (apiKey, questionText) => {
  const systemPrompt = `You are an expert UE5 classifier.
  Classify the following question into exactly ONE of these disciplines:
  - Worldbuilding
  - Game Dev
  - Look Dev
  - Tech Art
  - VFX
  - Animation
  - Programming

  Return ONLY the discipline name.`;

  const userPrompt = `Classify this question: "${questionText}"`;

  const baseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
  const url = apiKey ? `${baseUrl}?key=${apiKey}` : baseUrl;

  const data = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.1, maxOutputTokens: 20 },
    }),
  });

  return (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
};

/**
 * Generates 3-5 relevant tags for a question.
 * @param {string} apiKey
 * @param {string} questionText
 * @returns {Promise<string[]>} Array of tags
 */
export const generateTagsForQuestion = async (apiKey, questionText) => {
  const systemPrompt = `You are an expert UE5 tagger.
    Generate 3-5 relevant technical tags for the provided question.
    - Tags should be specific (e.g., "Blueprints", "Lumen", "Niagara").
    - Return ONLY a valid JSON array of strings.
    - Example: ["Blueprints", "Actors", "Level Design"]`;

  const userPrompt = `Tags for: "${questionText}"`;

  const baseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
  const url = apiKey ? `${baseUrl}?key=${apiKey}` : baseUrl;

  const data = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 100,
        responseMimeType: "application/json",
      },
    }),
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse tags:", text, e);
    return [];
  }
};

/**
 * Lists available models for the given API key.
 * @param {string} apiKey
 * @returns {Promise<string[]>} List of model names
 */
export const listModels = async (apiKey) => {
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
  const url = apiKey ? `${baseUrl}?key=${apiKey}` : baseUrl;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`List Models Failed: ${response.status}`);
    const data = await response.json();
    return data.models?.map((m) => m.name.replace("models/", "")) || [];
  } catch (error) {
    console.error("Failed to list models:", error);
    return [];
  }
};
