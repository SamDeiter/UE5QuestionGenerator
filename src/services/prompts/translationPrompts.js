/**
 * Prompt templates for Unreal Engine 5 question translation.
 */

export const getTranslationSystemPrompt = (sourceLang, targetLang) =>
  `
You are a professional technical translator for Unreal Engine 5 documentation. Translate the provided JSON object from ${
    sourceLang || "English"
  } to ${targetLang}. 
CRITICAL RULES:
1. Return ONLY valid JSON. No markdown formatting, no explanations.
2. Translate ONLY: "Question", "OptionA", "OptionB", "OptionC", "OptionD", and "SourceExcerpt".
3. DO NOT translate: "ID", "Discipline", "Type", "Difficulty", "Answer", "CorrectLetter", and "SourceURL".
4. Maintain exact JSON structure.
`.trim();

export const getTranslationUserPrompt = (q) =>
  `
Translate this object:
${JSON.stringify(
  {
    Discipline: q.discipline,
    Type: q.type,
    Difficulty: q.difficulty,
    Question: q.question,
    OptionA: q.options.A,
    OptionB: q.options.B,
    OptionC: q.options.C || "",
    OptionD: q.options.D || "",
    CorrectLetter: q.correct,
    SourceURL: q.sourceUrl,
    SourceExcerpt: q.sourceExcerpt,
  },
  null,
  2
)}
`.trim();
