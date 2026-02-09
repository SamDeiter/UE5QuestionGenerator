import { useState, useCallback } from "react";
import { generateContentSecure as generateContent } from "../../services/geminiSecure";
import { parseQuestions } from "../../utils/questionHelpers";
import { TOAST_DURATION } from "../../utils/constants";
import {
  getTranslationSystemPrompt,
  getTranslationUserPrompt,
} from "../../services/prompts/translationPrompts";
import { logError } from "../../utils/AppError";

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
          setStatus
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
            discipline: q.discipline,
            type: q.type,
            difficulty: q.difficulty,
            language: targetLang,
            status: q.status,
            dateAdded: new Date().toISOString(),
            tags: q.tags,
            critiqueScore: q.critiqueScore,
            sourceUrl: q.sourceUrl,
            translatedAt: new Date().toISOString(),
            translatedFrom: q.language || "English",
          };

          addQuestionsToState([translatedVariant], false);
          await checkAndStoreQuestions([translatedVariant]);
          handleLanguageSwitch(targetLang);

          showMessage(`✅ Translated to ${targetLang}`, TOAST_DURATION.MEDIUM);
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
      handleLanguageSwitch,
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
    for (const { question: q, targetLang } of translationQueue) {
      const systemPrompt = getTranslationSystemPrompt(q.language, targetLang);
      const userPrompt = getTranslationUserPrompt(q);

      try {
        setStatus(
          `Translating: ${q.uniqueId.substring(
            0,
            ID_SUBSTRING_LENGTH
          )} -> ${targetLang}...`
        );
        const text = await generateContent(
          effectiveApiKey,
          systemPrompt,
          userPrompt,
          setStatus
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
            discipline: q.discipline,
            type: q.type,
            difficulty: q.difficulty,
            language: targetLang,
            status: "pending",
            dateAdded: new Date().toISOString(),
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
