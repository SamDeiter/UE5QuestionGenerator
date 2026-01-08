/**
 * Portkey.ai Service Adapter
 *
 * This module provides an adapter layer for using Vertex AI models through Portkey.ai.
 * It translates Gemini-style API calls to Portkey's OpenAI-compatible format.
 *
 * IMPORTANT: This is an ADDITIONAL service option alongside existing methods:
 * - Direct Gemini API calls
 * - Firebase Cloud Functions
 * - Portkey Gateway (this file)
 */

import Portkey from "portkey-ai";
import { logger } from "../utils/logger";

/**
 * Initialize Portkey client
 * @returns {Portkey} Configured Portkey client
 */
const getPortkeyClient = () => {
  const apiKey = import.meta.env.VITE_PORTKEY_API_KEY;
  const virtualKey = import.meta.env.VITE_PORTKEY_VIRTUAL_KEY;

  if (!apiKey) {
    throw new Error("VITE_PORTKEY_API_KEY not configured");
  }

  return new Portkey({
    apiKey,
    virtualKey, // Optional: for Vertex AI authentication via Portkey Virtual Keys
  });
};

/**
 * Convert Gemini-style system/user prompts to OpenAI messages format
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Array} OpenAI-compatible messages array
 */
const convertToMessages = (systemPrompt, userPrompt) => {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: userPrompt,
  });

  return messages;
};

/**
 * Generate content using Portkey's Vertex AI integration
 * @param {string} effectiveKey - Not used for Portkey (uses env vars)
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {function} setStatus - Status callback
 * @param {number} temperature
 * @param {string} model - Model name (will be prefixed with @VERTEX_PROVIDER/)
 * @returns {Promise<string>} Generated text
 */
export const generateContent = async (
  effectiveKey,
  systemPrompt,
  userPrompt,
  setStatus = () => {},
  temperature = 0.2,
  model = "gemini-1.5-flash"
) => {
  try {
    setStatus("Connecting to Portkey...");

    const portkey = getPortkeyClient();
    const messages = convertToMessages(systemPrompt, userPrompt);

    // Portkey uses @VERTEX_PROVIDER/ prefix for Vertex AI models
    const portkeyModel = model.startsWith("@VERTEX_PROVIDER/")
      ? model
      : `@VERTEX_PROVIDER/${model}`;

    setStatus("Generating content via Portkey...");

    const completion = await portkey.chat.completions.create({
      messages,
      model: portkeyModel,
      temperature,
      max_tokens: 8192,
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated from Portkey");
    }

    setStatus("Content generated successfully");
    return content;
  } catch (error) {
    logger.error("Portkey generation error:", error);
    throw new Error(`Portkey generation failed: ${error.message}`);
  }
};

/**
 * Generate critique using Portkey
 * @param {string} apiKey - Not used for Portkey
 * @param {object} question - Question object
 * @param {string} model - Model to use
 * @returns {Promise<object>} Critique result
 */
export const generateCritique = async (
  apiKey,
  question,
  model = "gemini-1.5-flash"
) => {
  const systemPrompt =
    "Expert UE5 Technical Reviewer. Output valid JSON only. Evaluate objectively and provide constructive feedback.";

  let strictnessInstruction = "";
  if (question.modeLabel === "Strict") {
    strictnessInstruction = `
    CONTEXT: The user requested a STRICT, FOUNDATIONAL question. 
    - If this is obscure, tricky, or niche: DEDUCT 20 POINTS. 
    - If it has multiple valid workflows (ambiguous) without context: DEDUCT 30 POINTS.
    - Must be textbook quality.`;
  } else if (question.modeLabel === "Wild") {
    strictnessInstruction = `
    CONTEXT: The user requested a WILD, EDGE-CASE question. 
    - If this is basic or obvious ("Documentation 101"): DEDUCT 20 POINTS.
    - Must be challenging and specific.`;
  }

  const optionsStr = JSON.stringify(question.options);

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
    6. Formatting: Use **markdown bold** for key technical terms (e.g., **NavMesh**, **Lumen**, **Blueprint**)
    
    CRITICAL: You MUST provide TWO scores in your response:
    1. originalScore: Score for the question AS PROVIDED (the current version)
    2. improvedScore: Score for your IMPROVED rewrite (should be higher)
    
    MANDATORY OUTPUT FORMAT: Return ONLY a raw JSON object (no markdown formatting) with this EXACT structure:
    {
        "originalScore": 75,  // REQUIRED: Score (0-100) for ORIGINAL question
        "critique": "string", // Detailed feedback with specific suggestions
        "rewrite": {
            "question": "string", // Improved question text with **bold** markdown for key technical terms
            "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
            "correct": "string" // Correct letter (A, B, C, or D)
        },
        "improvedScore": 92,  // REQUIRED: Score (0-100) for IMPROVED version (must be > originalScore)
        "changes": "string" // Brief explanation of what was changed and why
    }
    
    IMPORTANT: Both originalScore AND improvedScore are REQUIRED fields. Do not omit either one.

    Question: ${question.question}
    Options: ${optionsStr}
    Correct: ${question.correct}`;

  try {
    const portkey = getPortkeyClient();
    const messages = convertToMessages(systemPrompt, userPrompt);

    const portkeyModel = model.startsWith("@VERTEX_PROVIDER/")
      ? model
      : `@VERTEX_PROVIDER/${model}`;

    const completion = await portkey.chat.completions.create({
      messages,
      model: portkeyModel,
      temperature: 0.2,
      max_tokens: 8192,
      response_format: { type: "json_object" }, // Request JSON response
    });

    const rawText = completion.choices?.[0]?.message?.content || "";

    logger.log(
      "[Portkey Critique DEBUG] Raw response:",
      rawText.substring(0, 500)
    );

    // Parse JSON response
    const cleanJson = rawText.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleanJson);

    logger.log(
      "[Portkey Critique DEBUG] Scores - Original:",
      result.originalScore,
      "| Improved:",
      result.improvedScore
    );

    return {
      score: result.originalScore || result.score || 0,
      text: result.critique || result.text,
      rewrite: result.rewrite,
      improvedScore: result.improvedScore,
      changes: result.changes,
    };
  } catch (error) {
    logger.error("Portkey critique error:", error);
    throw new Error(`Portkey critique failed: ${error.message}`);
  }
};

/**
 * Rewrite question using Portkey
 * @param {string} apiKey - Not used for Portkey
 * @param {object} question - Original question
 * @param {string} critiqueText - Critique feedback
 * @returns {Promise<string>} Rewritten question
 */
export const rewriteQuestion = async (apiKey, question, critiqueText) => {
  const systemPrompt = `Role: Senior Epic Games Tech Writer. Task: Rewrite the question to fix errors found in the critique.
    Format: Pipe-delimited table, NO headers. Cols: |ID|Discipline|Type|Difficulty|Question|OptionA|OptionB|OptionC|OptionD|CorrectLetter|SourceURL|Excerpt|QualityScore|
    Critique to Address: ${critiqueText}
    Original Context: Discipline: ${question.discipline}, Type: ${question.type}.
    Rules: 
    1. Fix the SPECIFIC issues identified in the critique. 
    2. Keep UE5 accuracy. 
    3. Maintain strict formatting. 
    4. QualityScore MUST reflect the improvement (Target: 90+).
    5. CONCISENESS IS KING. Max 2 sentences. Remove fluff.`;

  const userPrompt = `Rewrite this question:\n${
    question.question
  }\nOptions: ${JSON.stringify(question.options)}\nCorrect: ${
    question.correct
  }`;

  try {
    const portkey = getPortkeyClient();
    const messages = convertToMessages(systemPrompt, userPrompt);

    const completion = await portkey.chat.completions.create({
      messages,
      model: "@VERTEX_PROVIDER/gemini-1.5-flash",
      temperature: 0.5,
      max_tokens: 8192,
    });

    return completion.choices?.[0]?.message?.content || "";
  } catch (error) {
    logger.error("Portkey rewrite error:", error);
    throw new Error(`Portkey rewrite failed: ${error.message}`);
  }
};

/**
 * Classify question discipline using Portkey
 * @param {string} apiKey - Not used for Portkey
 * @param {string} questionText
 * @returns {Promise<string>} Discipline name
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

  try {
    const portkey = getPortkeyClient();
    const messages = convertToMessages(systemPrompt, userPrompt);

    const completion = await portkey.chat.completions.create({
      messages,
      model: "@VERTEX_PROVIDER/gemini-1.5-flash",
      temperature: 0.1,
      max_tokens: 20,
    });

    return (completion.choices?.[0]?.message?.content || "").trim();
  } catch (error) {
    logger.error("Portkey classification error:", error);
    throw new Error(`Portkey classification failed: ${error.message}`);
  }
};

/**
 * Generate tags using Portkey
 * @param {string} apiKey - Not used for Portkey
 * @param {string} questionText
 * @returns {Promise<string[]>} Array of tags
 */
export const generateTagsForQuestion = async (apiKey, questionText) => {
  const systemPrompt = `You are an expert UE5 tagger.
    Generate EXACTLY 3-5 relevant technical tags for the provided question.
    - Tags MUST be specific UE5 features/concepts (e.g., "Blueprints", "Lumen", "Niagara")
    - Return ONLY a valid JSON array of strings with AT LEAST 3 tags
    - Example: ["Blueprints", "Actors", "Level Design"]
    - CRITICAL: Always return minimum 3 tags, maximum 5 tags`;

  const userPrompt = `Tags for: "${questionText}"`;

  try {
    const portkey = getPortkeyClient();
    const messages = convertToMessages(systemPrompt, userPrompt);

    const completion = await portkey.chat.completions.create({
      messages,
      model: "@VERTEX_PROVIDER/gemini-1.5-flash",
      temperature: 0.3,
      max_tokens: 100,
      response_format: { type: "json_object" },
    });

    const text = completion.choices?.[0]?.message?.content || "[]";
    return JSON.parse(text);
  } catch (error) {
    logger.error("Portkey tags error:", error);
    return [];
  }
};
