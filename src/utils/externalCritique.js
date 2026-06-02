import { logger } from "../utils/logger";
/**
 * Export/Import utilities for external AI critique
 * Allows bulk processing with ChatGPT or Gemini Business
 */

/**
 * Export all uncritiqued questions for external processing
 */
export const exportQuestionsForCritique = (questions) => {
  // Filter questions without critique
  const uncritiqued = questions.filter((q) => !q.critiqueScore && !q.critique);

  // Format for AI processing
  const exportData = uncritiqued.map((q, idx) => ({
    index: idx,
    id: q.id,
    question: q.question,
    options: q.options,
    correct: q.correct,
    difficulty: q.difficulty,
    type: q.type,
    discipline: q.discipline,
  }));

  // Create download
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `questions_to_critique_${
    new Date().toISOString().split("T")[0]
  }.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Also copy prompt to clipboard
  const prompt = generateCritiquePrompt(exportData.length);
  navigator.clipboard.writeText(prompt).then(() => {
    logger.log("✅ Prompt copied to clipboard!");
  });

  return {
    count: exportData.length,
    prompt,
  };
};

/**
 * Generate the prompt for ChatGPT/Gemini
 */
const generateCritiquePrompt = (questionCount) => {
  return `I need you to score ${questionCount} Unreal Engine 5 technical questions.

For EACH question, provide a single quality score (0-100).

SCORING GUIDELINES:
- 90-100: Excellent - Clear, accurate, well-written, strong distractors
- 80-89: Good - Minor issues but professionally acceptable  
- 70-79: Acceptable - Needs polish but fundamentally sound
- 60-69: Needs Work - Multiple issues requiring revision
- Below 60: Poor - Major problems

REQUIRED OUTPUT FORMAT (JSON):
[
  {
    "index": 0,
    "id": "question_id_here",
    "originalScore": 88
  },
  {
    "index": 1,
    "id": "another_id",
    "originalScore": 75
  }
]

CRITICAL: 
- Return ONLY the JSON array, no other text
- Include EVERY question from the input file
- Use the EXACT "id" values from the input
- Score should be the "originalScore" field

I'll paste the questions in my next message.`;
};
