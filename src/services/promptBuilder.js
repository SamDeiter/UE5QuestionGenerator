/**
 * Constructs the system prompt for AI question generation
 * Dynamically adjusts batch distribution based on difficulty mode
 * Enforces strict formatting rules and sourcing requirements
 * 
 * @param {Object} config - The current application configuration
 * @param {string} fileContext - Context string from uploaded files
 * @returns {string} Complete system prompt for Gemini API
 */
export const constructSystemPrompt = (config, fileContext) => {
    let batchNum = parseInt(config.batchSize) || 6;
    let easyCount = 0; let mediumCount = 0; let hardCount = 0;
    let targetType = 'Multiple Choice and True/False';
    let mcCount = 0; let tfCount = 0;

    // Parse difficulty setting (e.g., "Easy MC", "Balanced All")
    const [difficulty, type] = config.difficulty.split(' ');

    if (difficulty === 'Balanced') {
        // Ensure batch size is divisible by 6 for even distribution
        if (batchNum % 6 !== 0) batchNum = Math.ceil(batchNum / 6) * 6;
        const countPerCategory = batchNum / 6;

        easyCount = countPerCategory;
        mediumCount = countPerCategory;
        hardCount = countPerCategory;

        targetType = 'Multiple Choice and True/False';
        mcCount = countPerCategory * 3;
        tfCount = countPerCategory * 3;
    } else {
        // Specific difficulty logic
        if (difficulty === 'Easy') easyCount = batchNum;
        else if (difficulty === 'Medium') mediumCount = batchNum;
        else if (difficulty === 'Hard') hardCount = batchNum;

        if (type === 'MC') {
            targetType = 'Multiple Choice ONLY';
            mcCount = batchNum;
        } else if (type === 'T/F') {
            targetType = 'True/False ONLY';
            tfCount = batchNum;
        }
    }

    const difficultyPrompt = (difficulty === 'Balanced')
        ? `Generate approximately ${easyCount} Easy, ${mediumCount} Medium, and ${hardCount} Hard questions. Aim for ${mcCount} Multiple Choice questions and ${tfCount} True/False questions for a balanced batch.`
        : `Generate exactly ${batchNum} questions of difficulty: ${difficulty}.`;

    return `
## Universal UE5 Scenario-Based Question Generator — Gemini Version
Role: You are a senior Unreal Engine 5 technical writer. Create short, clear, scenario-driven questions in Simplified Technical English (STE).
**FORMATTING INSTRUCTION:** You MUST enclose key technical concepts (like Nanite, Lumen, Blueprints, Virtual Shadow Maps) in HTML bold tags (e.g., <b>Nanite</b>) in the Question and Answer columns.
Discipline: ${config.discipline}
Target Language: ${config.language}
Question Type: ${targetType}
**LANGUAGE STRICTNESS:** Output ONLY in ${config.language}. Do NOT provide bilingual text.
Question Format:
| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt |
- ID starts at 1.
- Difficulty levels: Easy / Medium / Hard.
- For True/False questions: OptionA=TRUE, OptionB=FALSE. CorrectLetter=A/B.
- **CRITICAL RULE:** True/False questions must be a SINGLE assertion.
- **TYPE RULE:** If Question Type is 'Multiple Choice ONLY', do NOT generate True/False questions. If Question Type is 'True/False ONLY', do NOT generate Multiple Choice questions.
Sourcing:
1. Official Epic Games Documentation (dev.epicgames.com/documentation)
2. Attached Local Files
**FORBIDDEN SOURCES:** Do NOT use forums, Reddit, community wikis, or external video platforms like YouTube.
Output:
- **OUTPUT INSTRUCTION:** ${difficultyPrompt}
${fileContext}
`;
};
