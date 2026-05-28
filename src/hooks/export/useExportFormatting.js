import { useCallback } from "react";
import { getCSVContent, segmentQuestions } from "../../utils/exportUtils";
import { saveQuestionsToSheets } from "../../services/googleSheets";
import { downloadFile } from "../../utils/questionHelpers";
import { formatDate } from "../../utils/dateHelpers";
import { logError } from "../../utils/AppError";
import { QUESTION_STATUS } from "../../utils/constants";

/**
 * useExportFormatting — CSV / JSON / Markdown generation + file downloads.
 *
 * Three handlers:
 *   - handleExportByGroup: segments questions by metadata and writes one
 *     CSV per group
 *   - handleExportCurrentTarget: filters by language/discipline/difficulty/
 *     type and writes a single CSV for the user's current target
 *   - handleBulkExport: scope/language/status filtering with output as
 *     CSV / JSON / Markdown / segmented CSV; also routes to Google Sheets
 *     when `format === "sheets"` (kept here so the bulk-export modal has
 *     a single entry point regardless of destination)
 */
export const useExportFormatting = ({
  config,
  questions,
  historicalQuestions,
  uniqueFilteredQuestions,
  allQuestionsMap,
  showHistory,
  showMessage,
  setStatus,
  setIsProcessing,
  setShowExportMenu,
  isAdmin = false,
}) => {
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

  const handleBulkExport = useCallback(
    async (exportOptions) => {
      // Defense-in-depth: toolbar buttons and the keyboard shortcut already
      // gate on isAdmin; this is the last line before tens of thousands of
      // rows leave the client.
      if (!isAdmin) {
        showMessage("Bulk export is restricted to administrators.", 4000);
        return;
      }

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
      isAdmin,
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
    handleBulkExport,
  };
};
