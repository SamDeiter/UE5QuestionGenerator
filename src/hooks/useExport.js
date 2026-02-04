import { useCallback } from "react";
import { logger } from "../utils/logger";
import { getCSVContent, segmentQuestions } from "../utils/exportUtils";
import {
  saveQuestionsToSheets,
  fetchQuestionsFromSheets,
} from "../services/googleSheets";
import {
  saveQuestionToFirestore,
  getAllQuestionsFromFirestore,
} from "../services/firebase";
import { downloadFile, normalizeStatus } from "../utils/questionHelpers";
import { formatDate } from "../utils/dateHelpers";
import { logError } from "../utils/AppError";
import {
  QUESTION_SOURCES,
  QUESTION_STATUS,
  APP_MODES,
  FIRESTORE_LIMITS,
} from "../utils/constants";
import { validateQuestion } from "../utils/questionValidator";

export const useExport = (
  config,
  questions,
  historicalQuestions,
  uniqueFilteredQuestions,
  allQuestionsMap,
  showHistory,
  showMessage,
  setStatus,
  setIsProcessing,
  setAppMode,
  setShowExportMenu,
  setShowBulkExportModal,
  replaceQuestions // Added: new semantic action
) => {
  const handleExportByGroup = useCallback(() => {
    const sourceList = showHistory
      ? [...questions, ...historicalQuestions]
      : questions;
    const valid = sourceList.filter(
      (q) => q.status !== QUESTION_STATUS.REJECTED
    );

    if (valid.length === 0) {
      setStatus("No accepted questions to export.");
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    const groupedData = segmentQuestions(valid);

    let filesGenerated = 0;
    const exportDate = new Date();
    const datePart = formatDate(exportDate).replace(/-/g, "");

    Object.keys(groupedData).forEach((groupKey) => {
      const groupQuestions = groupedData[groupKey];
      const csvContent = getCSVContent(
        groupQuestions,
        config.creatorName,
        config.reviewerName
      );

      const fileNameParts = groupKey.replace(/ & /g, "_").replace(/ /g, "_");
      const filename = `${fileNameParts}_${datePart}.csv`;

      downloadFile(csvContent, filename);
      filesGenerated++;
    });

    setStatus(`Exported ${filesGenerated} segmented files.`);
    setTimeout(() => setStatus(""), 5000);
    if (setShowExportMenu) setShowExportMenu(false);
  }, [
    showHistory,
    questions,
    historicalQuestions,
    setStatus,
    config.creatorName,
    config.reviewerName,
    setShowExportMenu,
  ]);

  const handleExportCurrentTarget = useCallback(() => {
    const sourceList = showHistory
      ? [...questions, ...historicalQuestions]
      : questions;

    const targetString = config.difficulty;
    const [targetDiff, targetTypeAbbrev] = targetString.split(" ");
    const targetType =
      targetTypeAbbrev === "MC" ? "Multiple Choice" : "True/False";

    const valid = sourceList.filter(
      (q) =>
        q.status !== QUESTION_STATUS.REJECTED &&
        (q.language || "English") === config.language &&
        q.discipline === config.discipline &&
        q.difficulty === targetDiff &&
        q.type === targetType
    );

    if (valid.length === 0) {
      setStatus(
        `No accepted questions found for target: ${config.language} - ${targetString}`
      );
      setTimeout(() => setStatus(""), 3000);
      return;
    }

    const typePart = targetString.replace(/\s/g, "_");
    const disciplinePart = config.discipline.replace(/\s/g, "_");
    const datePart = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const langPart = (config.language || "English").replace(/ /g, "_");

    const csvContent = getCSVContent(
      valid,
      config.creatorName,
      config.reviewerName
    );
    const filename = `${langPart}_${disciplinePart}_${typePart}_${datePart}.csv`;
    downloadFile(csvContent, filename);
    setStatus(`Exported ${valid.length} questions for target ${targetString}`);
    setTimeout(() => setStatus(""), 5000);
    if (setShowExportMenu) setShowExportMenu(false);
  }, [
    showHistory,
    questions,
    historicalQuestions,
    config.difficulty,
    config.language,
    config.discipline,
    setStatus,
    config.creatorName,
    config.reviewerName,
    setShowExportMenu,
  ]);

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

  // PERFORMANCE: Using constants from FIRESTORE_LIMITS for 3-tier loading strategy
  const { INITIAL_LOAD_COUNT, FULL_SYNC_COUNT, BACKGROUND_SYNC_DELAY_MS } =
    FIRESTORE_LIMITS;

  const handleLoadFromFirestore = useCallback(
    async (silent = false, fullSync = false) => {
      setIsProcessing(true);
      if (setShowExportMenu) setShowExportMenu(false);

      const processQuestions = (data) => {
        return data.map((q, index) => ({
          ...q,
          // eslint-disable-next-line sonarjs/pseudo-random
          id: q.id || Date.now() + index + Math.random(),
          status: q.status || QUESTION_STATUS.PENDING,
        }));
      };

      try {
        // TIER 1: Instantly display from IndexedDB cache (0ms perceived load)
        const { getCachedQuestions } =
          await import("../services/questionCache");
        const cachedData = await getCachedQuestions();

        if (cachedData.length > 0) {
          const cachedQuestions = processQuestions(cachedData);
          if (replaceQuestions) {
            replaceQuestions(cachedQuestions, QUESTION_SOURCES.DATABASE);
            replaceQuestions(cachedQuestions, QUESTION_SOURCES.IMPORT);
          }
          logger.log(
            `⚡ TIER 1: Instantly loaded ${cachedQuestions.length} cached questions`
          );
        }

        // TIER 2: Fast initial fetch (100 docs = ~200ms)
        if (!silent) {
          setStatus(cachedData.length > 0 ? "Syncing latest..." : "Loading...");
        }

        const initialLimit = fullSync ? FULL_SYNC_COUNT : INITIAL_LOAD_COUNT;
        const freshData = await getAllQuestionsFromFirestore(
          FULL_SYNC_COUNT,
          true,
          initialLimit
        );
        const freshQuestions = processQuestions(freshData);

        if (replaceQuestions) {
          replaceQuestions(freshQuestions, QUESTION_SOURCES.DATABASE);
          replaceQuestions(freshQuestions, QUESTION_SOURCES.IMPORT);
        }

        logger.log(
          `⚡ TIER 2: Fetched ${freshQuestions.length} questions from Firestore`
        );

        if (!silent) {
          const msg =
            cachedData.length > 0
              ? `Synced ${freshQuestions.length} questions`
              : `Loaded ${freshQuestions.length} questions!`;
          showMessage(msg, 3000);
        }

        // TIER 3: Background full sync (if not already done)
        if (!fullSync && freshData.length >= INITIAL_LOAD_COUNT) {
          // More data likely exists, trigger background sync
          setTimeout(async () => {
            try {
              logger.log("🔄 TIER 3: Starting background full sync...");
              const fullData = await getAllQuestionsFromFirestore(
                FULL_SYNC_COUNT,
                true,
                FULL_SYNC_COUNT
              );
              if (fullData.length > freshData.length) {
                const fullQuestions = processQuestions(fullData);
                if (replaceQuestions) {
                  replaceQuestions(fullQuestions, QUESTION_SOURCES.DATABASE);
                  replaceQuestions(fullQuestions, QUESTION_SOURCES.IMPORT);
                }
                logger.log(
                  `✅ TIER 3: Background synced ${fullQuestions.length} total questions`
                );
              }
            } catch (bgError) {
              logger.warn("Background sync failed:", bgError);
            }
          }, BACKGROUND_SYNC_DELAY_MS);
        }
      } catch (e) {
        logError(e, { operation: "loadFromFirestore", silent, fullSync });
        if (!silent) {
          showMessage(`Load Failed: ${e.message}`, 7000);
        }
      } finally {
        setIsProcessing(false);
        setStatus("");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- FIRESTORE_LIMITS constants are module-level, won't change
    [
      setIsProcessing,
      setStatus,
      setShowExportMenu,
      showMessage,
      replaceQuestions,
    ]
  );

  const handleBulkExport = useCallback(
    async (exportOptions) => {
      const { format, includeRejected, languages, scope, segmentFiles, limit } =
        exportOptions;

      let sourceQuestions = [];
      if (scope === "filtered") {
        const visibleIds = new Set(
          uniqueFilteredQuestions.map((q) => q.uniqueId)
        );
        sourceQuestions = Array.from(allQuestionsMap.values()).flatMap(
          (variants) => variants.filter((v) => visibleIds.has(v.uniqueId))
        );
      } else {
        sourceQuestions = Array.from(allQuestionsMap.values()).flat();
      }

      let questionsToExport = sourceQuestions.filter((q) => {
        const langMatch = languages.includes(q.language || "English");
        const statusMatch =
          includeRejected || q.status !== QUESTION_STATUS.REJECTED;
        return langMatch && statusMatch;
      });

      if (limit && limit > 0) {
        questionsToExport = questionsToExport.slice(0, limit);
      }

      if (questionsToExport.length === 0) {
        showMessage("No questions to export with selected options.", 3000);
        return;
      }

      if (format === "sheets") {
        if (!config.sheetUrl) {
          showMessage(
            "Please enter a Google Apps Script URL in settings.",
            5000
          );
          return;
        }
        setIsProcessing(true);
        setStatus("Sending data to Google Sheets...");
        try {
          await saveQuestionsToSheets(config.sheetUrl, questionsToExport);
          showMessage(`Export launched! Check new tab for status.`, 5000);
        } catch (e) {
          logError(e, {
            operation: "bulkExportToSheets",
            questionCount: questionsToExport.length,
          });
          showMessage(`Error: ${e.message}`, 5000);
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      if (segmentFiles && format === "csv") {
        const groupedData = questionsToExport.reduce((acc, q) => {
          const typeAbbrev = q.type === "True/False" ? "T/F" : "MC";
          const key = `${q.language || "English"}_${q.discipline}_${
            q.difficulty
          }_${typeAbbrev}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(q);
          return acc;
        }, {});

        let filesGenerated = 0;
        const datePart = formatDate(new Date()).replace(/-/g, "");

        Object.keys(groupedData).forEach((groupKey) => {
          const groupQuestions = groupedData[groupKey];
          const csvContent = getCSVContent(
            groupQuestions,
            config.creatorName,
            config.reviewerName
          );
          const fileNameParts = groupKey
            .replace(/ & /g, "_")
            .replace(/ /g, "_");
          const filename = `${fileNameParts}_${datePart}.csv`;
          downloadFile(csvContent, filename);
          filesGenerated++;
        });
        showMessage(`Exported ${filesGenerated} segmented files.`, 4000);
        return;
      }

      if (format === "csv") {
        const csvContent = getCSVContent(
          questionsToExport,
          config.creatorName,
          config.reviewerName
        );
        downloadFile(csvContent, `bulk_export_${Date.now()}.csv`, "text/csv");
      } else if (format === "json") {
        downloadFile(
          JSON.stringify(questionsToExport, null, 2),
          `bulk_export_${Date.now()}.json`,
          "application/json"
        );
      } else if (format === "markdown") {
        const md = questionsToExport
          .map((q) => {
            return `## ${q.question}\n\n**Difficulty:** ${
              q.difficulty
            } | **Type:** ${q.type} | **Language:** ${
              q.language
            }\n\n**Options:**\n- A: ${q.options?.A}\n- B: ${q.options?.B}\n${
              q.options?.C ? `- C: ${q.options.C}\n` : ""
            }${q.options?.D ? `- D: ${q.options.D}\n` : ""}\n**Correct:** ${
              q.correct
            }\n\n---\n`;
          })
          .join("\n");
        downloadFile(md, `bulk_export_${Date.now()}.md`, "text/markdown");
      }

      showMessage(
        `Exported ${
          questionsToExport.length
        } questions as ${format.toUpperCase()}.`,
        4000
      );
    },
    [
      uniqueFilteredQuestions,
      allQuestionsMap,
      showMessage,
      config.sheetUrl,
      setIsProcessing,
      setStatus,
      config.creatorName,
      config.reviewerName,
    ]
  );

  return {
    handleExportByGroup,
    handleExportCurrentTarget,
    handleExportToSheets,
    handleLoadFromSheets,
    handleLoadFromFirestore,
    handleBulkExport,
  };
};
