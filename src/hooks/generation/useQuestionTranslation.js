import { useState, useCallback } from "react";
import { generateContentSecure as generateContent } from "../../services/geminiSecure";
import { parseQuestions } from "../../utils/questionHelpers";
import { TOAST_DURATION, AI_CONFIG } from "../../utils/constants";
import {
  getTranslationSystemPrompt,
  getTranslationUserPrompt,
} from "../../services/prompts/translationPrompts";
import { logError } from "../../utils/AppError";

// Free-tier (15 RPM) → 1 request per 4s; add 500ms buffer for safety.
// The "lite" tier gives ~4x higher RPD than the flagship "flash" tier, so it's
// the right choice for high-volume translation work. Single source of truth
// lives in AI_CONFIG.TRANSLATION_MODEL — flip there before the 2.5-series
// shutdown on 2026-10-16 (replacement: gemini-3.1-flash-lite).
const TRANSLATION_MODEL = AI_CONFIG.TRANSLATION_MODEL;
const IS_TEST = import.meta.env?.MODE === "test" || import.meta.env?.VITEST;
const TRANSLATION_THROTTLE_MS = IS_TEST ? 0 : 4500;
const RATE_LIMIT_BACKOFF_MS = IS_TEST ? 0 : 60000; // 1 min cooldown if we hit 429

const sleep = (ms) =>
  ms > 0
    ? new Promise((resolve) => setTimeout(resolve, ms))
    : Promise.resolve();

/**
 * Hook for handling question translation logic.
 * Extracted from useGeneration to reduce complexity.
 */
export const useQuestionTranslation = ({
  effectiveApiKey,
  isApiReady,
  showMessage,
  setStatus,
  setIsProcessing,
  checkAndStoreQuestions,
  addQuestionsToState,
  updateQuestionInState,
  handleLanguageSwitch,
  translationMap,
  allQuestionsMap,
  setShowHistory,
  onRefresh,
}) => {
  const [translationProgress, setTranslationProgress] = useState(0);

  /**
   * Translates a single question to a target language.
   */
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

      const systemPrompt = getTranslationSystemPrompt(q.language, targetLang);
      const userPrompt = getTranslationUserPrompt(q);

      try {
        const text = await generateContent(
          effectiveApiKey,
          systemPrompt,
          userPrompt,
          setStatus,
          AI_CONFIG.DEFAULT_TEMPERATURE,
          TRANSLATION_MODEL
        );

        // Attempt to parse JSON response
        let translatedData = null;
        try {
          // Skip parsing if it looks like a markdown table (starts with |)
          const looksLikeTable = text.trim().startsWith("|");
          if (!looksLikeTable) {
            const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
            translatedData = JSON.parse(cleanText);
          }
        } catch (e) {
          logError(e, { operation: "parseTranslationJSON", targetLang });
        }

        const translatedQs = translatedData
          ? parseQuestions(JSON.stringify(translatedData))
          : parseQuestions(text);

        if (translatedQs.length > 0) {
          const tq = translatedQs[0];

          // Ensure original has uniqueId
          if (!q.uniqueId) {
            const newUniqueId = crypto.randomUUID();
            const updatedOriginal = {
              ...q,
              uniqueId: newUniqueId,
              language: q.language || "English",
            };

            updateQuestionInState(q.id, () => updatedOriginal);
            await checkAndStoreQuestions([updatedOriginal]);
            q = updatedOriginal;
          }

          const translatedVariant = {
            ...tq,
            id: Date.now(),
            uniqueId: q.uniqueId,
            creatorId: q.creatorId,
            creatorEmail: q.creatorEmail,
            creatorName: q.creatorName,
            discipline: q.discipline,
            type: q.type,
            difficulty: q.difficulty,
            language: targetLang,
            status: q.status,
            dateAdded: new Date().toISOString(),
            tags: q.tags,
            sourceUrl: q.sourceUrl,
            translatedAt: new Date().toISOString(),
            translatedFrom: q.language || "English",
            translationVerified: false,
          };

          await addQuestionsToState([translatedVariant], false);

          showMessage(`✅ Translated to ${targetLang}`, TOAST_DURATION.MEDIUM);
          return translatedVariant;
        } else {
          throw new Error("Parser returned no questions from translation.");
        }
      } catch (e) {
        logError(e, {
          operation: "translateSingle",
          questionId: q?.id,
          targetLang,
        });
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
      updateQuestionInState,
      // handleLanguageSwitch removed from deps: the auto-switch behavior
      // was removed in commit 755415f1; the prop is kept on the hook
      // signature for callers but is no longer referenced inside the body.
    ]
  );

  /**
   * Translates all accepted English questions to common target languages.
   */
  const handleBulkTranslateMissing = useCallback(async () => {
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
        const list = Array.isArray(variants) ? variants : [variants];
        return (
          list.find((v) => (v.language || "English") === "English") || list[0]
        );
      }
    );

    baseQuestions.forEach((q) => {
      const existingLangs = translationMap.get(q.uniqueId) || new Set();

      targetLangs.forEach((targetLang) => {
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
    const totalQueueSize = translationQueue.length;

    const ID_SUBSTRING_LENGTH = 4;
    let processedCount = 0;
    for (const { question: q, targetLang } of translationQueue) {
      const systemPrompt = getTranslationSystemPrompt(q.language, targetLang);
      const userPrompt = getTranslationUserPrompt(q);

      // Throttle to stay under free-tier 15 RPM. Skip the wait on the first
      // request — only inter-request gaps need the buffer.
      if (processedCount > 0) {
        await sleep(TRANSLATION_THROTTLE_MS);
      }
      processedCount++;

      try {
        setStatus(
          `[${processedCount}/${totalQueueSize}] Translating ${q.uniqueId.substring(
            0,
            ID_SUBSTRING_LENGTH
          )} -> ${targetLang}...`
        );
        const text = await generateContent(
          effectiveApiKey,
          systemPrompt,
          userPrompt,
          setStatus,
          AI_CONFIG.DEFAULT_TEMPERATURE,
          TRANSLATION_MODEL
        );

        let translatedData = null;
        try {
          // Skip parsing if it looks like a markdown table (starts with |)
          const looksLikeTable = text.trim().startsWith("|");
          if (!looksLikeTable) {
            const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
            translatedData = JSON.parse(cleanText);
          }
        } catch {
          // ignore
        }

        const translatedQs = translatedData
          ? parseQuestions(JSON.stringify(translatedData))
          : parseQuestions(text);

        if (translatedQs.length > 0) {
          const tq = translatedQs[0];
          const newQuestion = {
            ...tq,
            id: Date.now() + generatedCount,
            uniqueId: q.uniqueId,
            creatorId: q.creatorId,
            creatorEmail: q.creatorEmail,
            creatorName: q.creatorName,
            discipline: q.discipline,
            type: q.type,
            difficulty: q.difficulty,
            language: targetLang,
            status: "pending",
            dateAdded: new Date().toISOString(),
            translatedAt: new Date().toISOString(),
            translatedFrom: q.language || "English",
            translationVerified: false,
          };

          await checkAndStoreQuestions([newQuestion]);
          addQuestionsToState([newQuestion], false);
          generatedCount++;
        }
      } catch (e) {
        logError(e, {
          operation: "bulkTranslate",
          uniqueId: q.uniqueId,
          targetLang,
        });

        // If rate-limited, sleep an extra minute before continuing.
        const msg = String(e?.message || "").toLowerCase();
        if (
          msg.includes("rate limit") ||
          msg.includes("429") ||
          msg.includes("resource-exhausted") ||
          msg.includes("quota")
        ) {
          setStatus(
            `Rate limited — cooling down ${RATE_LIMIT_BACKOFF_MS / 1000}s...`
          );
          await sleep(RATE_LIMIT_BACKOFF_MS);
        }
      }

      const PERCENT_CONVERSION = 100;
      setTranslationProgress(
        Math.floor((generatedCount / totalQueueSize) * PERCENT_CONVERSION)
      );
    }

    showMessage(
      `Bulk translation complete! Generated ${generatedCount} new translations.`,
      TOAST_DURATION.EXTENDED
    );
    setIsProcessing(false);
    if (onRefresh) await onRefresh();
  }, [
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
  ]);

  return {
    handleTranslateSingle,
    handleBulkTranslateMissing,
    translationProgress,
    setTranslationProgress,
  };
};
