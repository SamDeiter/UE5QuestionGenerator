import React, { useState, useMemo } from "react";
import Icon from "./Icon";
import QuestionItem from "./QuestionItem";
import { Virtuoso } from "react-virtuoso";
import { LANGUAGE_FLAGS } from "../utils/constants";
import { useBulkTranslation } from "../hooks/useBulkTranslation";

const TranslationManagementView = ({
  questions,
  allQuestionsMap,
  _translationMap,
  onTranslateSingle,
  onSwitchLanguage,
  onUpdateStatus,
  onDelete,
  onUpdateQuestion,
  isProcessing,
  showMessage,
  userRole,
}) => {
  const [targetLang, setTargetLang] = useState("Japanese");
  const [viewFilter, setViewFilter] = useState("missing"); // 'missing', 'all-accepted', or 'all'

  const { handleBulkTranslate, isBulkProcessing, progress } =
    useBulkTranslation(onTranslateSingle, showMessage);

  // Filter logic: Only show English questions (base variants) that are Accepted
  const eligibleQuestions = useMemo(() => {
    return questions.filter(
      (q) => (q.language || "English") === "English" && q.status === "accepted"
    );
  }, [questions]);

  // Sub-filter logic
  const filteredList = useMemo(() => {
    // 1. Everything: All English base questions (regardless of status)
    if (viewFilter === "all") {
      return questions.filter((q) => {
        const isEnglish = (q.language || "English") === "English";
        return isEnglish;
      });
    }

    // 2. Accepted: Only English base questions that are 'accepted'
    if (viewFilter === "all-accepted") {
      return eligibleQuestions;
    }

    // 3. Missing (Default): Accepted English questions lacking targetLang variant
    return eligibleQuestions.filter((q) => {
      const variants = allQuestionsMap.get(q.uniqueId) || [];
      return !variants.some((v) => (v.language || "English") === targetLang);
    });
  }, [eligibleQuestions, questions, viewFilter, targetLang, allQuestionsMap]);

  const handleBulkAction = () => {
    handleBulkTranslate(filteredList, targetLang);
  };

  // Local state to track language overrides for specific question cards
  const [languageOverrides, setLanguageOverrides] = useState({});

  // Handle language switch - swap the card's language in-place
  const handleLocalSwitchLanguage = (currentQuestion, selectedLang) => {
    if (!currentQuestion.uniqueId) {
      showMessage(`Cannot switch: Question has no unique ID.`);
      return;
    }

    // Ensure the variant exists
    const variants = allQuestionsMap.get(currentQuestion.uniqueId) || [];
    const targetVariant = Array.from(variants).find(
      (v) => (v.language || "English") === selectedLang
    );

    if (targetVariant) {
      setLanguageOverrides((prev) => ({
        ...prev,
        [currentQuestion.uniqueId]: selectedLang,
      }));
    } else {
      showMessage(`${selectedLang} version not found for this question.`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Action Bar */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-400">Target:</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {Object.keys(LANGUAGE_FLAGS)
                .filter((l) => l !== "English")
                .map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-400">View:</span>
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setViewFilter("missing")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  viewFilter === "missing"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Missing
              </button>
              <button
                onClick={() => setViewFilter("all-accepted")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  viewFilter === "all-accepted"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Accepted
              </button>
              <button
                onClick={() => setViewFilter("all")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  viewFilter === "all"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Everything
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isBulkProcessing ? (
            <div className="flex items-center gap-3 bg-indigo-950/30 border border-indigo-500/50 px-4 py-2 rounded-xl">
              <Icon
                name="loader"
                size={18}
                className="animate-spin text-indigo-400"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-indigo-300">
                  Translating... {progress.current} / {progress.total}
                </span>
                <div className="w-32 h-1 bg-slate-800 rounded-full mt-1">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleBulkAction}
              disabled={filteredList.length === 0 || isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
            >
              <Icon name="languages" size={18} />
              Bulk Translate {filteredList.length} Items to {targetLang}
            </button>
          )}
        </div>
      </div>

      {/* List Header/Stats */}
      <div className="px-6 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <span className="text-xs text-slate-500">
          Showing{" "}
          <span className="text-indigo-400 font-bold">
            {filteredList.length}
          </span>{" "}
          {viewFilter === "all"
            ? "total database items"
            : "accepted English questions"}
          {viewFilter === "missing"
            ? ` missing ${targetLang} translations`
            : ""}
        </span>
      </div>

      {/* Virtualized List */}
      <div className="flex-1 overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600">
            <Icon
              name="check-circle"
              size={48}
              className="mb-4 text-green-900/40"
            />
            <p className="font-medium text-slate-500">
              {viewFilter === "missing"
                ? `All accepted questions have been translated to ${targetLang}!`
                : "No accepted questions found."}
            </p>
          </div>
        ) : (
          <Virtuoso
            style={{ height: "100%" }}
            data={filteredList}
            itemContent={(index, originalQ) => {
              // Apply language override if the user has clicked a translation flag
              let q = originalQ;
              if (originalQ.uniqueId && languageOverrides[originalQ.uniqueId]) {
                const targetLang = languageOverrides[originalQ.uniqueId];
                if (targetLang !== (originalQ.language || "English")) {
                  const variants =
                    allQuestionsMap.get(originalQ.uniqueId) || [];
                  const overrideQ = Array.from(variants).find(
                    (v) => (v.language || "English") === targetLang
                  );
                  if (overrideQ) {
                    q = overrideQ;
                  }
                }
              }

              return (
                <div className="px-6 py-4">
                  <QuestionItem
                    key={q.uniqueId || q.id}
                    q={q}
                    onUpdateStatus={onUpdateStatus}
                    onTranslateSingle={onTranslateSingle}
                    onSwitchLanguage={(lang) =>
                      handleLocalSwitchLanguage(originalQ, lang)
                    }
                    onDelete={onDelete}
                    onUpdateQuestion={onUpdateQuestion}
                    availableVariants={Array.from(
                      allQuestionsMap.get(q.uniqueId) || []
                    )}
                    isProcessing={
                      isProcessing ||
                      (isBulkProcessing && index === progress.current - 1)
                    }
                    appMode="translate"
                    showMessage={showMessage}
                    userRole={userRole}
                  />
                </div>
              );
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TranslationManagementView;
