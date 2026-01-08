/**
 * Intelligently converts a Multiple Choice question to True/False format.
 * Creates a statement from the question + correct answer, randomly makes it TRUE or FALSE.
 *
 * @param {Object} mcQuestion - The multiple choice question object
 * @param {string} mcQuestion.question - The question text
 * @param {Object} mcQuestion.options - The answer options (A, B, C, D)
 * @param {string} mcQuestion.correct - The correct answer letter
 * @param {string} difficulty - The difficulty level to assign
 * @returns {Object} The converted True/False question
 */
export const convertMCtoTF = (mcQuestion, difficulty) => {
  const correctAnswerText = mcQuestion.options[mcQuestion.correct];
  const wrongAnswers = Object.entries(mcQuestion.options)
    .filter(([key, val]) => key !== mcQuestion.correct && val && val.trim())
    .map(([, val]) => val);

  // Check if the original question is already effectively True/False
  const lowerCorrect = correctAnswerText
    .trim()
    .toLowerCase()
    .replace(/[.,!]$/, "");
  const isBooleanAnswer = ["true", "false", "yes", "no"].includes(lowerCorrect);

  let newStatement = mcQuestion.question.trim().replace(/\?$/, "");

  // Determine truthiness and target answer based on question type
  // NOTE: Using Math.random here is acceptable - this is for educational quiz variety,
  // not cryptographic security. No security implications.
  // eslint-disable-next-line sonarjs/pseudo-random
  const randomBool = Math.random() > 0.5;

  // Declare variables with proper initial values based on condition
  const makeItTrue = isBooleanAnswer
    ? ["true", "yes"].includes(lowerCorrect)
    : randomBool;

  // eslint-disable-next-line sonarjs/pseudo-random
  const targetAnswer = isBooleanAnswer
    ? correctAnswerText
    : makeItTrue
    ? correctAnswerText
    : wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)] ||
      "incorrect";

  if (!isBooleanAnswer) {
    // 1. Handle "Can you..." -> "You can [stem] [answer]"
    if (/^Can you/i.test(newStatement)) {
      const stem = newStatement.replace(/^Can you\s+/i, "");
      newStatement = `You can ${stem} ${targetAnswer}`;
    }
    // 2. Handle "Is..." -> "[Subject] is [Answer]"
    else if (/^Is\s+/i.test(newStatement)) {
      const stem = newStatement.replace(/^Is\s+/i, "");
      newStatement = `${stem} is ${targetAnswer}`;
    }
    // 3. Handle "What/Which..." -> "[Stem] is [Answer]"
    else {
      // Check for WH- words
      const isWhQuestion = /^(What|Which|How|Where|When|Why)\s+/i.test(
        newStatement
      );

      if (isWhQuestion) {
        const stem = newStatement
          .replace(
            /^(What|Which|How|Where|When|Why)\s+(is|are|does|do|can|should|would)\s+/i,
            ""
          )
          .trim();
        newStatement = `${stem} is ${targetAnswer}`;
      } else {
        // Fallback for other structures: append answer
        newStatement = `${newStatement} is ${targetAnswer}`;
      }
    }
  }

  // Cleanup: Remove double spaces, capitalize, add period
  newStatement = newStatement.replace(/\s+/g, " ").trim();
  newStatement = newStatement.charAt(0).toUpperCase() + newStatement.slice(1);
  if (!newStatement.endsWith(".")) newStatement += ".";

  return {
    ...mcQuestion,
    type: "True/False",
    difficulty: difficulty,
    question: newStatement,
    options: { A: "TRUE", B: "FALSE", C: "", D: "" },
    correct: makeItTrue ? "A" : "B",
    originalMC: mcQuestion.question, // Keep original for reference
  };
};
