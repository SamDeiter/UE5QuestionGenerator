import React, { useState, useMemo } from "react";
import Icon from "./Icon";
import QuestionItem from "./QuestionItem";
import { Virtuoso } from "react-virtuoso";
import { LANGUAGE_FLAGS } from "../utils/constants";
import { useBulkTranslation } from "../hooks/useBulkTranslation";
import { invalidateQuestionsCache } from "../services/firebaseQueries";

const TranslationManagementView = ({
  questions,
  allQuestionsMap,
  _translationMap,
  searchTerm = "",
  filterMode = "all",
  onRefresh,
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
  const [isSyncing, setIsSyncing] = useState(false);

  const { handleBulkTranslate, isBulkProcessing, progress } =
    useBulkTranslation(onTranslateSingle, showMessage, onRefresh);

  // Force a full cache-busting re-sync from Firestore so bulk-translated flags appear
  const handleForceResync = async () => {
    setIsSyncing(true);
    try {
      await invalidateQuestionsCache();
      if (onRefresh) await onRefresh(false, true); // silent=false, fullSync=true
      showMessage(
        "✅ Re-synced from Firestore. Translation flags updated.",
        4000
      );
    } catch (e) {
      showMessage(`Re-sync failed: ${e.message}`, 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter logic: Only show English questions (base variants) that are Accepted
  const eligibleQuestions = useMemo(() => {
    return questions.filter(
      (q) => (q.language || "English") === "English" && q.status === "accepted"
    );
  }, [questions]);

  // Sub-filter logic
  const filteredList = useMemo(() => {
    let list = [];

    // 1. Apply primary view filter
    if (viewFilter === "all") {
      list = questions.filter((q) => {
        const isEnglish = (q.language || "English") === "English";
        return isEnglish;
      });
    } else if (viewFilter === "all-accepted") {
      list = eligibleQuestions;
    } else {
      // Missing (Default): Accepted English questions lacking targetLang variant
      list = eligibleQuestions.filter((q) => {
        const variants = allQuestionsMap.get(q.uniqueId) || [];
        const hasTarget = Array.from(variants).some(
          (v) => (v.language || "English") === targetLang
        );
        return !hasTarget;
      });
    }

    // 2. Apply Global Search Term
    if (searchTerm && searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (q) =>
          (q.question && q.question.toLowerCase().includes(term)) ||
          (q.explanation && q.explanation.toLowerCase().includes(term)) ||
          (q.uniqueId && q.uniqueId.toLowerCase().includes(term))
      );
    }

    return list;
  }, [
    eligibleQuestions,
    questions,
    viewFilter,
    targetLang,
    allQuestionsMap,
    searchTerm,
  ]);

  const handleBulkAction = () => {
    handleBulkTranslate(filteredList, targetLang);
  };

  // Local state to track language overrides for specific question cards
  const [languageOverrides, setLanguageOverrides] = useState({});
  // Cache of newly translated variants to ensure immediate UI feedback
  const [sessionVariantsCache, setSessionVariantsCache] = useState({});

  // Handle language switch - swap the card's language in-place
  const handleLocalSwitchLanguage = (
    currentQuestion,
    selectedLang,
    force = false,
    newVariant = null
  ) => {
    if (!currentQuestion.uniqueId) {
      showMessage(`Cannot switch: Question has no unique ID.`);
      return;
    }

    // If a new variant was just generated, cache it immediately
    if (newVariant) {
      setSessionVariantsCache((prev) => {
        const existing = prev[currentQuestion.uniqueId] || [];
        // Only add if not already in cache to avoid duplicates
        if (existing.some((v) => v.language === newVariant.language))
          return prev;
        return {
          ...prev,
          [currentQuestion.uniqueId]: [...existing, newVariant],
        };
      });
    }

    // Ensure the variant exists
    const variants = allQuestionsMap.get(currentQuestion.uniqueId) || [];
    const cachedVariants = sessionVariantsCache[currentQuestion.uniqueId] || [];
    const allKnownVariants = [...Array.from(variants), ...cachedVariants];

    const targetVariant =
      newVariant ||
      allKnownVariants.find((v) => (v.language || "English") === selectedLang);

    if (force || targetVariant) {
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
          {/* Force Re-sync button: busts IndexedDB + memory cache, re-fetches all docs */}
          <button
            onClick={handleForceResync}
            disabled={isSyncing || isBulkProcessing || isProcessing}
            title="Clear cache and reload all translation data from Firestore"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 hover:border-slate-500 transition-all"
          >
            <Icon
              name={isSyncing ? "loader" : "refresh-cw"}
              size={14}
              className={isSyncing ? "animate-spin text-indigo-400" : ""}
            />
            {isSyncing ? "Syncing..." : "Force Re-sync"}
          </button>
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
              const variants = allQuestionsMap.get(originalQ.uniqueId) || [];
              const cachedVariants =
                sessionVariantsCache[originalQ.uniqueId] || [];
              const mergedVariants = [
                ...Array.from(variants),
                ...cachedVariants,
              ];

              if (originalQ.uniqueId && languageOverrides[originalQ.uniqueId]) {
                const overrideLang = languageOverrides[originalQ.uniqueId];
                if (overrideLang !== (originalQ.language || "English")) {
                  const overrideQ = mergedVariants.find(
                    (v) => (v.language || "English") === overrideLang
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
                    onSwitchLanguage={(lang, force, newVariant) =>
                      handleLocalSwitchLanguage(
                        originalQ,
                        lang,
                        force,
                        newVariant
                      )
                    }
                    onDelete={onDelete}
                    onUpdateQuestion={onUpdateQuestion}
                    availableVariants={mergedVariants}
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
