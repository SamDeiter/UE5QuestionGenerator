import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Icon from "./Icon";
import MetricsDashboard from "./MetricsDashboard";
import QuestionItem from "./QuestionItem.jsx";
import { exportQuestionsForCritique } from "../utils/externalCritique";
import { logger } from "../utils/logger";

// PERFORMANCE: Number of items to render initially and load per batch
const INITIAL_RENDER_COUNT = 50;
const LOAD_MORE_COUNT = 50;

const DatabaseView = ({
  questions,
  onUpdateQuestion,
  onKickBack,
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

  // PERFORMANCE: Track how many items to render (windowed rendering)
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const loaderRef = useRef(null);

  // Export for external critique (Admin only)
  const handleExport = () => {
    logger.log("📤 Exporting questions for external critique...");
    const result = exportQuestionsForCritique(questions);
    showMessage(
      `✅ Exported ${result.count} questions! Prompt copied to clipboard.`,
      5000
    );
  };

  // OLD Batch Critique handler (disabled)
  /*
  const _handleBatchCritique = async () => {
    if (!window.confirm('⚠️ WARNING: This will critique ALL uncritiqued questions (~1700 API calls).\n\nThis will:\n- Take 1-2 hours\n- Use significant API quota\n- Cost money on paid plans\n\nContinue?')) {
      return;
    }
    
    // Get API key
    const config = JSON.parse(localStorage.getItem('ue5_gen_config') || '{}');
    const apiKey = config.geminiApiKey;
    
    if (!apiKey) {
      showMessage('❌ No API key configured. Please set your Gemini API key in settings.', 5000);
      return;
    }
    
    setIsBatchCritiquing(true);
    setBatchProgress({ processed: 0, total: 0, percent: 0 });
    
    try {
      await batchCritiqueAllQuestions(
        apiKey,
        // Progress callback
        (progress) => {
          setBatchProgress(progress);
          logger.log(`📊 Progress: ${progress.processed}/${progress.total} (${progress.percent}%)`);
        },
        // Complete callback
        (result) => {
          if (result.success) {
            showMessage(`✅ Batch critique complete! Processed ${result.processed} questions`, 5000);
            setTimeout(() => window.location.reload(), 2000);
          } else {
            showMessage(`❌ Batch critique failed: ${result.error}`, 5000);
          }
        }
      );
    } catch (error) {
      showMessage(`❌ Batch critique error: ${error.message}`, 5000);
    } finally {
      setIsBatchCritiquing(false);
      setBatchProgress(null);
    }
  };
  */

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
    let filtered = questions.filter((q) => q.status === "accepted");

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
        <div
          className="flex items-center gap-4 w-full justify-between"
          data-tour="database-actions"
        >
          <div>
            <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
              <Icon name="database" /> Database View
            </h2>
            <p className="text-xs text-blue-300/70">
              Showing {visibleQuestions.length} of {uniqueQuestionCount}{" "}
              questions
              {hasMore && ` • scroll for more`}
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
                  userRole={userRole}
                  isAdmin={isAdmin}
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
