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
 * @param {Array} rejectedExamples - Optional array of rejected questions to learn from
 * @returns {string} Optimized system prompt
 */
export const constructSystemPrompt = (config, fileContext, rejectedExamples = []) => {
    let batchNum = parseInt(config.batchSize) || 6;
    let easyCount = 0, mediumCount = 0, hardCount = 0;
    let targetType = 'MC and T/F';
    let mcCount = 0, tfCount = 0;

    // Parse difficulty setting
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
        modeInstruction = 'STRICT: Fundamentals only. Simple, direct.';
    } else if (temp > 0.7) {
        modeInstruction = 'WILD: Obscure/edge cases. Deep knowledge.';
    }

    // REJECTED EXAMPLES SECTION - Learn from mistakes
    let rejectedSection = '';
    if (rejectedExamples && rejectedExamples.length > 0) {
        const rejectionReasonLabels = {
            'too_easy': 'Too Easy - lacks challenge',
            'too_hard': 'Too Difficult - inaccessible',
            'incorrect': 'Incorrect Answer - factually wrong',
            'unclear': 'Unclear Question - confusing wording',
            'duplicate': 'Duplicate - already exists',
            'poor_quality': 'Poor Quality - low value',
            'bad_source': 'Bad/Missing Source - invalid URL',
            'other': 'Other issue'
        };

        const examplesText = rejectedExamples.slice(0, 5).map((q, i) => {
            const reason = rejectionReasonLabels[q.rejectionReason] || q.rejectionReason || 'Rejected';
            return `${i + 1}. "${q.question}" → REJECTED: ${reason}`;
        }).join('\n');

        rejectedSection = `
### 5. Learn from Rejected Questions
The following questions were rejected by reviewers. AVOID making similar mistakes:
${examplesText}
`;
    }

    return `## UE5 Question Generator Configuration

**Role:** Senior Unreal Engine 5 Technical Writer & Exam Creator.
**Objective:** Create high-quality, scenario-based exam questions in Simplified Technical English (STE).
**Input Variables:**
- Discipline: ${config.discipline}
- Focus Areas: ${config.tags && config.tags.length > 0 ? config.tags.join(', ') : 'None specified'}
- Difficulty: ${difficulty}
- Quantity: ${batchNum}
- Language: ${config.language}
- Mode: ${modeInstruction || 'Standard'}

---

### 1. Style & Format Rules
- **Simplified Technical English (STE):** Use active voice (Subject-Verb-Object). Keep sentences under 20 words. Avoid gerunds (-ing) where possible. Use consistent terminology.
- **Key Terms:** Bold key technologies (e.g., \`<b>Nanite</b>\`, \`<b>Lumen</b>\`, \`<b>World Partition</b>\`).
- **Question Structure:** Max 2 sentences. No setups like "You are a developer..." simply ask the question or state the scenario.
- **Distractors (Wrong Answers):** Must be plausible. Do not use "All of the above," "None of the above," or obvious joke answers.

### 2. Question Type Rules
- **Target Type:** ${targetType}
- **Multiple Choice (MC):** 4 options total (1 Correct, 3 Distractors).
- **True/False (T/F):**
  - **If TRUE:** The assertion must be a documented fact, not a general truism.
  - **If FALSE:** The assertion must be a **common misconception** or a specific limitation (e.g., "Nanite supports skeletal meshes in UE 5.0" -> False). Do not generate random falsehoods (e.g., "Nanite is a sound engine").
  - **Validation:** The \`SourceExcerpt\` must explicitly prove why the statement is True or False.

### 3. Sourcing & URL Integrity (CRITICAL)
- **Domain:** Use ONLY \`dev.epicgames.com/documentation/\`.
- **Verification:** Do not hallucinate URLs. If you are unsure of the specific link, do not generate the question.
- **Format:** Ensure the URL includes the correct slug (e.g., \`.../nanite-virtualized-geometry-in-unreal-engine\`).
- **SourceExcerpt:** Copy the **exact sentence(s)** from the documentation that validates the correct answer.
- **Forbidden:** YouTube, Vimeo, Forums, Reddit, Wikis.

### 4. Database Output Format
**DO NOT OUTPUT JSON.** Output **ONLY** the Markdown table below. No intro/outro text.

| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt | QualityScore |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | ${config.discipline} | [MC/TF] | [Diff] | [Question Text] | [Exact Answer Text] | [Option A] | [Option B] | [Option C] | [Option D] | [A/B/C/D] | [Valid URL] | [Quote from Doc] | [0-100] |

**Task:** Generate ${difficultyPrompt} based on the Input Variables above.

${rejectedSection}

${config.customRules ? `### Custom Rules\n${config.customRules}` : ''}

${fileContext ? `### File Context\n${fileContext}` : ''}
`;
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
1. Official Epic Games Documentation (dev.epicgames.com/documentation/en-us/unreal-engine/)
2. Attached Local Files
**SourceURL RULE:** ONLY use direct Epic documentation links (e.g., https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-overview). NEVER use Google redirect URLs, vertexaisearch links, or proxy URLs.
**FORBIDDEN SOURCES:** Do NOT use forums, Reddit, community wikis, or external video platforms like YouTube.

Output:
- **OUTPUT INSTRUCTION:** ${difficultyPrompt}
- **CONCISENESS IS KING.** Max 2 sentences per question. Avoid "A Technical Artist is..." setups if possible. Just ask the question.

${fileContext}
`;
};
