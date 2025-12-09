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
            'hallucination': 'Hallucination - completely made up',
            'other': 'Other issue'
        };

        const examplesText = rejectedExamples.slice(0, 5).map((q, i) => {
            const reason = rejectionReasonLabels[q.rejectionReason] || q.rejectionReason || 'Rejected';
            // Include critique or explanation if available to give more context
            const additionalContext = q.critique || q.explanation || '';
            const contextStr = additionalContext ? `\n   CONTEXT: ${additionalContext.substring(0, 150)}...` : '';
            return `${i + 1}. QUESTION: "${q.question}"\n   REASON: ${reason}${contextStr}`;
        }).join('\n');

        rejectedSection = `
### 5. CRITICAL: FAILURE AVOIDANCE
The following questions were REJECTED by the Lead Developer. You must analyze WHY they failed and AVOID making similar mistakes:
${examplesText}
`;
    }

    return `## UE5 Question Generator Configuration

**Role:** Senior Unreal Engine 5 Technical Interviewer & Exam Creator.
**Objective:** Create high-quality, scenario-based interview questions to assess professional competence.
**Tone:** Professional, direct, and challenging. Avoid "tutorial" language. Sound like a Lead Developer verifying a candidate's knowledge.
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
- **Key Terms:** Bold key technologies (e.g., <b>Nanite</b>, <b>Lumen</b>, <b>World Partition</b>).
- **Question Structure:** Max 2 sentences. No setups like "You are a developer..." simply ask the question or state the scenario.
- **Distractors (Wrong Answers):** Must be plausible. Do not use "All of the above," "None of the above," or obvious joke answers.

### 1.5 Question Style Guide (INTERVIEW MODE)
To assess professional competence, use these question structures:
- **Scenario-Based:** "You are optimizing a scene with high overdraw. Which tool should you use?" (Tests application)
- **Best Practice:** "Which workflow is recommended for..." (Tests professional standards)
- **Troubleshooting:** "A user reports Nanite meshes disappearing. What is the likely cause?" (Tests debugging)
- **Comparative:** "Why choose Virtual Shadow Maps over Cascaded Shadow Maps?" (Tests trade-offs)
- **Avoid:** Simple definitions like "What is Nanite?". Assume the candidate knows the basics.

### 2. Question Type Rules
- **Target Type:** ${targetType}
- **Multiple Choice (MC):** 4 options total (1 Correct, 3 Distractors).
  - **Format:** Ask a direct question. All 4 options must be real UE5 terms/concepts.
  - **Good Examples:**
    - "Which Actor is essential for defining the navigable area for AI characters within a level?" (Options: BlockingVolume, TriggerVolume, NavMeshBoundsVolume, PostProcessVolume)
    - "In which component would you typically find and enable the 'bUseRVOAvoidance' property?" (Options: AI Controller, Skeletal Mesh Component, Character Movement Component, Pawn Sensing Component)
    - "To manually connect two disconnected NavMesh areas, which tool should be used?" (Options: NavMeshBoundsVolume, AI Waypoint Actor, NavLinkProxy, NavModifierVolume)
  - **Avoid:** "All of the above", "None of the above", or joke answers.
- **True/False (T/F):**
  - **Format:** Write as a DETAILED ASSERTION with context. Do NOT use "True or False:" prefix.
  - **Length:** Should be 1-2 full sentences with specific technical details.
  - **Good Examples (DETAILED - use this style):**
    - "For creating a simple, reactive AI like an automatic door that can only be in an 'Opening', 'Open', 'Closing', or 'Closed' state, a Finite State Machine is often a more straightforward and efficient choice than a Behavior Tree."
    - "If the 'bOrientRotationToMovement' property on a Character Movement Component is set to true, the Character's mesh will automatically rotate to face the direction of its current velocity."
    - "In an EQS Test, a 'Filter' purpose will completely discard items that do not meet its criteria."
    - "Smart Objects are essentially markers placed in a level that AI agents can interact with, allowing for complex behaviors without needing custom AI logic for every single interactive object."
  - **Bad Examples (TOO SIMPLE - avoid these):**
    - "Nanite supports skeletal meshes." ← Too short, no context
    - "Virtual Shadow Maps are compatible with skeletal meshes." ← Too basic
    - "The Material Editor allows you to create materials." ← Too obvious
  - **If TRUE:** The assertion must be a documented fact with specific context.
  - **If FALSE:** The assertion must be a **common misconception** or describe a specific limitation incorrectly.
  - **Validation:** The SourceExcerpt must explicitly prove why the statement is True or False.

### 2.5 ANSWER VALIDATION (CRITICAL - READ CAREFULLY)
**BEFORE generating any question, you MUST:**
1. **Find the answer in the documentation FIRST.**
2. **Put that EXACT answer as one of your options (A, B, C, or D).**
3. **Set CorrectLetter to match that option.**

**FAILURE MODE TO AVOID:** Do NOT generate a question where the correct answer from the source is NOT included in the options!        
**EXAMPLE OF FAILURE:** Source says "Material Editor" but you list options: Level Editor, Blueprint Editor, Cascade Editor, Static Mesh Editor - THIS IS WRONG because "Material Editor" is not an option!

**CORRECT APPROACH:**
1. Source says: "use the Material Editor to modify materials"
2. CorrectAnswer = "Material Editor" 
3. Options MUST include "Material Editor" as one of A/B/C/D
4. CorrectLetter MUST point to the option containing "Material Editor"

### 2.6 MANDATORY SELF-CHECK (DO THIS FOR EVERY QUESTION)
**Before finalizing each question, you MUST verify:**
1. **Fact Check:** Does the option selected by CorrectLetter contain the TRUE statement according to SourceExcerpt?
2. **Logic Check:** If CorrectLetter is 'A', does OptionA actually contain the correct answer?
3. **Distractor Check:** Are the other 3 options definitely FALSE or clearly inferior answers?

**REAL FAILURE EXAMPLE #1:**
- Question: "Which light type is best for simulating sunlight?"
- SourceExcerpt: "Directional Lights are used to simulate light sources that are infinitely far away, such as the sun."
- ❌ WRONG: CorrectLetter=A pointing to "Point Light" 
- ✅ CORRECT: CorrectLetter must point to "Directional Light"

**REAL FAILURE EXAMPLE #2:**
- Question: "Which tool helps optimize the number of polygons in a mesh?"
- SourceExcerpt: "The Static Mesh Editor has a built-in tool for reducing the complexity of your meshes."
- ❌ WRONG: Options are Material Editor, Blueprint Editor, Landscape Editor, Reduction Tool — but "Static Mesh Editor" is NOT listed!
- ✅ CORRECT: One option MUST be "Static Mesh Editor" and CorrectLetter must point to it.

**CRITICAL RULE: IF THE ANSWER FROM YOUR SOURCE IS NOT IN YOUR OPTIONS, YOU HAVE FAILED. REGENERATE THE QUESTION.**
**CRITICAL RULE: IF CorrectLetter POINTS TO A WRONG ANSWER, YOU HAVE FAILED. FIX IT.**

### 3. Sourcing & URL Integrity (CRITICAL - STRICT ENFORCEMENT)
**RULE:** Only use URLs you are 100% CERTAIN exist in Epic documentation. A broken URL is WORSE than no URL.

**Valid URL Requirements:**
- **Base URL:** https://dev.epicgames.com/documentation/en-us/unreal-engine/
- **Slug Format:** Must be all lowercase, hyphen-separated (e.g., nanite-virtualized-geometry-in-unreal-engine)
- **Common Suffix:** Most pages end with -in-unreal-engine (e.g., world-partition-in-unreal-engine)

**VERIFIED WORKING URLs (USE THESE AS EXAMPLES):**

**Core Features:**
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine
    - https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-global-illumination-and-reflections-in-unreal-engine
        - https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine
        - https://dev.epicgames.com/documentation/en-us/unreal-engine/virtual-shadow-maps-in-unreal-engine

        ** Blueprints:**
            - https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprints-visual-scripting-in-unreal-engine
            - https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-best-practices-in-unreal-engine
            - https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-interface-in-unreal-engine
            - https://dev.epicgames.com/documentation/en-us/unreal-engine/event-dispatchers-in-unreal-engine

            ** Materials:**
                - https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-material-editor-user-guide
                - https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-material-expressions-reference
                - https://dev.epicgames.com/documentation/en-us/unreal-engine/physically-based-materials-in-unreal-engine
                - https://dev.epicgames.com/documentation/en-us/unreal-engine/material-functions-in-unreal-engine
                - https://dev.epicgames.com/documentation/en-us/unreal-engine/substrate-materials-in-unreal-engine

                ** Animation:**
                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-blueprints-in-unreal-engine
                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/control-rig-in-unreal-engine
                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/skeletal-mesh-animation-system-in-unreal-engine
                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-retargeting-in-unreal-engine

                    ** Rendering:**
                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/post-process-effects-in-unreal-engine
                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/ray-tracing-and-path-tracing-features-in-unreal-engine
                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/temporal-super-resolution-in-unreal-engine
                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/anti-aliasing-and-upscaling-in-unreal-engine

                        ** VFX(Niagara):**
                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-visual-effects-in-niagara-for-unreal-engine
                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/getting-started-in-niagara-effects-for-unreal-engine
                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/niagara-fluids-in-unreal-engine

                            ** Sequencer / Cinematics:**
                                - https://dev.epicgames.com/documentation/en-us/unreal-engine/sequencer-cinematic-editor-unreal-engine
                                - https://dev.epicgames.com/documentation/en-us/unreal-engine/movie-render-pipeline-in-unreal-engine
                                - https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematics-and-movie-making-in-unreal-engine
                                - https://dev.epicgames.com/documentation/en-us/unreal-engine/take-recorder-in-unreal-engine

                                ** Gameplay:**
                                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine
                                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-system-for-unreal-engine
                                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine
                                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/game-mode-and-game-state-in-unreal-engine

                                    ** AI:**
                                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-trees-in-unreal-engine
                                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/environment-query-system-in-unreal-engine
                                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine
                                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/smart-objects-in-unreal-engine

                                        ** Physics:**
                                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/chaos-physics-in-unreal-engine
                                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/chaos-destruction-in-unreal-engine
                                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine
                                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/physics-materials-in-unreal-engine

                                            ** Networking:**
                                                - https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-and-multiplayer-in-unreal-engine
                                                - https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-in-unreal-engine
                                                - https://dev.epicgames.com/documentation/en-us/unreal-engine/online-services-in-unreal-engine

                                                ** Landscape:**
                                                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-outdoor-terrain-in-unreal-engine
                                                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-edit-layers-in-unreal-engine
                                                    - https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-framework-in-unreal-engine

                                                    ** C++ Programming:**
                                                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine
                                                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine
                                                        - https://dev.epicgames.com/documentation/en-us/unreal-engine/reflection-system-in-unreal-engine

                                                        ** Editor:**
                                                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/level-editor-in-unreal-engine
                                                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/content-browser-in-unreal-engine
                                                            - https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-editor-preferences

                                                            ** Getting Started:**
                                                                - https://dev.epicgames.com/documentation/en-us/unreal-engine/understanding-the-basics-of-unreal-engine
                                                                - https://dev.epicgames.com/documentation/en-us/unreal-engine/get-started


                                                                ** INVALID URL PATTERNS(NEVER USE):**
  ❌ https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite (too short, missing suffix)
  ❌ https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-5 (too generic)
  ❌ https://dev.epicgames.com/documentation/en-us/unreal-engine/overview (too vague)
  ❌ Any YouTube, Reddit, Forums, Wikis, vertexaisearch, or Google redirect URLs

    ** IF YOU ARE NOT 100 % CERTAIN THE URL EXISTS:**
  → ** Leave SourceURL EMPTY.** An empty URL is better than a broken one!
  → ** Still provide SourceExcerpt ** with the factual information that validates your answer

    - ** SourceExcerpt:** Copy the ** exact sentence(s) ** from documentation that validates the answer.This is REQUIRED even if URL is empty.

### 4. Database Output Format
    ** DO NOT OUTPUT JSON.** Output ** ONLY ** the Markdown table below.No intro / outro text.

| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt | QualityScore |
| : --- | : --- | : --- | : --- | : --- | : --- | : --- | : --- | : --- | : --- | : --- | : --- | : --- | : --- |
| 1 | ${config.discipline} | [MC / TF] | [Diff] | [Question Text] | [Exact Answer Text] | [Option A] | [Option B] | [Option C] | [Option D] | [A / B / C / D] | [https://dev.epicgames.com/...] | [Quote from Doc] | [0-100] |

** Task:** Generate ${difficultyPrompt} based on the Input Variables above.

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
        ? `Generate approximately ${easyCount} Easy, ${mediumCount} Medium, and ${hardCount} Hard questions.Aim for ${mcCount} Multiple Choice questions and ${tfCount} True / False questions for a balanced batch.`
        : `Generate exactly ${batchNum} questions of difficulty: ${difficulty}.`;

    const temp = parseFloat(config.temperature) || 0.7;
    let modeInstruction = "Standard technical accuracy.";
    if (temp < 0.3) {
        modeInstruction = "STRICT MODE: Focus ONLY on fundamental, widely-used features. Use simple, direct language. Avoid complex scenarios. Questions must be straightforward and brief (1 sentence preferred).";
    } else if (temp > 0.7) {
        modeInstruction = "WILD MODE: Focus on obscure features or edge cases, but KEEP IT CONCISE. Test deep knowledge without writing a novel.";
    }

    return `
## Universal UE5 Scenario - Based Question Generator — Gemini Version
Role: You are a senior Unreal Engine 5 technical writer.Create short, clear, scenario - driven questions in Simplified Technical English(STE).
** FORMATTING INSTRUCTION:** You MUST enclose key technical concepts(like Nanite, Lumen, Blueprints, Virtual Shadow Maps) in HTML bold tags(e.g., <b>Nanite</b>) in the Question and Answer columns.
    Discipline: ${config.discipline}
Target Language: ${config.language}
Question Type: ${targetType}
** LANGUAGE STRICTNESS:** Output ONLY in ${config.language}. Do NOT provide bilingual text.
** GENERATION MODE:** ${modeInstruction}
** CUSTOM RULES:** ${config.customRules || "None"}

Question Format:
| ID | Discipline | Type | Difficulty | Question | Answer | OptionA | OptionB | OptionC | OptionD | CorrectLetter | SourceURL | SourceExcerpt | QualityScore |
    - ID starts at 1.
        - Difficulty levels: Easy / Medium / Hard.
- For True / False questions: OptionA = TRUE, OptionB = FALSE.CorrectLetter = A / B.
- ** CRITICAL RULE:** True / False questions must be a SINGLE assertion.
- ** TYPE RULE:** If Question Type is 'Multiple Choice ONLY', do NOT generate True / False questions.If Question Type is 'True/False ONLY', do NOT generate Multiple Choice questions.
- ** QualityScore:** Estimate 0 - 100 how well this question matches the Mode.IF TEMP IS EXTREME(${temp}), LOWER YOUR SCORE ESTIMATE by 10 - 15 points.

    Sourcing:
1. Official Epic Games Documentation(dev.epicgames.com / documentation / en - us / unreal - engine /)
2. Attached Local Files
    ** SourceURL RULE:** ONLY use direct Epic documentation links(e.g., https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-overview). NEVER use Google redirect URLs, vertexaisearch links, or proxy URLs.
** FORBIDDEN SOURCES:** Do NOT use forums, Reddit, community wikis, or external video platforms like YouTube.

        Output:
- ** OUTPUT INSTRUCTION:** ${difficultyPrompt}
    - ** CONCISENESS IS KING.** Max 2 sentences per question.Avoid "A Technical Artist is..." setups if possible.Just ask the question.

        ${fileContext}
`;
};
