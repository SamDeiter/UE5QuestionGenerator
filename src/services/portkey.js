/**
 * Portkey.ai Service Adapter — Secure Cloud Function Proxy
 *
 * This module routes Portkey AI calls through a Firebase Cloud Function,
 * keeping the Portkey API key server-side. The client never touches the key.
 *
 * Service Selection Priority:
 * 1. Firebase Cloud Functions (when authenticated) — DEFAULT
 * 2. Portkey via Cloud Function proxy (this file)
 * 3. Direct Gemini API (fallback)
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { logger } from "../utils/logger";

/**
 * Get the portkeyGenerate callable function.
 * @returns {import("firebase/functions").HttpsCallable}
 */
const getPortkeyCallable = () => {
  const functions = getFunctions();
  return httpsCallable(functions, "portkeyGenerate");
};

/**
 * Generate content using Portkey via Cloud Function proxy.
 * @param {string} effectiveKey - Not used (key is server-side)
 * @param {string} systemPrompt - System prompt text
 * @param {string} userPrompt - User prompt text
 * @param {function} setStatus - Status callback
 * @param {number} temperature - Temperature parameter
 * @param {string} model - Model name
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
    setStatus("Connecting to Portkey (secure)...");

    const portkeyCallable = getPortkeyCallable();
    const result = await portkeyCallable({
      systemPrompt,
      userPrompt,
      temperature,
      model,
      action: "generate",
    });

    setStatus("Content generated successfully");
    return result.data.textResponse;
  } catch (error) {
    logger.error("Portkey generation error:", error);
    throw new Error(`Portkey generation failed: ${error.message}`);
  }
};

/**
 * Generate critique using Portkey via Cloud Function proxy.
 * @param {string} apiKey - Not used (key is server-side)
 * @param {object} question - Question object
 * @param {string} model - Model to use
 * @returns {Promise<object>} Critique result
 */
export const generateCritique = async (
  apiKey,
  question,
  model = "gemini-1.5-flash"
) => {
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

  const systemPrompt =
    "Expert UE5 Technical Reviewer. Output valid JSON only. Evaluate objectively and provide constructive feedback.";

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
        "originalScore": 75,
        "critique": "string",
        "rewrite": {
            "question": "string",
            "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
            "correct": "string"
        },
        "improvedScore": 92,
        "changes": "string"
    }
    
    IMPORTANT: Both originalScore AND improvedScore are REQUIRED fields. Do not omit either one.

    Question: ${question.question}
    Options: ${optionsStr}
    Correct: ${question.correct}`;

  try {
    const portkeyCallable = getPortkeyCallable();
    const result = await portkeyCallable({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      model,
      action: "critique",
    });

    const rawText = result.data.textResponse || "";
    logger.log(
      "[Portkey Critique DEBUG] Raw response:",
      rawText.substring(0, 500)
    );

    const cleanJson = rawText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    logger.log(
      "[Portkey Critique DEBUG] Scores - Original:",
      parsed.originalScore,
      "| Improved:",
      parsed.improvedScore
    );

    return {
      score: parsed.originalScore || parsed.score || 0,
      text: parsed.critique || parsed.text,
      rewrite: parsed.rewrite,
      improvedScore: parsed.improvedScore,
      changes: parsed.changes,
    };
  } catch (error) {
    logger.error("Portkey critique error:", error);
    throw new Error(`Portkey critique failed: ${error.message}`);
  }
};

/**
 * Rewrite question using Portkey via Cloud Function proxy.
 * @param {string} apiKey - Not used (key is server-side)
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
    const portkeyCallable = getPortkeyCallable();
    const result = await portkeyCallable({
      systemPrompt,
      userPrompt,
      temperature: 0.5,
      model: "gemini-1.5-flash",
      action: "generate",
    });

    return result.data.textResponse || "";
  } catch (error) {
    logger.error("Portkey rewrite error:", error);
    throw new Error(`Portkey rewrite failed: ${error.message}`);
  }
};

/**
 * Classify question discipline using Portkey via Cloud Function proxy.
 * @param {string} apiKey - Not used (key is server-side)
 * @param {string} questionText - Question text
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
    const portkeyCallable = getPortkeyCallable();
    const result = await portkeyCallable({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
      model: "gemini-1.5-flash",
      action: "classify",
    });

    return (result.data.textResponse || "").trim();
  } catch (error) {
    logger.error("Portkey classification error:", error);
    throw new Error(`Portkey classification failed: ${error.message}`);
  }
};

/**
 * Generate tags using Portkey via Cloud Function proxy.
 * @param {string} apiKey - Not used (key is server-side)
 * @param {string} questionText - Question text
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
    const portkeyCallable = getPortkeyCallable();
    const result = await portkeyCallable({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      model: "gemini-1.5-flash",
      action: "tags",
    });

    const text = result.data.textResponse || "[]";
    return JSON.parse(text);
  } catch (error) {
    logger.error("Portkey tags error:", error);
    return [];
  }
};
