import { useState, useMemo, useRef, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";
import Icon from "./Icon";
import MetricsDashboard from "./MetricsDashboard";
import QuestionItem from "./QuestionItem.jsx";
import { exportQuestionsForCritique } from "../utils/externalCritique";
import { logger } from "../utils/logger";
import { getQuestionVariantsForId } from "../services/firebaseQueries";

const DatabaseView = ({
  questions,
  allQuestionsMap = new Map(), // Global map of all loaded questions by uniqueId
  onUpdateQuestion,
  onKickBack,
  onCritique, // NEW: Enable re-critique in database view
  onTranslateSingle, // NEW: Support translation generation
  onSwitchLanguage: onGlobalSwitchLanguage, // NEW: Support global state updates
  addQuestionsToState, // NEW: To inject remote variants into local state
  showMessage,
  filterMode = "all", // Default to 'all' if not provided
  sortBy = "default", // Default to 'default' if not provided
  searchTerm = "", // Search filter from toolbar
  onStartTutorial, // Callback to trigger database tutorial
  isAdmin = false, // Whether current user is admin
  userRole = "user", // NEW
}) => {
  const [, setLoadMenuOpen] = useState(false);
  const loadMenuRef = useRef(null);

  // Export for external critique (Admin only)
  const handleExport = () => {
    logger.log("📤 Exporting questions for external critique...");
    const result = exportQuestionsForCritique(questions);
    showMessage(
      `✅ Exported ${result.count} questions! Prompt copied to clipboard.`,
      5000
    );
  };

  // Auto-start tutorial if not completed (and compliance modals are done)
  useEffect(() => {
    const isCompleted = localStorage.getItem("ue5_tutorial_database_completed");
    const ageVerified = localStorage.getItem("ue5_age_verified");
    const termsAccepted = localStorage.getItem("ue5_terms_accepted");

    // Only start tutorial if compliance modals are complete
    if (!isCompleted && onStartTutorial && ageVerified && termsAccepted) {
      // Small delay to ensure view is rendered
      setTimeout(() => onStartTutorial("database"), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (loadMenuRef.current && !loadMenuRef.current.contains(event.target)) {
        setLoadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate unique question count (by uniqueId)
  const uniqueQuestionCount = useMemo(() => {
    if (!questions) return 0;
    const uniqueIds = new Set(questions.map((q) => q.uniqueId).filter(Boolean));
    return uniqueIds.size;
  }, [questions]);

  const sortedQuestions = useMemo(() => {
    if (!questions) return [];

    // FIRST: Filter to only show ACCEPTED questions in Database view
    // Pending and rejected questions should only appear in Review mode
    // Filter to only show ACCEPTED questions or PENDING translations in Database view
    let filtered = questions.filter(
      (q) => q.status === "accepted" || (q.status === "pending" && q.uniqueId)
    );

    // Deduplicate by uniqueId so each question appears once. Default to the
    // English variant when available; fall back to whatever exists otherwise.
    // (A small number of questions in prod have lost their English base and
    // exist only as translations — those will surface as the first translation
    // we see for that uniqueId.)
    const byUid = new Map();
    for (const q of filtered) {
      const uid = q.uniqueId || q.id;
      if (!uid) continue;
      const existing = byUid.get(uid);
      const lang = q.language || "English";
      const shouldReplace =
        !existing ||
        (lang === "English" && (existing.language || "English") !== "English");
      if (shouldReplace) byUid.set(uid, q);
    }
    filtered = Array.from(byUid.values());

    // Then filter by search term if provided
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((q) => {
        const searchableText = [
          q.question,
          q.discipline,
          q.difficulty,
          q.type,
          q.language,
          q.creatorName,
          q.sourceUrl,
          q.sourceExcerpt,
          ...(q.tags || []),
          q.options?.A,
          q.options?.B,
          q.options?.C,
          q.options?.D,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchableText.includes(term);
      });
    }

    // Then Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => {
          const dateA = a.createdAt || a.id || 0;
          const dateB = b.createdAt || b.id || 0;
          return dateB - dateA; // Descending (newest first)
        });
      case "oldest":
        return sorted.sort((a, b) => {
          const dateA = a.createdAt || a.id || 0;
          const dateB = b.createdAt || b.id || 0;
          return dateA - dateB; // Ascending (oldest first)
        });
      case "language":
        return sorted.sort((a, b) =>
          (a.language || "English").localeCompare(b.language || "English")
        );
      case "discipline":
        return sorted.sort((a, b) =>
          (a.discipline || "").localeCompare(b.discipline || "")
        );
      case "difficulty": {
        const diffOrder = { Easy: 1, Medium: 2, Hard: 3 };
        return sorted.sort(
          (a, b) =>
            (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0)
        );
      }
      case "default":
      default:
        return sorted; // Keep original sheet order
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, sortBy, filterMode, searchTerm]);

  // Local state to track language overrides for specific question cards
  const [languageOverrides, setLanguageOverrides] = useState({});

  // Handle language switch - swap the card's language in-place
  // Uses allQuestionsMap (global, complete) rather than local questionsByIdAndLang
  // so it works even when the target language variant isn't in the windowed view.

  /**
   * Switches the viewed language for a specific question.
   * If the variant is missing from the local state map, it attempts to fetch from Firestore.
   */
  const handleSwitchLanguage = async (
    currentQuestion,
    targetLang,
    force = false
  ) => {
    if ((currentQuestion.language || "English") === targetLang) return;

    if (!currentQuestion.uniqueId) {
      showMessage("❌ Question ID missing, cannot switch language", 3000);
      return;
    }

    logger.log(
      `🌐 Switching language for ${currentQuestion.uniqueId.slice(
        0,
        8
      )} to ${targetLang}...`
    );

    try {
      // 1. Check local state first
      const variants = allQuestionsMap.get(currentQuestion.uniqueId) || [];
      let targetQuestion = variants.find(
        (v) => (v.language || "English") === targetLang
      );

      // 2. If missing, try fetching from Firestore (resolves race conditions with background script)
      if (!targetQuestion) {
        logger.log(
          `🔍 Variant ${targetLang} missing from local state, fetching from Firestore...`
        );
        const remoteVariants = await getQuestionVariantsForId(
          currentQuestion.uniqueId
        );

        if (remoteVariants.length > 0 && addQuestionsToState) {
          // Update global state with newly discovered variants
          addQuestionsToState(remoteVariants);

          // Find the target again in the fresh batch
          targetQuestion = remoteVariants.find(
            (v) => (v.language || "English") === targetLang
          );
        }
      }

      // 3. Final switch logic
      if (force || targetQuestion) {
        setLanguageOverrides((prev) => ({
          ...prev,
          [currentQuestion.uniqueId]: targetLang,
        }));

        // If a global listener exists, notify it
        if (onGlobalSwitchLanguage) {
          onGlobalSwitchLanguage(targetLang);
        }

        if (targetQuestion) {
          logger.log(`✅ Switched to ${targetLang} variant`);
        } else {
          logger.warn(
            `⚠️ Forcing view to ${targetLang} despite no variant data`
          );
        }
      } else {
        logger.warn(`❌ Translation variant not found for ${targetLang}`);
        showMessage(
          `⚠️ Translation for ${targetLang} is not yet available in the database.`,
          4000
        );
      }
    } catch (err) {
      logger.error("Failed to switch language:", err);
      showMessage("❌ Error switching language. Please try again.", 5000);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="flex justify-between items-center bg-blue-900/20 p-4 rounded border border-blue-800/50"
        data-tour="database-search"
      >
        <div
          className="flex items-center gap-4 w-full justify-between"
          data-tour="database-actions"
        >
          <div>
            <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
              <Icon name="database" /> Database View
            </h2>
            <p className="text-xs text-blue-300/70">
              Showing {sortedQuestions.length} of {uniqueQuestionCount}{" "}
              questions
            </p>
          </div>

          {/* Admin-only actions */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                title="Export questions for ChatGPT/Gemini Business critique (FREE!)"
              >
                <Icon name="download" size={14} />
                Export for AI
              </button>
            </div>
          )}
        </div>
      </div>

      <MetricsDashboard questions={questions} />

      <div data-tour="database-grid">
        {sortedQuestions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No questions loaded from database. Click Refresh.
          </div>
        ) : (
          <Virtuoso
            style={{ height: "calc(100vh - 280px)" }}
            data={sortedQuestions}
            itemContent={(i, originalQ) => {
              // Apply language override if the user has clicked a translation flag
              // Use allQuestionsMap to find the variant globally (not limited to windowed view)
              let q = originalQ;
              if (originalQ.uniqueId && languageOverrides[originalQ.uniqueId]) {
                const targetLangOverride =
                  languageOverrides[originalQ.uniqueId];
                if (targetLangOverride !== (originalQ.language || "English")) {
                  const variants =
                    allQuestionsMap.get(originalQ.uniqueId) || [];
                  const overrideQ = variants.find(
                    (v) => (v.language || "English") === targetLangOverride
                  );
                  if (overrideQ) {
                    q = overrideQ;
                  }
                }
              }

              return (
                <div
                  key={q.uniqueId || q.id || i}
                  data-question-index={i}
                  className="opacity-75 hover:opacity-100 transition-all"
                >
                  <QuestionItem
                    q={q}
                    onUpdateStatus={() => {}}
                    onExplain={() => {}}
                    onVariate={() => {}}
                    onCritique={() => onCritique?.(q)}
                    onSwitchLanguage={(lang, force, _newVariant) =>
                      handleSwitchLanguage(originalQ, lang, force === true)
                    }
                    onTranslateSingle={onTranslateSingle}
                    onDelete={() => {}}
                    onUpdateQuestion={onUpdateQuestion}
                    onKickBack={onKickBack}
                    availableVariants={
                      q.uniqueId
                        ? Array.from(allQuestionsMap.get(q.uniqueId) || [])
                        : []
                    }
                    isProcessing={false}
                    appMode="database"
                    showMessage={showMessage}
                    userRole={userRole}
                    isAdmin={isAdmin}
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

export default DatabaseView;
