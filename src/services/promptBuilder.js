/**
 * Optimized Prompt Builder (v1.6)
 * Reduces token usage by ~40% through:
 * - Abbreviated instructions
 * - Dynamic sections (only include when needed)
 * - Consolidated formatting rules
 * - Shorthand for repeated terms
 */

/**
 * Constructs an optimized system prompt for AI question generation
 * @param {Object} config - Application configuration
 * @param {string} fileContext - Context from uploaded files (pre-optimized)
 * @returns {string} Optimized system prompt
 */
export const constructSystemPrompt = (config, fileContext) => {
    let batchNum = parseInt(config.batchSize) || 6;
    let easyCount = 0, mediumCount = 0, hardCount = 0;
    let targetType = 'MC and T/F';
    let mcCount = 0, tfCount = 0;

    // Parse difficulty setting
    const [difficulty, type] = config.difficulty.split(' ');

    if (difficulty === 'Balanced') {
        if (batchNum % 6 !== 0) batchNum = Math.ceil(batchNum / 6) * 6;
        const countPerCategory = batchNum / 6;
        easyCount = mediumCount = hardCount = countPerCategory;
        targetType = 'MC and T/F';
        mcCount = tfCount = countPerCategory * 3;
    } else {
        if (difficulty === 'Easy') easyCount = batchNum;
        else if (difficulty === 'Medium') mediumCount = batchNum;
        else if (difficulty === 'Hard') hardCount = batchNum;

        if (type === 'MC') {
            targetType = 'MC ONLY';
            mcCount = batchNum;
        } else if (type === 'T/F') {
            targetType = 'T/F ONLY';
            tfCount = batchNum;
        }
    }

    const difficultyPrompt = (difficulty === 'Balanced')
        ? `${easyCount} Easy, ${mediumCount} Medium, ${hardCount} Hard. ${mcCount} MC, ${tfCount} T/F.`
        : `${batchNum} ${difficulty} questions.`;

    // Temperature-based mode
    const temp = parseFloat(config.temperature) || 0.7;
    let modeInstruction = '';
    if (temp < 0.3) {
        modeInstruction = 'STRICT: Fundamentals only. Simple, direct. 1 sentence preferred.';
    } else if (temp > 0.7) {
        modeInstruction = 'WILD: Obscure/edge cases. Deep knowledge. Stay concise.';
    }

    // Build dynamic sections
    const sections = [];

    // Core instruction (always included)
    sections.push(`## UE5 Question Generator
Role: Senior UE5 tech writer. Create short, clear, scenario-based questions in Simplified Technical English.
**Bold key terms:** \`<b>Nanite</b>\`, \`<b>Lumen</b>\`
Discipline: ${config.discipline}
Language: ${config.language}
Type: ${targetType}
${modeInstruction ? `Mode: ${modeInstruction}` : ''}`);

    // Format rules (consolidated)
    sections.push(`Format:
| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt | QualityScore |
- ID starts at 1. Difficulty: Easy/Medium/Hard.
- T/F: OptionA=TRUE, OptionB=FALSE. CorrectLetter=A/B. Single assertion only.
- Type rule: ${targetType === 'MC ONLY' ? 'No T/F questions' : targetType === 'T/F ONLY' ? 'No MC questions' : 'Mix MC and T/F'}.
- QualityScore: 0-100. ${temp < 0.3 || temp > 0.7 ? 'Lower by 10-15 for extreme temps.' : ''}`);

    // Output instruction
    sections.push(`Output: ${difficultyPrompt}
**MAX 2 SENTENCES.** No "A Technical Artist is..." setups. Just ask.
**IMPORTANT:** Output ONLY the table. Do not include any introductory or concluding text.`);

    // Sources (always included)
    sections.push(`Sources: Epic Games docs (dev.epicgames.com/documentation), local files.
NO forums, Reddit, wikis, YouTube.`);

    // Custom rules (only if provided)
    if (config.customRules && config.customRules.trim()) {
        sections.push(`Custom: ${config.customRules}`);
    }

    // Language instruction (only for non-English)
    if (config.language !== 'English') {
        sections.push(`**LANGUAGE:** Output ONLY in ${config.language}. No bilingual text.`);
    }

    // File context (only if provided)
    if (fileContext && fileContext.trim()) {
        sections.push(`\n${fileContext}`);
    }

    return sections.join('\n\n');
};

/**
 * Gets the original (v1.5) prompt for comparison
 * @param {Object} config - Application configuration
 * @param {string} fileContext - Context from uploaded files
 * @returns {string} Original verbose prompt
 */
export const constructSystemPromptV15 = (config, fileContext) => {
    let batchNum = parseInt(config.batchSize) || 6;
    let easyCount = 0; let mediumCount = 0; let hardCount = 0;
    let targetType = 'Multiple Choice and True/False';
    let mcCount = 0; let tfCount = 0;

    const [difficulty, type] = config.difficulty.split(' ');

    if (difficulty === 'Balanced') {
        if (batchNum % 6 !== 0) batchNum = Math.ceil(batchNum / 6) * 6;
        const countPerCategory = batchNum / 6;
        easyCount = countPerCategory;
        mediumCount = countPerCategory;
        hardCount = countPerCategory;
        targetType = 'Multiple Choice and True/False';
        mcCount = countPerCategory * 3;
        tfCount = countPerCategory * 3;
    } else {
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

    const temp = parseFloat(config.temperature) || 0.7;
    let modeInstruction = "Standard technical accuracy.";
    if (temp < 0.3) {
        modeInstruction = "STRICT MODE: Focus ONLY on fundamental, widely-used features. Use simple, direct language. Avoid complex scenarios. Questions must be straightforward and brief (1 sentence preferred).";
    } else if (temp > 0.7) {
        modeInstruction = "WILD MODE: Focus on obscure features or edge cases, but KEEP IT CONCISE. Test deep knowledge without writing a novel.";
    }

    return `
## Universal UE5 Scenario-Based Question Generator — Gemini Version
Role: You are a senior Unreal Engine 5 technical writer. Create short, clear, scenario-driven questions in Simplified Technical English (STE).
**FORMATTING INSTRUCTION:** You MUST enclose key technical concepts (like Nanite, Lumen, Blueprints, Virtual Shadow Maps) in HTML bold tags (e.g., <b>Nanite</b>) in the Question and Answer columns.
Discipline: ${config.discipline}
Target Language: ${config.language}
Question Type: ${targetType}
**LANGUAGE STRICTNESS:** Output ONLY in ${config.language}. Do NOT provide bilingual text.
**GENERATION MODE:** ${modeInstruction}
**CUSTOM RULES:** ${config.customRules || "None"}

Question Format:
| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt | QualityScore |
- ID starts at 1.
- Difficulty levels: Easy / Medium / Hard.
- For True/False questions: OptionA=TRUE, OptionB=FALSE. CorrectLetter=A/B.
- **CRITICAL RULE:** True/False questions must be a SINGLE assertion.
- **TYPE RULE:** If Question Type is 'Multiple Choice ONLY', do NOT generate True/False questions. If Question Type is 'True/False ONLY', do NOT generate Multiple Choice questions.
- **QualityScore:** Estimate 0-100 how well this question matches the Mode. IF TEMP IS EXTREME (${temp}), LOWER YOUR SCORE ESTIMATE by 10-15 points.

Sourcing:
1. Official Epic Games Documentation (dev.epicgames.com/documentation)
2. Attached Local Files
**FORBIDDEN SOURCES:** Do NOT use forums, Reddit, community wikis, or external video platforms like YouTube.

Output:
- **OUTPUT INSTRUCTION:** ${difficultyPrompt}
- **CONCISENESS IS KING.** Max 2 sentences per question. Avoid "A Technical Artist is..." setups if possible. Just ask the question.

${fileContext}
`;
};
