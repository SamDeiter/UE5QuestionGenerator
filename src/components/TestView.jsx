/* eslint-disable sonarjs/pseudo-random */
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import QuizPreview from "./QuizPreview";
import ScormExportModal from "./ScormExportModal";
import BatchScormExportModal from "./BatchScormExportModal";
import QuizConfigForm from "./TestView/QuizConfigForm";
import { generateMockQuestions } from "../utils/mockQuestionGenerator";
import { useMessage } from "../contexts/MessageContext";

/**
 * TestView - Admin view for configuring, previewing, and exporting quizzes
 * Allows admins to select approved questions and create assessments
 */
const TestView = ({ questions = [], config: _appConfig, isAdmin }) => {
  const { showMessage } = useMessage();
  // Quiz configuration state
  const [quizConfig, setQuizConfig] = useState({
    title: "UE5 Knowledge Assessment",
    description: "Test your Unreal Engine 5 knowledge",
    passingScore: 80,
    timeLimit: 30, // minutes
    questionCount: 10,
    shuffleQuestions: true,
    showFeedback: "end", // "immediate" or "end"
    adaptiveDifficulty: true, // Adjust difficulty based on performance
  });

  // Filter state
  // language defaults to "" = all languages, so the Preview/Export counts
  // reflect every accepted question across the database. Users can narrow
  // to a single language via the dropdown.
  const [filters, setFilters] = useState({
    disciplines: [], // Empty array = all disciplines
    language: "",
  });
  const [disciplineDropdownOpen, setDisciplineDropdownOpen] = useState(false);
  const disciplineDropdownRef = useRef(null);

  // Close the discipline dropdown on outside click or Escape, matching
  // standard popover UX (clicking the panel itself stays open).
  useEffect(() => {
    if (!disciplineDropdownOpen) return undefined;
    const handlePointer = (e) => {
      if (
        disciplineDropdownRef.current &&
        !disciplineDropdownRef.current.contains(e.target)
      ) {
        setDisciplineDropdownOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setDisciplineDropdownOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [disciplineDropdownOpen]);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());
  const [mockQuestions, setMockQuestions] = useState([]);
  const [activeQuizQuestions, setActiveQuizQuestions] = useState([]); // Stabilized questions for preview

  const handleGenerateMockData = () => {
    const mocks = generateMockQuestions();
    setMockQuestions(mocks);
    if (showMessage)
      showMessage(`Generated ${mocks.length} mock questions`, 3000);
  };

  const handleClearMockData = () => {
    setMockQuestions([]);
    setSelectedQuestionIds(new Set());
    if (showMessage) showMessage("Mock data cleared", 2000);
  };

  // Get only approved questions (real + mock)
  const approvedQuestions = useMemo(() => {
    const realApproved = questions.filter((q) => q.status === "accepted");
    return [...realApproved, ...mockQuestions];
  }, [questions, mockQuestions]);

  // Filter approved questions based on criteria
  const filteredQuestions = useMemo(() => {
    return approvedQuestions.filter((q) => {
      const disciplineMatch =
        filters.disciplines.length === 0 ||
        filters.disciplines.includes(q.discipline);
      const questionLang = q.language || "English";
      const languageMatch =
        !filters.language || questionLang === filters.language;
      return disciplineMatch && languageMatch;
    });
  }, [approvedQuestions, filters]);

  const toggleDiscipline = (d) => {
    setFilters((prev) => ({
      ...prev,
      disciplines: prev.disciplines.includes(d)
        ? prev.disciplines.filter((x) => x !== d)
        : [...prev.disciplines, d],
    }));
  };

  const clearDisciplines = () =>
    setFilters((prev) => ({ ...prev, disciplines: [] }));
  const selectAllDisciplines = () =>
    setFilters((prev) => ({ ...prev, disciplines: [...disciplines] }));

  // Get unique disciplines for filter dropdown
  const disciplines = useMemo(() => {
    const set = new Set(approvedQuestions.map((q) => q.discipline));
    return [...set].filter(Boolean).sort();
  }, [approvedQuestions]);

  // Count unique accepted questions per discipline. Dedup by uniqueId so a
  // question with multiple language variants counts once, matching the
  // Review tab's "Accepted N" semantics.
  const acceptedCountsByDiscipline = useMemo(() => {
    const idsByDiscipline = new Map();
    for (const q of approvedQuestions) {
      if (!q.discipline) continue;
      if (!idsByDiscipline.has(q.discipline)) {
        idsByDiscipline.set(q.discipline, new Set());
      }
      idsByDiscipline.get(q.discipline).add(q.uniqueId || q.id);
    }
    const counts = {};
    for (const [discipline, ids] of idsByDiscipline) {
      counts[discipline] = ids.size;
    }
    return counts;
  }, [approvedQuestions]);

  // Get unique languages for filter dropdown
  const languages = useMemo(() => {
    const set = new Set(approvedQuestions.map((q) => q.language || "English"));
    return [...set].filter(Boolean).sort();
  }, [approvedQuestions]);

  // Get selected questions for preview/export
  const selectedQuestions = useMemo(() => {
    if (selectedQuestionIds.size === 0) {
      // If none selected, use filtered questions up to questionCount
      // Shuffle questions for quiz variety (non-security random)

      const shuffled = quizConfig.shuffleQuestions
        ? [...filteredQuestions].sort(() => Math.random() - 0.5)
        : filteredQuestions;
      return shuffled.slice(0, quizConfig.questionCount);
    }
    return filteredQuestions.filter((q) =>
      selectedQuestionIds.has(q.id || q.uniqueId)
    );
  }, [filteredQuestions, selectedQuestionIds, quizConfig]);

  // Toggle question selection
  const toggleQuestion = (q) => {
    const id = q.id || q.uniqueId;
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(
        new Set(filteredQuestions.map((q) => q.id || q.uniqueId))
      );
    }
  };

  // Snapshot questions when starting preview to prevent re-shuffling during quiz
  const handleStartPreview = () => {
    setActiveQuizQuestions([...selectedQuestions]);
    setShowPreview(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="text-center">
          <Icon name="lock" size={48} className="mx-auto mb-4 opacity-50" />
          <p>Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Icon name="clipboard-list" size={28} />
          Test Configuration
        </h1>
        <div className="flex justify-between items-center mt-2">
          <p className="text-slate-400">
            Configure and preview quizzes from approved questions
          </p>
          <div className="flex gap-2">
            {mockQuestions.length === 0 && (
              <button
                onClick={handleGenerateMockData}
                className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-900/50 bg-indigo-900/20 px-3 py-1 rounded flex items-center gap-1"
              >
                <Icon name="wand" size={12} />
                Generate Mock Data
              </button>
            )}
            {mockQuestions.length > 0 && (
              <button
                onClick={handleClearMockData}
                className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 bg-red-900/20 px-3 py-1 rounded"
              >
                Clear Mock Data ({mockQuestions.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quiz Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quiz Config Card */}
          <QuizConfigForm
            quizConfig={quizConfig}
            onChange={setQuizConfig}
            maxQuestionCount={filteredQuestions.length}
          />

          {/* Filter Card */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Icon name="filter" size={18} />
              Question Filters
            </h2>

            {/* Disciplines (multi-select) */}
            <div className="mb-4 relative" ref={disciplineDropdownRef}>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Disciplines
              </label>
              <button
                type="button"
                onClick={() => setDisciplineDropdownOpen((o) => !o)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white flex items-center justify-between hover:border-slate-500 transition-colors"
              >
                <span className="truncate text-left">
                  {(() => {
                    if (filters.disciplines.length === 0) {
                      return "All Disciplines";
                    }
                    if (filters.disciplines.length === 1) {
                      return filters.disciplines[0];
                    }
                    return `${filters.disciplines.length} selected`;
                  })()}
                </span>
                <Icon
                  name={disciplineDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  className="text-slate-400 ml-2"
                />
              </button>
              {disciplineDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-slate-600 rounded shadow-xl max-h-64 overflow-y-auto">
                  <div className="flex justify-between gap-2 px-3 py-2 border-b border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={selectAllDisciplines}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearDisciplines}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Clear
                    </button>
                  </div>
                  {disciplines.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-500">
                      No disciplines available
                    </div>
                  ) : (
                    disciplines.map((d) => {
                      const checked = filters.disciplines.includes(d);
                      return (
                        <label
                          key={d}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDiscipline(d)}
                            className="w-4 h-4 accent-blue-500"
                          />
                          <span className="text-sm text-slate-200 flex-1">
                            {d}
                          </span>
                          <span className="text-xs text-slate-500 tabular-nums">
                            {acceptedCountsByDiscipline[d] ?? 0}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Language */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Language
              </label>
              <select
                value={filters.language}
                onChange={(e) =>
                  setFilters({ ...filters, language: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              >
                <option value="">All Languages</option>
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleStartPreview}
              disabled={selectedQuestions.length === 0}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="play" size={18} />
              Preview Quiz ({selectedQuestions.length} questions)
            </button>

            <button
              onClick={() => setShowExport(true)}
              disabled={selectedQuestions.length === 0}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="download" size={18} />
              Export SCORM Package
            </button>

            <button
              onClick={() => setShowBatchExport(true)}
              disabled={approvedQuestions.length === 0}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="archive" size={18} />
              Export All by Language &amp; Discipline
            </button>
          </div>
        </div>

        {/* Right: Question List */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Available Questions ({filteredQuestions.length})
              </h2>
              <button
                onClick={toggleSelectAll}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {selectedQuestionIds.size === filteredQuestions.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            <div className="h-[calc(100vh-280px)] min-h-[600px] overflow-y-auto">
              {filteredQuestions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Icon
                    name="inbox"
                    size={48}
                    className="mx-auto mb-4 opacity-50"
                  />
                  <p>No approved questions match your filters</p>
                  {filters.disciplines.length === 0 && (
                    <button
                      onClick={handleGenerateMockData}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-bold transition-all flex items-center gap-2 mx-auto"
                    >
                      <Icon name="wand" size={16} />
                      Generate Mock Data
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {filteredQuestions.map((q) => {
                    const id = q.id || q.uniqueId;
                    const isSelected = selectedQuestionIds.has(id);
                    return (
                      <div
                        key={id}
                        onClick={() => toggleQuestion(q)}
                        className={`p-4 cursor-pointer hover:bg-slate-700/50 transition-colors ${
                          isSelected ? "bg-blue-900/20" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleQuestion(q)}
                            className="mt-1 rounded border-slate-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm line-clamp-2">
                              {q.question}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                                {q.discipline}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                                {q.difficulty}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                                {q.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Preview Modal */}
      {showPreview && (
        <QuizPreview
          questions={activeQuizQuestions}
          config={quizConfig}
          onClose={() => {
            setShowPreview(false);
            setActiveQuizQuestions([]);
          }}
        />
      )}

      {/* SCORM Export Modal */}
      {showExport && (
        <ScormExportModal
          questions={
            selectedQuestionIds.size > 0 ? selectedQuestions : filteredQuestions
          }
          discipline={
            filters.disciplines.length === 1 ? filters.disciplines[0] : null
          }
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Batch SCORM Export Modal - exports all disciplines at once */}
      {showBatchExport && (
        <BatchScormExportModal
          questions={approvedQuestions}
          onClose={() => setShowBatchExport(false)}
        />
      )}
    </div>
  );
};

export default TestView;
