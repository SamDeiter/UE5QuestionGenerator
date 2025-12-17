/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useCallback } from "react";
import {
  generateContentSecure as generateContent,
  generateCritiqueSecure as generateCritique,
  generateTagsSecure,
} from "../services/geminiSecure";
import { constructSystemPrompt } from "../services/promptBuilder";
import { parseQuestions } from "../utils/questionHelpers";
import { validateQuestion } from "../utils/questionValidator";
import { analyzeRequest, estimateTokens } from "../utils/tokenCounter";
import { logGeneration, logQuestion } from "../utils/analyticsStore";
import { validateGeneration } from "../utils/quotaEnforcement";
import { QUALITY_THRESHOLDS, TOAST_DURATION } from "../utils/constants";

export const useGeneration = (
  config,
  setConfig,
  effectiveApiKey,
  isApiReady,
  isTargetMet,
  maxBatchSize,
  getFileContext,
  checkAndStoreQuestions,
  addQuestionsToState,
  updateQuestionInState,
  handleLanguageSwitch,
  showMessage,
  setStatus,
  setShowNameModal,
  setShowApiError,
  setShowHistory,
  translationMap,
  allQuestionsMap
) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  /**
   * Intelligently converts a Multiple Choice question to True/False format
   * Creates a statement from the question + correct answer, randomly makes it TRUE or FALSE
   */
  const convertMCtoTF = (mcQuestion, difficulty) => {
    const correctAnswerText = mcQuestion.options[mcQuestion.correct];
    const wrongAnswers = Object.entries(mcQuestion.options)
      .filter(([key, val]) => key !== mcQuestion.correct && val && val.trim())
      .map(([, val]) => val);

    // Check if the original question is already effectively True/False
    const lowerCorrect = correctAnswerText
      .trim()
      .toLowerCase()
      .replace(/[.,!]$/, "");
    const isBooleanAnswer = ["true", "false", "yes", "no"].includes(
      lowerCorrect
    );

    let newStatement = mcQuestion.question.trim().replace(/\?$/, "");
    let makeItTrue = true; // Default
    let targetAnswer = correctAnswerText;

    if (isBooleanAnswer) {
      // PRESERVE MODE: If original answer is True/False, we keep the statement as is.
      // We cannot easily flip the truthiness of a statement without complex NLP (e.g. adding "not").
      // So we force the new question to match the original truthiness.

      // If original correct was "TRUE" or "YES" -> New Correct is A (TRUE)
      if (["true", "yes"].includes(lowerCorrect)) {
        makeItTrue = true;
      }
      // If original correct was "FALSE" or "NO" -> New Correct is B (FALSE)
      else {
        makeItTrue = false;
      }

      // Statement is just the original question text (which is likely a statement)
      // newStatement remains the same
    } else {
      // STANDARD MODE: Randomly decide if this will be a TRUE or FALSE question (50/50)
      makeItTrue = Math.random() > 0.5;
      targetAnswer = makeItTrue
        ? correctAnswerText
        : wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)] ||
          "incorrect";

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

  const handleGenerate = async () => {
    console.log(
      "🐛 [DEBUG] handleGenerate called. isApiReady:",
      isApiReady,
      "creatorName:",
      config.creatorName
    );
    if (!config.creatorName) {
      showMessage(
        "Please enter your Creator Name to start generating.",
        TOAST_DURATION.LONG
      );
      setShowNameModal(true);
      return;
    }
    if (!isApiReady) {
      setShowApiError(true);
      showMessage(
        "API key is required. Please enter it in Settings.",
        TOAST_DURATION.LONG
      );
      return;
    }

    if (isTargetMet) {
      showMessage(
        `Quota met for ${config.difficulty}! Change difficulty/type or discipline to continue.`,
        TOAST_DURATION.LONG
      );
      return;
    }

    // QUOTA ENFORCEMENT: Check if category/total quota is met
    const allQuestions = Array.from(allQuestionsMap.values()).flat();
    const quotaCheck = validateGeneration(
      config.discipline,
      config.difficulty,
      config.batchSize,
      allQuestions,
      config.type || "Multiple Choice" // Pass current type setting
    );

    if (!quotaCheck.allowed) {
      showMessage(quotaCheck.reason, TOAST_DURATION.EXTENDED);
      return;
    }

    // If batch size needs to be reduced, update it
    let effectiveBatchSize = config.batchSize;
    if (quotaCheck.warning && quotaCheck.maxAllowed < config.batchSize) {
      effectiveBatchSize = quotaCheck.maxAllowed;
      showMessage(
        `Batch size reduced to ${quotaCheck.maxAllowed} (quota limit). ${quotaCheck.reason}`,
        TOAST_DURATION.EXTENDED
      );
    }

    // Determine the effective type to generate (may be forced by quota)
    const effectiveType =
      quotaCheck.forceType || config.type || "Multiple Choice";

    if (quotaCheck.forceType) {
      console.log(
        `🎯 Quota forcing generation of ${quotaCheck.forceType} questions`
      );
    }

    setIsGenerating(true);
    setShowHistory(false);
    setStatus("Drafting Scenarios...");
    const startTime = Date.now();

    // Collect recent rejected questions to learn from (up to 5, matching current discipline)
    const rejectedExamples = Array.from(allQuestionsMap.values())
      .flat()
      .filter(
        (q) =>
          q.status === "rejected" &&
          q.rejectionReason &&
          q.discipline === config.discipline
      )
      .slice(-5); // Take most recent 5

    // Log the first item in the map to see structure
    if (allQuestionsMap.size > 0) {
      const _firstVal = Array.from(allQuestionsMap.values())[0];
    }

    // AUTO-DETECT COVERAGE GAPS: Calculate which tags need more questions
    const { TAGS_BY_DISCIPLINE } = await import("../utils/tagTaxonomy");
    const availableTags = TAGS_BY_DISCIPLINE[config.discipline] || [];
    const tagCounts = {};
    availableTags.forEach((t) => (tagCounts[t] = 0));

    // Count tag usage from existing questions
    Array.from(allQuestionsMap.values())
      .flat()
      .filter((q) => q.discipline === config.discipline)
      .forEach((q) => {
        if (q.tags && Array.isArray(q.tags)) {
          q.tags.forEach((t) => {
            const norm = t.startsWith("#") ? t : `#${t}`;
            const key = availableTags.find(
              (at) => at.toLowerCase() === norm.toLowerCase()
            );
            if (key) tagCounts[key]++;
          });
        }
      });

    // Find gaps
    const zeroTags = availableTags.filter((t) => tagCounts[t] === 0);
    const lowTags = availableTags.filter(
      (t) => tagCounts[t] > 0 && tagCounts[t] < 3
    );
    const coverageGaps = { zeroTags, lowTags };

    if (zeroTags.length > 0 || lowTags.length > 0) {
      console.log(
        `📊 Coverage gaps detected: ${zeroTags.length} zero, ${lowTags.length} low`
      );
    }

    // Build system prompt with adjusted config for forced type
    const adjustedConfig = {
      ...config,
      type: effectiveType,
      batchSize: effectiveBatchSize,
    };
    const systemPrompt = constructSystemPrompt(
      adjustedConfig,
      getFileContext(),
      rejectedExamples,
      coverageGaps
    );

    // Build user prompt with explicit type instruction
    let typeInstruction = "";
    if (effectiveType === "True/False" || effectiveType === "T/F") {
      typeInstruction =
        " Generate ONLY True/False questions (no Multiple Choice).";
    } else if (effectiveType === "Multiple Choice" || effectiveType === "MC") {
      typeInstruction =
        " Generate ONLY Multiple Choice questions (no True/False).";
    }
    const userPrompt = `Generate ${effectiveBatchSize} scenario-based questions for ${config.discipline} in ${config.language}. Focus: ${config.difficulty}.${typeInstruction} Ensure links work for UE 5.7 or latest available.`;

    // Analyze token usage before API call
    const tokenAnalysis = analyzeRequest(
      systemPrompt,
      userPrompt,
      2000,
      config.model || "gemini-2.0-flash"
    );

    try {
      // RELIABLE GENERATION: Accept whatever AI generates, convert as needed
      const text = await generateContent(
        effectiveApiKey,
        systemPrompt,
        userPrompt,
        setStatus,
        config.temperature,
        config.model
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Get grounding sources from the last API call
      const groundingSources = window.__lastGroundingSources || [];
      const groundedUrls = new Set(
        groundingSources.map((s) => s.url.toLowerCase())
      );
      console.log(
        "🔍 Verifiable sources from search:",
        groundingSources.length
      );

      let newQuestions = parseQuestions(text);
      if (newQuestions.length === 0) {
        console.error("Failed to parse. Raw text received:", text);
        const truncatedText =
          text.length > 100 ? text.substring(0, 100) + "..." : text;
        throw new Error(`Failed to parse questions. Raw: "${truncatedText}"`);
      }

      // FILTER: Strictly remove forbidden domains (YouTube, Vimeo)
      const forbiddenDomains = [
        "youtube.com",
        "youtu.be",
        "vimeo.com",
        "vertexaisearch",
      ];
      const initialCount = newQuestions.length;
      newQuestions = newQuestions.filter((q) => {
        const url = (q.sourceUrl || "").toLowerCase();
        return !forbiddenDomains.some((domain) => url.includes(domain));
      });

      if (newQuestions.length < initialCount) {
        console.warn(
          `Filtered out ${
            initialCount - newQuestions.length
          } questions with forbidden sources.`
        );
        showMessage(
          `Removed ${
            initialCount - newQuestions.length
          } questions with invalid sources.`
        );
      }

      // Parse the requested difficulty and type from config
      const requestedDifficulty = config.difficulty;
      const requestedType = config.type || "Multiple Choice"; // Default if missing

      // Normalize expected type string
      const expectedType =
        requestedType === "T/F" || requestedType === "True/False"
          ? "True/False"
          : "Multiple Choice";

      // SOURCE VERIFICATION: Check if URLs match grounding sources
      newQuestions = newQuestions.map((q) => {
        let updatedQ = { ...q };
        const url = (updatedQ.sourceUrl || "").toLowerCase();

        // Check if URL is verified from grounding
        if (url && groundedUrls.size > 0) {
          // Try to match URL against grounded sources
          const isVerified = Array.from(groundedUrls).some(
            (groundedUrl) =>
              url.includes(groundedUrl) ||
              groundedUrl.includes(url.split("/").slice(-1)[0])
          );
          updatedQ.sourceVerified = isVerified;

          // If we have grounding sources but URL doesn't match, it might be hallucinated
          if (!isVerified && url.includes("epicgames.com")) {
            updatedQ.sourceVerified = "unverified"; // Could be valid but not from this search
            console.warn(`⚠️ URL not in grounding sources: ${url}`);
          }
        } else if (!url) {
          updatedQ.sourceVerified = "missing";
        } else if (url.includes("epicgames.com")) {
          updatedQ.sourceVerified = "assumed"; // Looks valid but no grounding to verify
        } else {
          updatedQ.sourceVerified = false;
          updatedQ.invalidUrl = true;
        }

        // Apply difficulty and type conversion
        if (expectedType === "True/False" && q.type === "Multiple Choice") {
          updatedQ = convertMCtoTF(updatedQ, requestedDifficulty);
          updatedQ.sourceVerified = q.sourceVerified; // Preserve verification status
        } else {
          // Use requested difficulty as-is (normalization handles variants)
          updatedQ.difficulty = requestedDifficulty;
        }

        // CRITICAL: Set discipline so chart can filter correctly
        updatedQ.discipline = config.discipline;

        return updatedQ;
      });

      // Clear grounding sources for next request
      window.__lastGroundingSources = [];

      // Calculate metrics
      const outputTokens = estimateTokens(text);
      const totalCost = tokenAnalysis.cost.estimated;
      const costPerQuestion =
        newQuestions.length > 0 ? totalCost / newQuestions.length : 0;

      // Count verification stats
      const verifiedCount = newQuestions.filter(
        (q) => q.sourceVerified === true
      ).length;
      const unverifiedCount = newQuestions.filter(
        (q) =>
          q.sourceVerified === "unverified" || q.sourceVerified === "assumed"
      ).length;
      const missingCount = newQuestions.filter(
        (q) => q.sourceVerified === "missing"
      ).length;
      console.log(
        `📊 Source verification: ${verifiedCount} verified, ${unverifiedCount} unverified, ${missingCount} missing`
      );

      // VALIDATION: Run unified validator (URL, Excerpt, Answer Match)
      const validatedQuestions = [];
      let autoRejectedCount = 0;

      newQuestions.forEach((q) => {
        const validation = validateQuestion(q);

        if (validation.isCriticalFailure) {
          autoRejectedCount++;
          console.warn(
            `🚫 Auto-rejected question: ${validation.warnings.join(", ")}`,
            q
          );
        } else {
          // Attach validation metadata to the question
          validatedQuestions.push({
            ...q,
            _validation: validation,
            // Keep legacy fields for backward compatibility if needed, but _validation is the source of truth
            answerMismatch:
              !validation.isValid &&
              validation.warnings.some((w) => w.includes("Answer")),
            invalidUrl:
              !validation.isValid &&
              validation.warnings.some((w) => w.includes("URL")),
          });
        }
      });

      if (autoRejectedCount > 0) {
        console.warn(
          `🗑️ Auto-rejected ${autoRejectedCount} questions due to critical quality issues.`
        );
        showMessage(
          `Auto-rejected ${autoRejectedCount} questions with missing sources or invalid URLs.`,
          TOAST_DURATION.EXTENDED
        );
      }

      newQuestions = validatedQuestions;

      // Count warnings
      const warningCount = newQuestions.filter(
        (q) => !q._validation.isValid
      ).length;
      if (warningCount > 0) {
        console.warn(
          `⚠️ ${warningCount} questions have quality warnings - review carefully!`
        );
        showMessage(
          `⚠️ ${warningCount} questions flagged for review (check warnings).`,
          8000
        );
      }

      // Enrich questions with metadata
      const enrichedQuestions = newQuestions.map((q) => {
        const enriched = {
          ...q,
          // CRITICAL: Force status to pending - NEVER auto-accept
          status: "pending",
          language: "English", // All generated questions are in English
          creatorName: config.creatorName || "Unknown", // Set creator name from config
          estimatedCost: costPerQuestion,
          generationTime: duration,
          model: config.model || "gemini-2.0-flash",
          groundingSources:
            groundingSources.length > 0 ? groundingSources.slice(0, 3) : null, // Store top 3 sources
          tags: q.tags && q.tags.length > 0 ? q.tags : config.tags || [], // Use AI-assigned tags, fallback to focus tags

          // Enforce config values to ensure they match filters
          discipline: config.discipline,
          type: expectedType, // Use the normalized type
          difficulty: requestedDifficulty, // Use the normalized difficulty
        };

        // SAFEGUARD: Double-check status is pending (paranoid validation)
        if (enriched.status !== "pending") {
          console.warn(
            "⚠️ Question had non-pending status, forcing to pending:",
            enriched
          );
          enriched.status = "pending";
        }

        return enriched;
      });

      // Save to storage and get unique ones
      const uniqueNewQuestions = await checkAndStoreQuestions(
        enrichedQuestions
      );

      const avgQuality =
        uniqueNewQuestions.reduce((sum, q) => sum + (q.qualityScore || 0), 0) /
        (uniqueNewQuestions.length || 1);

      // Log generation to analytics
      const generationId = logGeneration({
        discipline: config.discipline,
        difficulty: config.difficulty,
        batchSize: config.batchSize,
        tokensUsed: { input: tokenAnalysis.input.total, output: outputTokens },
        duration,
        questionsGenerated: uniqueNewQuestions.length,
        averageQuality: Math.round(avgQuality),
        success: true,
        model: config.model || "gemini-2.0-flash",
        estimatedCost: totalCost,
      });

      // Log each question
      uniqueNewQuestions.forEach((q) => {
        logQuestion({
          id: q.id,
          generationId,
          created: q.dateAdded,
          status: "pending",
          qualityScore: q.qualityScore,
          discipline: q.discipline,
          difficulty: q.difficulty,
          type: q.type,
          questionText: q.question,
        });
      });

      // DEBUG: Log question statuses before adding to state
      console.log(
        "🐛 [DEBUG] Questions before addQuestionsToState:",
        uniqueNewQuestions.map((q) => ({
          id: q.uniqueId?.slice(0, 8),
          status: q.status,
        }))
      );

      addQuestionsToState(uniqueNewQuestions, false);

      // AUTO-CRITIQUE: Run critique on each question in background
      // Check if auto-critique is enabled (default: true)
      const autoCritiqueEnabled =
        localStorage.getItem("ue5_auto_critique") === "true"; // Default: false

      if (autoCritiqueEnabled && uniqueNewQuestions.length > 0) {
        setStatus("Auto-critiquing...");
        showMessage(
          `Running AI critique on ${uniqueNewQuestions.length} questions...`,
          TOAST_DURATION.MEDIUM
        );

        // Critique questions in parallel (max 3 at a time to avoid rate limits)
        const critiqueQuestion = async (question) => {
          try {
            const { score, text, rewrite, changes } = await generateCritique(
              effectiveApiKey,
              question
            );

            // Generate tags if question has fewer than 3
            let suggestedTags = question.tags || [];
            if (suggestedTags.length < 3 && rewrite) {
              try {
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
                if (newTags && newTags.length > 0) {
                  suggestedTags = [
                    ...new Set([
                      ...suggestedTags,
                      ...newTags.map((t) => t.replace(/^#/, "")),
                    ]),
                  ];
                }
              } catch (error) {
                console.error(
                  "Tag generation failed during auto-critique:",
                  error
                );
              }
            }

            // Update rewrite object to include suggested tags
            const updatedRewrite = rewrite
              ? { ...rewrite, tags: suggestedTags }
              : null;

            updateQuestionInState(question.id, (item) => ({
              ...item,
              critique: text,
              critiqueScore: score,
              suggestedRewrite: updatedRewrite,
              rewriteChanges: changes,
            }));
            return score;
          } catch (e) {
            console.warn(`Failed to critique question ${question.id}:`, e);
            return null;
          }
        };

        // Process in batches of 3
        const batchSize = 3;
        const scores = [];
        for (let i = 0; i < uniqueNewQuestions.length; i += batchSize) {
          const batch = uniqueNewQuestions.slice(i, i + batchSize);
          setStatus(
            `Critiquing ${i + 1}-${Math.min(
              i + batchSize,
              uniqueNewQuestions.length
            )} of ${uniqueNewQuestions.length}...`
          );
          const batchScores = await Promise.all(batch.map(critiqueQuestion));
          scores.push(...batchScores.filter((s) => s !== null));
        }

        // Calculate average score
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
      }

      setStatus("");
    } catch (err) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Log failed generation
      logGeneration({
        discipline: config.discipline,
        difficulty: config.difficulty,
        batchSize: config.batchSize,
        tokensUsed: tokenAnalysis
          ? { input: tokenAnalysis.input.total, output: 0 }
          : { input: 0, output: 0 },
        duration,
        questionsGenerated: 0,
        averageQuality: 0,
        success: false,
        errorMessage: err.message,
        model: config.model || "gemini-2.0-flash",
        estimatedCost: tokenAnalysis ? tokenAnalysis.cost.estimated : 0,
      });

      console.error(err);
      setStatus("Error");
      showMessage(`Generation Error: ${err.message}. Please try again.`, 10000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTranslateSingle = useCallback(
    async (q, targetLang) => {
      if (!isApiReady) {
        showMessage(
          "API key is required for translation. Please enter it in the settings panel.",
          TOAST_DURATION.LONG
        );
        return;
      }

      setIsProcessing(true);
      setStatus(`Translating question to ${targetLang}...`);

      // JSON Prompt for reliability
      const systemPrompt = `You are a professional technical translator for Unreal Engine 5 documentation. Translate the provided JSON object from ${
        q.language || "English"
      } to ${targetLang}. 
        CRITICAL RULES:
        1. Return ONLY valid JSON. No markdown formatting, no explanations.
        2. Translate ONLY: "Question", "OptionA", "OptionB", "OptionC", "OptionD", and "SourceExcerpt".
        3. DO NOT translate: "ID", "Discipline", "Type", "Difficulty", "Answer", "CorrectLetter", and "SourceURL".
        4. Maintain exact JSON structure.`;

      const userPrompt = `Translate this object:\n${JSON.stringify(
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
      )}`;

      try {
        const text = await generateContent(
          effectiveApiKey,
          systemPrompt,
          userPrompt,
          setStatus
        );

        // Attempt to parse JSON response
        let translatedData = null;
        try {
          // Strip code fence if present
          const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
          translatedData = JSON.parse(cleanText);
        } catch (e) {
          console.warn("JSON parse failed, trying parseQuestions fallback", e);
        }

        // Fallback to helper parser or use parsed JSON
        const translatedQs = translatedData
          ? parseQuestions(JSON.stringify(translatedData))
          : parseQuestions(text);

        if (translatedQs.length > 0) {
          const tq = translatedQs[0];

          // ✅ FIX: Preserve original card identity and metadata
          // Update the existing question in place instead of creating a new one
          const translatedVariant = {
            ...q, // Start with ALL original properties
            question: tq.question,
            options: tq.options,
            sourceExcerpt: tq.sourceExcerpt || q.sourceExcerpt,
            language: targetLang,
            translatedAt: new Date().toISOString(),
            translatedFrom: q.language || "English",
            // DO NOT change: id, uniqueId, status, dateAdded, tags, critiqueScore,
            // humanVerified, reviewCompletedAt, etc.
          };

          // ✅ FIX: Update existing question, don't create new one
          updateQuestionInState(q.id, translatedVariant);
          await checkAndStoreQuestions([translatedVariant]); // Persist to Firebase

          // ✅ FIX: Do NOT call handleLanguageSwitch - keep user on same card
          // The global language filter should remain unchanged

          showMessage(`✅ Translated to ${targetLang}`, TOAST_DURATION.MEDIUM);
        } else {
          throw new Error("Parser returned no questions from translation.");
        }
      } catch (e) {
        console.error("Translation error:", e);
        setStatus("Translation Failed");
        showMessage(`Translation Failed: ${e.message}`, TOAST_DURATION.LONG);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isApiReady,
      showMessage,
      effectiveApiKey,
      setStatus,
      setIsProcessing,
      checkAndStoreQuestions,
      addQuestionsToState,
      handleLanguageSwitch,
      translationMap,
      allQuestionsMap,
    ]
  );

  const handleExplain = useCallback(
    async (q) => {
      if (!isApiReady) {
        showMessage(
          "API key is required for explanation. Please enter it in the settings panel.",
          TOAST_DURATION.LONG
        );
        return;
      }

      setIsProcessing(true);
      setStatus("Explaining...");
      const prompt = `Explain WHY the answer is correct in simple terms: "${
        q.question
      }" Answer: "${q.correct === "A" ? q.options.A : q.options.B}"`;
      try {
        const exp = await generateContent(
          effectiveApiKey,
          "Technical Assistant",
          prompt,
          setStatus
        );
        updateQuestionInState(q.id, (item) => ({ ...item, explanation: exp }));
        setStatus("");
      } catch {
        setStatus("Fail");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isApiReady,
      showMessage,
      effectiveApiKey,
      updateQuestionInState,
      setStatus,
      setIsProcessing,
    ]
  );

  const handleVariate = useCallback(
    async (q) => {
      console.log("🐛 [DEBUG] handleVariate called. isApiReady:", isApiReady);
      if (!isApiReady) {
        showMessage(
          "API key is required for creation. Please enter it in the settings panel.",
          TOAST_DURATION.LONG
        );
        return;
      }

      setIsProcessing(true);
      setStatus("Creating improved variations...");

      // Build context-aware prompt that leverages critique feedback
      const hasCritique = q.critique && q.critiqueScore !== undefined;
      const critiqueContext = hasCritique
        ? `\n\nCRITIQUE FEEDBACK (Score: ${q.critiqueScore}/100):\n${q.critique}\n\nYour task: Generate 2 IMPROVED variations that ADDRESS the critique feedback above.`
        : `\n\nYour task: Generate 2 IMPROVED variations that are MORE CHALLENGING and PROFESSIONAL than the original.`;

      const sys = constructSystemPrompt(config, getFileContext());
      const prompt = `ORIGINAL QUESTION TO IMPROVE:\rDiscipline: ${
        q.discipline
      }\rDifficulty: ${q.difficulty}\rType: ${q.type}\rQuestion: "${
        q.question
      }"\rOptions:\r  A) ${q.options.A}\r  B) ${q.options.B}\r  ${
        q.options.C ? `C) ${q.options.C}` : ""
      }\r  ${q.options.D ? `D) ${q.options.D}` : ""}\rCorrect Answer: ${
        q.correct
      }\r${critiqueContext}\r\rREQUIREMENTS FOR VARIATIONS:\r1. Address any weaknesses mentioned in the critique (if provided)\r2. Increase depth and professional relevance\r3. Use scenario-based or application-focused phrasing\r4. Avoid trivial or overly simple questions\r5. Maintain the same difficulty level: ${
        q.difficulty
      }\r6. Keep the same type: ${q.type}\r\rOutput in Markdown Table format.`;

      try {
        const text = await generateContent(
          effectiveApiKey,
          sys,
          prompt,
          setStatus
        );
        const newQs = parseQuestions(text);
        console.log(
          "🐛 [DEBUG] handleVariate text:",
          text,
          "newQs length:",
          newQs.length
        );
        if (newQs.length > 0) {
          // Attach variations directly to the original question
          const updatedOriginal = {
            ...q,
            alternatives: newQs, // Store alternatives array
            hasAlternatives: true,
          };

          // Update the original question with alternatives
          updateQuestionInState(q.id, () => updatedOriginal);

          showMessage(
            `🔄 ${newQs.length} variations ready! Use ← → arrows.`,
            TOAST_DURATION.MEDIUM
          );
        } else {
          showMessage(
            "⚠️ No variations generated. Try again.",
            TOAST_DURATION.MEDIUM
          );
        }
      } catch (e) {
        console.error("Variation generation failed:", e);
        setStatus("Fail");
        showMessage(
          `Failed to generate variations: ${e.message}`,
          TOAST_DURATION.LONG
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isApiReady,
      showMessage,
      config,
      getFileContext,
      effectiveApiKey,
      updateQuestionInState,
      setStatus,
      setIsProcessing,
    ]
  );

  // Define handleCritique first so handles that depend on it can include it in dependency array
  const handleCritique = useCallback(
    async (q) => {
      if (!isApiReady) {
        showMessage(
          "API key is required for critique. Please enter it in the settings panel.",
          TOAST_DURATION.LONG
        );
        return;
      }

      setIsProcessing(true);
      setStatus("Critiquing...");

      try {
        const { score, text, rewrite, improvedScore, changes } =
          await generateCritique(effectiveApiKey, q);

        console.log(
          "[useGeneration DEBUG] Critique response - score:",
          score,
          "improvedScore:",
          improvedScore
        );

        // Generate tags if question has fewer than 3
        let suggestedTags = q.tags || [];
        if (suggestedTags.length < 3 && rewrite) {
          try {
            const improvedQuestion = {
              question: rewrite.question || q.question,
              optionA: rewrite.optionA || q.options?.A,
              optionB: rewrite.optionB || q.options?.B,
              optionC: rewrite.optionC || q.options?.C,
              optionD: rewrite.optionD || q.options?.D,
            };
            const newTags = await generateTagsSecure(
              effectiveApiKey,
              improvedQuestion
            );
            if (newTags && newTags.length > 0) {
              suggestedTags = [
                ...new Set([
                  ...suggestedTags,
                  ...newTags.map((t) => t.replace(/^#/, "")),
                ]),
              ];
            }
          } catch (error) {
            console.error("Tag generation failed during critique:", error);
          }
        }

        // Build standardized suggestedRewrite object matching type definition
        // @see src/types/question.js - SuggestedRewrite typedef
        const updatedRewrite = rewrite
          ? {
              // Improved question text
              question: rewrite.question || q.question,

              // Improved answer options
              options: {
                A: rewrite.optionA || q.options?.A || "",
                B: rewrite.optionB || q.options?.B || "",
                C: rewrite.optionC || q.options?.C || "",
                D: rewrite.optionD || q.options?.D || "",
              },

              // Correct answer letter
              correct: rewrite.correctLetter || q.correct || "A",

              // List of improvements made
              improvements: Array.isArray(changes)
                ? changes
                : changes
                ? [changes]
                : [],

              // Estimated score after improvements
              critiqueScore: improvedScore, // Estimated score after improvements

              // Critique reasoning
              critiqueText: text,

              // Updated tags (includes generated tags if < 3)
              tags: suggestedTags,

              // Explanation of why changes were made
              changesExplanation:
                rewrite.explanation ||
                "AI-suggested improvements to enhance question quality",
            }
          : null;

        // Track critique attempts
        const previousAttempts = q.critiqueAttempts || 0;
        const newAttemptCount = previousAttempts + 1;

        // Check if this is the 3rd failed attempt (score < PASS)
        const MAX_ATTEMPTS = 3;
        // PASSING_SCORE uses constant
        const PASSING_SCORE = QUALITY_THRESHOLDS.PASS;

        if (score < PASSING_SCORE && newAttemptCount >= MAX_ATTEMPTS) {
          // Auto-reject after 3 failed attempts
          updateQuestionInState(q.id, (item) => ({
            ...item,
            critique: text,
            critiqueScore: score,
            improvedScore: improvedScore,
            suggestedRewrite: updatedRewrite,
            rewriteChanges: changes,
            critiqueAttempts: newAttemptCount,
            status: "rejected",
            rejectionReason: "low_score_after_retries",
            rejectedAt: new Date().toISOString(),
          }));
          showMessage(
            `⛔ Auto-rejected: Score ${score}/100 after ${newAttemptCount} attempts. Quality too low.`,
            TOAST_DURATION.EXTENDED
          );
        } else {
          // Normal update
          updateQuestionInState(q.id, (item) => ({
            ...item,
            critique: text,
            critiqueScore: score,
            improvedScore: improvedScore,
            suggestedRewrite: updatedRewrite,
            rewriteChanges: changes,
            critiqueAttempts: newAttemptCount,
          }));

          // Simple score notification - no verbose warnings
          showMessage(
            `Critique Ready! Score: ${score}/100`,
            TOAST_DURATION.MEDIUM
          );
        }
      } catch (e) {
        console.error("Critique failed:", e);
        setStatus("Fail");
        showMessage(`Critique Failed: ${e.message}`, TOAST_DURATION.LONG);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isApiReady,
      showMessage,
      effectiveApiKey,
      updateQuestionInState,
      setStatus,
      setIsProcessing,
    ]
  );

  const handleBulkTranslateMissing = useCallback(async () => {
    if (isProcessing) return;
    if (!isApiReady) {
      showMessage(
        "API key is required for bulk translation. Please enter it in the settings panel.",
        TOAST_DURATION.LONG
      );
      return;
    }

    setIsProcessing(true);
    setShowHistory(false);

    const targetLangs = ["Chinese (Simplified)", "Japanese", "Korean"];
    const translationQueue = [];

    const baseQuestions = Array.from(allQuestionsMap.values()).map(
      (variants) => {
        // Defensive check for integration tests where data might be malformed
        const list = Array.isArray(variants) ? variants : [variants];
        return (
          list.find((v) => (v.language || "English") === "English") || list[0]
        );
      }
    );

    baseQuestions.forEach((q) => {
      const existingLangs = translationMap.get(q.uniqueId) || new Set();

      targetLangs.forEach((targetLang) => {
        // Only translate accepted English questions with valid sources
        if (
          q.status === "accepted" &&
          (q.language || "English") === "English" &&
          q.sourceUrl &&
          !q.invalidUrl &&
          !existingLangs.has(targetLang)
        ) {
          translationQueue.push({ question: q, targetLang });
        }
      });
    });

    if (translationQueue.length === 0) {
      showMessage(
        "All CN, JP, and KR translations already exist for all accepted questions.",
        TOAST_DURATION.LONG
      );
      setIsProcessing(false);
      return;
    }

    showMessage(
      `Found ${translationQueue.length} missing translations. Starting bulk generation...`
    );
    let generatedCount = 0;
    let totalProgress = 0;
    const totalQueueSize = translationQueue.length;

    for (const { question: q, targetLang } of translationQueue) {
      const systemPrompt = `You are a professional technical translator for Unreal Engine 5 documentation. Translate the provided JSON object from ${
        q.language || "English"
      } to ${targetLang}. 
            CRITICAL RULES:
            1. Return ONLY valid JSON. No markdown formatting.
            2. Translate ONLY: "Question", "OptionA", "OptionB", "OptionC", "OptionD", and "SourceExcerpt".
            3. DO NOT translate: "ID", "Discipline", "Type", "Difficulty", "Answer", "CorrectLetter", and "SourceURL".
            4. Maintain exact JSON structure.`;

      const userPrompt = `Translate this object:\n${JSON.stringify(
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
      )}`;

      try {
        setStatus(
          `Translating: ${q.uniqueId.substring(0, 4)} -> ${targetLang}...`
        );
        const text = await generateContent(
          effectiveApiKey,
          systemPrompt,
          userPrompt,
          setStatus
        );

        let translatedData = null;
        try {
          const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
          translatedData = JSON.parse(cleanText);
        } catch {
          // ignore JSON parse error, let parseQuestions handle it
        }

        const translatedQs = translatedData
          ? parseQuestions(JSON.stringify(translatedData))
          : parseQuestions(text);

        if (translatedQs.length > 0) {
          const tq = translatedQs[0];
          const newQuestion = {
            ...tq,
            id: Date.now() + Math.random(),
            uniqueId: q.uniqueId,
            discipline: q.discipline,
            type: q.type,
            difficulty: q.difficulty,
            language: targetLang,
            status: "pending", // CRITICAL: Force pending - ALL questions must be reviewed
            dateAdded: new Date().toISOString(),
          };

          await checkAndStoreQuestions([newQuestion]);
          addQuestionsToState([newQuestion], false);
          generatedCount++;
        }
      } catch (e) {
        console.error(
          `Failed to generate translation for ${q.uniqueId} to ${targetLang}:`,
          e
        );
      }

      totalProgress = Math.floor((generatedCount / totalQueueSize) * 100);
      setTranslationProgress(totalProgress);
    }

    showMessage(
      `Bulk translation complete! Generated ${generatedCount} new translations.`,
      TOAST_DURATION.EXTENDED
    );
    setIsProcessing(false);
  }, [
    isProcessing,
    isApiReady,
    showMessage,
    allQuestionsMap,
    translationMap,
    effectiveApiKey,
    checkAndStoreQuestions,
    addQuestionsToState,
    setStatus,
    setShowHistory,
    setIsProcessing,
    setTranslationProgress,
  ]);

  const handleApplyRewrite = useCallback(
    (q) => {
      if (!q.suggestedRewrite) return;

      const updatedQ = {
        ...q,
        question: q.suggestedRewrite.question,
        options: q.suggestedRewrite.options,
        correct: q.suggestedRewrite.correct,
        suggestedRewrite: null,
        rewriteChanges: null,
        critique: null,
        critiqueScore: null,
        humanVerified: false, // Reset - human must verify
      };

      // Update state
      updateQuestionInState(q.id, () => updatedQ);

      showMessage(
        "✓ Applied! Re-critiquing to get new score...",
        TOAST_DURATION.SHORT
      );

      // Auto-run critique on the NEW version
      setTimeout(() => {
        handleCritique({ ...updatedQ, id: q.id });
      }, 300);
    },
    [updateQuestionInState, showMessage, handleCritique]
  );

  return {
    isGenerating,
    isProcessing,
    translationProgress,
    handleGenerate,
    handleTranslateSingle, // Already memoized earlier? Need to verify file content but I'll assume I should just keep it as is if I didn't verify it, but since I am editing the block, I should check.
    // Wait, I saw handleTranslateSingle in step 59 and it WAS defined there. I need to make sure I didn't overwrite it or miss it.
    // The previous view_file (step 66) started at line 798, which was `const handleExplain = ...`
    // `handleTranslateSingle` was BEFORE that (lines 701-796).
    // I NEED TO MEMOIZE handleTranslateSingle as well!
    // My ReplaceFileContent started at line 798.
    // So handleTranslateSingle is NOT included in my replacement.
    // I should add handleTranslateSingle to the replacement if it wasn't memoized.
    // It was NOT memoized in Step 59.
    handleExplain,
    handleVariate,
    handleCritique,
    handleApplyRewrite,
    handleBulkTranslateMissing,
  };
};
