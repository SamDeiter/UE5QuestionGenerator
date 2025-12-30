import os

file_path = r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\generation\useQuestionGenerator.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the handlers
auto_critique_code = """
  const handleAutoCritique = useCallback(
    async (questions) => {
      setStatus(\"Auto-critiquing...\");
      showMessage(
        `Running AI critique on ${questions.length} questions...`,
        TOAST_DURATION.MEDIUM
      );

      const critiqueQuestion = async (question) => {
        try {
          const { score, text, rewrite, changes } = await generateCritique(
            effectiveApiKey,
            question
          );

          let suggestedTags = question.tags || [];
          if (
            suggestedTags.length < GENERATION_LIMITS.MIN_TAGS_PER_QUESTION &&
            rewrite
          ) {
            const improvedQuestion = {
              question: rewrite.question || question.question,
              optionA: rewrite.optionA || question.options?.A,
              optionB: rewrite.optionB || question.options?.B,
              optionC: rewrite.optionC || question.options?.C,
              optionD: rewrite.optionD || question.options?.D,
            };
            const newTags = await generateTagsSecure(
              effectiveApiKey,
              improvedQuestion
            );
            if (newTags) {
              suggestedTags = [
                ...new Set([
                  ...suggestedTags,
                  ...newTags.map((t) => t.replace(/^#/, \"\")),
                ]),
              ];
            }
          }

          updateQuestionInState(question.id, (item) => ({
            ...item,
            critique: text,
            critiqueScore: score,
            suggestedRewrite: rewrite ? { ...rewrite, tags: suggestedTags } : null,
            rewriteChanges: changes,
          }));
          return score;
        } catch {
          return null;
        }
      };

      const batchSize = GENERATION_LIMITS.BATCH_SIZE_PARALLEL_CRITIQUE;
      const scores = [];
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        const batchScores = await Promise.all(batch.map(critiqueQuestion));
        scores.push(...batchScores.filter((s) => s !== null));
      }

      const avgScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

      const highScoreCount = scores.filter(
        (s) => s >= QUALITY_THRESHOLDS.PASS
      ).length;
      const lowScoreCount = scores.filter(
        (s) => s < QUALITY_THRESHOLDS.MEDIOCRE
      ).length;

      if (lowScoreCount > 0) {
        showMessage(
          `Critique complete! Avg: ${avgScore}/100. ⚠️ ${lowScoreCount} need improvement.`,
          TOAST_DURATION.EXTENDED
        );
      } else {
        showMessage(
          `Critique complete! Avg: ${avgScore}/100. ${highScoreCount} ready to accept!`,
          TOAST_DURATION.LONG
        );
      }
      setStatus(\"\");
    },
    [effectiveApiKey, setStatus, showMessage, updateQuestionInState]
  );
"""

perform_generation_code = """
  const handlePerformGeneration = useCallback(
    async ({
      effectiveApiKey,
      systemPrompt,
      userPrompt,
      effectiveType,
      startTime,
      tokenAnalysis,
    }) => {
      const text = await generateContent(
        effectiveApiKey,
        systemPrompt,
        userPrompt,
        setStatus,
        config.temperature,
        config.model
      );
      const duration = Date.now() - startTime;

      const groundingSources = window.__lastGroundingSources || [];
      const groundedUrls = new Set(
        groundingSources.map((s) => s.url.toLowerCase())
      );

      let genQuestions = parseQuestions(text);
      if (genQuestions.length === 0) {
        throw new Error(\"Failed to parse questions.\");
      }

      genQuestions = filterForbiddenSources(genQuestions);

      const expectedType =
        effectiveType === \"T/F\" || effectiveType === \"True/False\"
          ? \"True/False\"
          : \"Multiple Choice\";

      genQuestions = verifyAndProcessQuestions(
        genQuestions,
        { groundedUrls, expectedType, config },
        convertMCtoTF
      );

      window.__lastGroundingSources = [];

      const valQuestions = [];
      let rejCount = 0;

      genQuestions.forEach((q) => {
        const validation = validateQuestion(q);
        if (validation.isCriticalFailure) {
          rejCount++;
        } else {
          valQuestions.push({ ...q, _validation: validation });
        }
      });

      if (rejCount > 0) {
        showMessage(
          `Auto-rejected ${rejCount} questions with invalid metadata.`,
          TOAST_DURATION.EXTENDED
        );
      }

      const enriched = enrichGeneratedQuestions(valQuestions, {
        config,
        duration,
        costPerQuestion:
          valQuestions.length > 0
            ? tokenAnalysis.cost.estimated / valQuestions.length
            : 0,
        groundingSources,
        expectedType,
        requestedDifficulty: config.difficulty,
      });

      const uniqueQs = await checkAndStoreQuestions(enriched);

      const avgQual =
        uniqueQs.reduce((sum, q) => sum + (q.qualityScore || 0), 0) /
        (uniqueQs.length || 1);

      const genId = logGeneration({
        discipline: config.discipline,
        difficulty: config.difficulty,
        batchSize: config.batchSize,
        tokensUsed: {
          input: tokenAnalysis.input.total,
          output: estimateTokens(text),
        },
        duration,
        questionsGenerated: uniqueQs.length,
        averageQuality: Math.round(avgQual),
        success: true,
        model: config.model || \"gemini-2.0-flash\",
        estimatedCost: tokenAnalysis.cost.estimated,
      });

      uniqueQs.forEach((q) => {
        logQuestion({
          id: q.id,
          generationId: genId,
          created: q.dateAdded,
          status: \"pending\",
          qualityScore: q.qualityScore,
          discipline: q.discipline,
          difficulty: q.difficulty,
          type: q.type,
          questionText: q.question,
        });
      });

      addQuestionsToState(uniqueQs, false);
      return uniqueQs;
    },
    [
      config,
      setStatus,
      checkAndStoreQuestions,
      addQuestionsToState,
      showMessage,
    ]
  );
"""

# Extract the body of handleGenerate if we can find it
import re

# Find handleGenerate
# It's better to just replace the whole useQuestionGenerator body for safety if we can identify the return
# But let's try to be surgical

# Remove existing handleAutoCritique and handlePerformGeneration if they exist
content = re.sub(r'const handleAutoCritique = useCallback\(.*?}\s*,\s*\[.*?]\s*\);', '', content, flags=re.DOTALL)
content = re.sub(r'const handlePerformGeneration = useCallback\(.*?}\s*,\s*\[.*?]\s*\);', '', content, flags=re.DOTALL)

# Insert before handleGenerate
content = content.replace('const handleGenerate = useCallback(async () => {', auto_critique_code + perform_generation_code + '  const handleGenerate = useCallback(async () => {')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restructuring complete.")
