import { useCallback } from "react";
import {
  saveQuestionsToSheets,
  fetchQuestionsFromSheets,
} from "../../services/googleSheets";
import { saveQuestionToFirestore } from "../../services/firebase";
import { normalizeStatus } from "../../utils/questionHelpers";
import { logError } from "../../utils/AppError";
import {
  QUESTION_SOURCES,
  QUESTION_STATUS,
  APP_MODES,
} from "../../utils/constants";
import { validateQuestion } from "../../utils/questionValidator";

/**
 * useSheetsBridge — Google Sheets dual-write (export) and re-import (load).
 *
 *   - handleExportToSheets: writes the current question set to both
 *     Sheets and Firestore in parallel (so the user has a single source
 *     of truth across both)
 *   - handleLoadFromSheets: pulls from the configured Apps Script URL,
 *     re-validates incoming rows, replaces the database+import view state,
 *     and reports an audit summary
 */
export const useSheetsBridge = ({
  config,
  questions,
  historicalQuestions,
  showHistory,
  showMessage,
  setStatus,
  setIsProcessing,
  setAppMode,
  setShowExportMenu,
  replaceQuestions,
}) => {
  const handleExportToSheets = useCallback(async () => {
    if (!config.sheetUrl) {
      showMessage("Please enter a Google Apps Script URL in settings.", 5000);
      return;
    }

    const sourceList = showHistory
      ? [...questions, ...historicalQuestions]
      : questions;
    const validQuestions = sourceList.filter(
      (q) => q.status !== QUESTION_STATUS.REJECTED
    );

    if (validQuestions.length === 0) {
      showMessage("No accepted questions to export.", 3000);
      return;
    }

    setIsProcessing(true);
    setStatus("Sending data to Google Sheets...");
    if (setShowExportMenu) setShowExportMenu(false);

    try {
      // Dual Write: Save to Sheets AND Firestore
      await Promise.all([
        saveQuestionsToSheets(config.sheetUrl, validQuestions),
        Promise.all(validQuestions.map((q) => saveQuestionToFirestore(q))),
      ]);

      showMessage(
        `Export launched! Data synced to Sheets and Firestore.`,
        7000
      );
    } catch (e) {
      logError(e, {
        operation: "exportToSheets",
        sheetUrl: config.sheetUrl,
        questionCount: validQuestions.length,
      });
      showMessage(
        `Error connecting to endpoint. Check URL/Console: ${e.message}`,
        10000
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    config.sheetUrl,
    showMessage,
    showHistory,
    questions,
    historicalQuestions,
    setIsProcessing,
    setStatus,
    setShowExportMenu,
  ]);

  const handleLoadFromSheets = useCallback(async () => {
    if (!config.sheetUrl) {
      showMessage("Please enter a Google Apps Script URL first.", 3000);
      return;
    }

    setIsProcessing(true);
    setStatus("Loading from Google Sheets...");
    if (setShowExportMenu) setShowExportMenu(false);

    try {
      const data = await fetchQuestionsFromSheets(config.sheetUrl);
      const loadedQuestions = data.map((q, index) => ({
        // eslint-disable-next-line sonarjs/pseudo-random
        id: Date.now() + index + Math.random(),
        uniqueId: q["Unique ID"] || q.uniqueId || crypto.randomUUID(),
        discipline: q.Discipline || q.discipline || "Imported",
        difficulty: q.Difficulty || q.difficulty || "Easy",
        type: q["Question Type"] || q.Type || q.type || "Multiple Choice",
        question: q.Question || q.question || "",
        options: {
          A: q["Option A"] || q.OptionA || "",
          B: q["Option B"] || q.OptionB || "",
          C: q["Option C"] || q.OptionC || "",
          D: q["Option D"] || q.OptionD || "",
        },
        correct: q.Answer || q.correct || "",
        explanation: q.Explanation || q.explanation || "",
        language: q.Language || q.language || "English",
        sourceUrl: q.SourceFile || q.sourceUrl || "",
        sourceExcerpt: q.sourceExcerpt || "",
        creatorName: q.creator || q.creatorName || "",
        reviewerName: q.reviewer || q.reviewerName || "",
        status: normalizeStatus(q.Status || q.status),
      }));

      // Validate loaded questions and set status (only if status was pending or missing)
      const questionsWithValidation = loadedQuestions.map((q) => {
        const validation = validateQuestion(q);
        // CRITICAL: Only overwrite status if it's pending (likely meaning it was just created or reset)
        // If it's already 'accepted' or 'rejected' in the source, we respect that.
        let finalStatus = q.status;
        if (q.status === QUESTION_STATUS.PENDING) {
          finalStatus = validation.isCriticalFailure
            ? QUESTION_STATUS.REJECTED
            : QUESTION_STATUS.ACCEPTED;
        }

        return {
          ...q,
          _validation: validation,
          status: finalStatus,
        };
      });

      if (replaceQuestions) {
        // Use new semantic action to replace legacy QUESTION_SOURCES.DATABASE and QUESTION_SOURCES.IMPORT sources
        // Note: QUESTION_SOURCES.IMPORT source is used for both sheets and legacy history
        replaceQuestions(questionsWithValidation, QUESTION_SOURCES.DATABASE);
        replaceQuestions(questionsWithValidation, QUESTION_SOURCES.IMPORT);
      }

      setAppMode(APP_MODES.DATABASE);

      const totalRejected = questionsWithValidation.filter(
        (q) => q.status === QUESTION_STATUS.REJECTED
      ).length;
      const totalAccepted = loadedQuestions.length - totalRejected;

      if (totalRejected > 0) {
        showMessage(
          `Import Audit: ${totalAccepted} Success, ${totalRejected} Errors flagged for review.`,
          6000
        );
      } else {
        showMessage(
          `Loaded ${loadedQuestions.length} questions from Database View!`,
          3000
        );
      }
    } catch (e) {
      logError(e, { operation: "loadFromSheets", sheetUrl: config.sheetUrl });
      showMessage(
        `Load Failed: ${e.message}. (Ensure Script Access is set to 'Anyone')`,
        7000
      );
    } finally {
      setIsProcessing(false);
      setStatus("");
    }
  }, [
    config.sheetUrl,
    showMessage,
    setIsProcessing,
    setStatus,
    setShowExportMenu,
    setAppMode,
    replaceQuestions,
  ]);

  return {
    handleExportToSheets,
    handleLoadFromSheets,
  };
};
