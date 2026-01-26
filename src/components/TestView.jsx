/* eslint-disable sonarjs/pseudo-random */
import { useState, useMemo, useEffect } from "react";
import Icon from "./Icon";
import QuizPreview from "./QuizPreview";
import ScormExportModal from "./ScormExportModal";
import { generateMockQuestions } from "../utils/mockQuestionGenerator";

/**
 * TestView - Admin view for configuring, previewing, and exporting quizzes
 * Allows admins to select approved questions and create assessments
 */
const TestView = ({
  questions = [],
  config: _appConfig,
  isAdmin,
  showMessage,
}) => {
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

  // Filter state - will be set to first discipline on mount
  const [filters, setFilters] = useState({
    discipline: "", // Will be set to first available discipline
  });

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showExport, setShowExport] = useState(false);
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
      // If discipline filter is set, only include matching questions
      return !filters.discipline || q.discipline === filters.discipline;
    });
  }, [approvedQuestions, filters]);

  // Get unique disciplines for filter dropdown
  const disciplines = useMemo(() => {
    const set = new Set(approvedQuestions.map((q) => q.discipline));
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
      selectedQuestionIds.has(q.id || q.uniqueId),
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
        new Set(filteredQuestions.map((q) => q.id || q.uniqueId)),
      );
    }
  };

  // Auto-select first discipline when disciplines are available
  useEffect(() => {
    if (disciplines.length > 0 && !filters.discipline) {
      setFilters((prev) => ({ ...prev, discipline: disciplines[0] }));
    }
  }, [disciplines, filters.discipline]);

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
      {/* Header with Discipline Filter */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Icon name="clipboard-list" size={28} />
            Test Configuration
          </h1>
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

        {/* Discipline Tabs - Single Selection Required */}
        <div className="flex flex-wrap gap-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
          <span className="text-sm text-slate-400 mr-2 self-center">
            <Icon name="filter" size={14} className="inline mr-1" />
            Discipline:
          </span>
          {disciplines.map((d) => (
            <button
              key={d}
              onClick={() => setFilters({ ...filters, discipline: d })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filters.discipline === d
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {d}
              <span className="ml-2 text-xs opacity-70">
                ({approvedQuestions.filter((q) => q.discipline === d).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quiz Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quiz Config Card */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Icon name="settings" size={18} />
              Quiz Settings
            </h2>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Quiz Title
              </label>
              <input
                type="text"
                value={quizConfig.title}
                onChange={(e) =>
                  setQuizConfig({ ...quizConfig, title: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white focus:border-blue-500 outline-none"
              />
            </div>

            {/* Passing Score */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Passing Score: {quizConfig.passingScore}%
              </label>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={quizConfig.passingScore}
                onChange={(e) =>
                  setQuizConfig({
                    ...quizConfig,
                    passingScore: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            {/* Time Limit */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Time Limit
              </label>
              <select
                value={quizConfig.timeLimit}
                onChange={(e) =>
                  setQuizConfig({
                    ...quizConfig,
                    timeLimit: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (1 hour)</option>
              </select>
            </div>

            {/* Question Count */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Questions: {quizConfig.questionCount}
              </label>
              <input
                type="range"
                min="5"
                max={Math.min(60, filteredQuestions.length || 60)}
                value={Math.min(
                  quizConfig.questionCount,
                  filteredQuestions.length,
                )}
                onChange={(e) =>
                  setQuizConfig({
                    ...quizConfig,
                    questionCount: parseInt(e.target.value),
                  })
                }
                className="w-full"
              />
            </div>

            {/* Shuffle */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quizConfig.shuffleQuestions}
                  onChange={(e) =>
                    setQuizConfig({
                      ...quizConfig,
                      shuffleQuestions: e.target.checked,
                    })
                  }
                  className="rounded border-slate-600"
                />
                Shuffle question order
              </label>
            </div>

            {/* Feedback Mode */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Show Feedback
              </label>
              <select
                value={quizConfig.showFeedback}
                onChange={(e) =>
                  setQuizConfig({ ...quizConfig, showFeedback: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              >
                <option value="immediate">After each question</option>
                <option value="end">At quiz end</option>
              </select>
            </div>

            {/* Adaptive Difficulty */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={quizConfig.adaptiveDifficulty}
                  onChange={(e) =>
                    setQuizConfig({
                      ...quizConfig,
                      adaptiveDifficulty: e.target.checked,
                    })
                  }
                  className="rounded border-slate-600"
                />
                Adaptive difficulty
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-6">
                Adjusts question difficulty based on performance
              </p>
            </div>
          </div>

          {/* Filter moved to header - show current filter info */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <div className="text-sm text-slate-400">
              <Icon name="filter" size={14} className="inline mr-1" />
              Showing:{" "}
              <span className="text-white font-medium">
                {filters.discipline || "Select a discipline above"}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {filteredQuestions.length} questions available
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
                  {filters.discipline === "" && (
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

      {/* SCORM Export Modal - receives ALL questions for the discipline */}
      {/* The quiz runtime will select 20 Easy + 20 Medium + 20 Hard = 60 randomly */}
      {showExport && (
        <ScormExportModal
          questions={filteredQuestions}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
};

export default TestView;
