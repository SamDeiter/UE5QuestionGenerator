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
    console.log("✅ Prompt copied to clipboard!");
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
  return `I need you to critique ${questionCount} Unreal Engine 5 technical questions and assign scores.

For EACH question, provide:
1. originalScore (0-100): Quality score for the question AS PROVIDED
2. improvedScore (0-100): Estimated score IF improvements were applied (should be higher)

SCORING GUIDELINES:
- 90-100: Excellent - Clear, accurate, well-written, strong distractors
- 80-89: Good - Minor issues but professionally acceptable
- 70-79: Acceptable - Needs polish but fundamentally sound
- 60-69: Needs Work - Multiple issues requiring revision
- Below 60: Poor - Major problems

OUTPUT FORMAT (JSON):
[
  {
    "index": 0,
    "id": "question_id_here",
    "originalScore": 75,
    "improvedScore": 92
  },
  ...
]

IMPORTANT: Return ONLY the JSON array, no other text.

I'll paste the questions in my next message.`;
};

/**
 * Import scores from ChatGPT/Gemini response
 */
export const importCritiqueScores = async (jsonText, db, showMessage) => {
  try {
    // Parse the AI response
    const scores = JSON.parse(jsonText);

    if (!Array.isArray(scores)) {
      throw new Error("Invalid format - expected JSON array");
    }

    console.log(`📥 Importing scores for ${scores.length} questions...`);

    // Import to Firestore
    const { doc, updateDoc } = await import("firebase/firestore");

    let updated = 0;
    let errors = 0;

    for (const item of scores) {
      try {
        await updateDoc(doc(db, "questions", item.id), {
          critiqueScore: item.originalScore,
          improvedScore: item.improvedScore,
          critique: `AI scored this question ${item.originalScore}/100`,
          lastCritiquedAt: new Date().toISOString(),
          critiqueSource: "external_ai",
        });
        updated++;
      } catch (error) {
        console.error(`Failed to update ${item.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Import complete: ${updated} updated, ${errors} errors`);

    if (showMessage) {
      showMessage(`✅ Imported scores for ${updated} questions!`, 5000);
    }

    return { updated, errors, total: scores.length };
  } catch (error) {
    console.error("Import error:", error);
    if (showMessage) {
      showMessage(`❌ Import failed: ${error.message}`, 5000);
    }
    throw error;
  }
};

/**
 * Download template JSON for reference
 */
export const downloadScoreTemplate = () => {
  const template = [
    {
      index: 0,
      id: "example_question_id",
      originalScore: 75,
      improvedScore: 92,
    },
  ];

  const blob = new Blob([JSON.stringify(template, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "score_import_template.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
