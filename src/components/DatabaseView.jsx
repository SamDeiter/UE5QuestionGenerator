import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Icon from "./Icon";
import MetricsDashboard from "./MetricsDashboard";
import QuestionItem from "./QuestionItem";
import { migrateFirestoreScores } from "../utils/migrateFirestoreScores";

// PERFORMANCE: Number of items to render initially and load per batch
const INITIAL_RENDER_COUNT = 50;
const LOAD_MORE_COUNT = 50;

const DatabaseView = ({
  questions,
  _sheetUrl,
  _onLoad,
  _onLoadFirestore,
  _onClearView,
  _onHardReset,
  onUpdateQuestion,
  onKickBack,
  _isProcessing,
  showMessage,
  filterMode = "all", // Default to 'all' if not provided
  sortBy = "default", // Default to 'default' if not provided
  onStartTutorial, // Callback to trigger database tutorial
}) => {
  const [_isSyncing, _setIsSyncing] = useState(false);
  const [_syncProgress, _setSyncProgress] = useState(0);
  const [_loadMenuOpen, setLoadMenuOpen] = useState(false);
  const loadMenuRef = useRef(null);

  // PERFORMANCE: Track how many items to render (windowed rendering)
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const [isMigrating, setIsMigrating] = useState(false);
  const loaderRef = useRef(null);
  
  // Migration handler
  const handleMigrateScores = async () => {
    if (!window.confirm('This will estimate improved scores for all questions with critiques. Continue?')) {
      return;
    }
    setIsMigrating(true);
    try {
      const result = await migrateFirestoreScores(showMessage);
      if (result.success) {
        // Reload questions to see updated data
        window.location.reload();
      }
    } catch (error) {
      showMessage(`Migration error: ${error.message}`, 5000);
    } finally {
      setIsMigrating(false);
    }
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

  // Reset visible count when questions change
  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT);
  }, [questions]);

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

  const sortedQuestions = useMemo(() => {
    if (!questions) return [];

    // Database mode shows ALL questions - no status filtering
    const filtered = questions;

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
  }, [questions, sortBy, filterMode]);

  // PERFORMANCE: Only render visible items
  const visibleQuestions = useMemo(() => {
    return sortedQuestions.slice(0, visibleCount);
  }, [sortedQuestions, visibleCount]);

  const hasMore = visibleCount < sortedQuestions.length;

  // Load more items when scrolling near bottom
  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((prev) =>
        Math.min(prev + LOAD_MORE_COUNT, sortedQuestions.length)
      );
    }
  }, [hasMore, sortedQuestions.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // Calculate available languages for each uniqueId
  const translationMap = useMemo(() => {
    if (!questions) return new Map();
    const map = new Map();
    questions.forEach((q) => {
      if (!q.uniqueId) return;
      if (!map.has(q.uniqueId)) {
        map.set(q.uniqueId, new Set());
      }
      map.get(q.uniqueId).add(q.language || "English");
    });
    return map;
  }, [questions]);

  // Map uniqueId+language -> question for quick lookup
  const questionsByIdAndLang = useMemo(() => {
    if (!questions) return new Map();
    const map = new Map();
    questions.forEach((q) => {
      if (!q.uniqueId) return;
      const key = `${q.uniqueId}::${q.language || "English"}`;
      map.set(key, q);
    });
    return map;
  }, [questions]);

  // Handle language switch - find and scroll to the matching translation
  const handleSwitchLanguage = (currentQuestion, targetLang) => {
    if (!currentQuestion.uniqueId) {
      showMessage(
        `Cannot switch: Question has no unique ID for linking translations.`
      );
      return;
    }

    const key = `${currentQuestion.uniqueId}::${targetLang}`;
    const targetQuestion = questionsByIdAndLang.get(key);

    if (targetQuestion) {
      // Find the question in the DOM and scroll to it
      const index = sortedQuestions.findIndex(
        (q) => q.id === targetQuestion.id
      );
      if (index !== -1) {
        // Ensure the question is rendered by expanding visible count if needed
        if (index >= visibleCount) {
          setVisibleCount(index + 10); // Load up to that question plus a few more
        }

        // Wait for render then scroll
        setTimeout(() => {
          const element = document.querySelector(
            `[data-question-index="${index}"]`
          );
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-2", "ring-green-500");
            setTimeout(
              () => element.classList.remove("ring-2", "ring-green-500"),
              2000
            );
          }
        }, 100);
        showMessage(`Scrolled to ${targetLang} version.`);
      }
    } else {
      showMessage(
        `${targetLang} version not found in current view. Try using "Sort by Language" to find it.`
      );
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="flex justify-between items-center bg-blue-900/20 p-4 rounded border border-blue-800/50"
        data-tour="database-search"
      >
        <div className="flex items-center gap-4 w-full justify-between" data-tour="database-actions">
          <div>
            <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
              <Icon name="database" /> Database View
            </h2>
            <p className="text-xs text-blue-300/70">
              Showing {visibleQuestions.length} of {sortedQuestions.length}{" "}
              records
              {hasMore && ` (scroll for more)`}
            </p>
          </div>
          
          <button
            onClick={handleMigrateScores}
            disabled={isMigrating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
            title="Add estimated improved scores to all questions with critiques"
          >
            <Icon name="zap" size={14} />
            {isMigrating ? "Migrating..." : "Migrate Scores"}
          </button>
        </div>
      </div>

      <MetricsDashboard questions={questions} />

      <div data-tour="database-grid">
        {sortedQuestions.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            No questions loaded from database. Click Refresh.
          </div>
        ) : (
          <>
            {visibleQuestions.map((q, i) => (
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
                  onCritique={() => {}}
                  onTranslateSingle={() => {}}
                  onSwitchLanguage={(targetLang) =>
                    handleSwitchLanguage(q, targetLang)
                  }
                  onDelete={() => {}}
                  onUpdateQuestion={onUpdateQuestion}
                  onKickBack={onKickBack}
                  availableLanguages={translationMap.get(q.uniqueId)}
                  isProcessing={false}
                  appMode="database"
                  showMessage={showMessage}
                />
              </div>
            ))}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div
                ref={loaderRef}
                className="flex items-center justify-center py-8 text-slate-500"
              >
                <Icon name="loader" className="animate-spin mr-2" size={16} />
                <span className="text-sm">Loading more questions...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DatabaseView;
