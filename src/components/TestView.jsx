import { useState, useMemo } from "react";
import Icon from "./Icon";
import QuizPreview from "./QuizPreview";
import ScormExportModal from "./ScormExportModal";

/**
 * TestView - Admin view for configuring, previewing, and exporting quizzes
 * Allows admins to select approved questions and create assessments
 */
const TestView = ({ questions = [], config: _appConfig, isAdmin }) => {
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
  const [filters, setFilters] = useState({
    discipline: "",
    difficulty: "",
    type: "",
  });

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());

  // Get only approved questions
  const approvedQuestions = useMemo(() => {
    return questions.filter((q) => q.status === "accepted");
  }, [questions]);

  // Filter approved questions based on criteria
  const filteredQuestions = useMemo(() => {
    return approvedQuestions.filter((q) => {
      if (filters.discipline && q.discipline !== filters.discipline)
        return false;
      if (filters.difficulty) {
        const qDiff = (q.difficulty || "").toLowerCase();
        const filterDiff = filters.difficulty.toLowerCase();
        if (!qDiff.includes(filterDiff)) return false;
      }
      if (filters.type) {
        const qType = (q.type || "").toLowerCase();
        const filterType = filters.type.toLowerCase();
        if (qType === "multiple choice" && filterType !== "mc") return false;
        if (
          (qType === "true/false" || qType === "t/f") &&
          filterType !== "tf"
        )
          return false;
      }
      return true;
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
        <p className="text-slate-400 mt-2">
          Configure and preview quizzes from approved questions
        </p>
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
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
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
                max={Math.min(50, filteredQuestions.length || 50)}
                value={Math.min(
                  quizConfig.questionCount,
                  filteredQuestions.length
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

          {/* Filter Card */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Icon name="filter" size={18} />
              Question Filters
            </h2>

            {/* Discipline */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Discipline
              </label>
              <select
                value={filters.discipline}
                onChange={(e) =>
                  setFilters({ ...filters, discipline: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              >
                <option value="">All Disciplines</option>
                {disciplines.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Difficulty
              </label>
              <select
                value={filters.difficulty}
                onChange={(e) =>
                  setFilters({ ...filters, difficulty: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Question Type
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white"
              >
                <option value="">All Types</option>
                <option value="mc">Multiple Choice</option>
                <option value="tf">True/False</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setShowPreview(true)}
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

            <div className="max-h-[600px] overflow-y-auto">
              {filteredQuestions.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Icon
                    name="inbox"
                    size={48}
                    className="mx-auto mb-4 opacity-50"
                  />
                  <p>No approved questions match your filters</p>
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
          questions={selectedQuestions}
          config={quizConfig}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* SCORM Export Modal */}
      {showExport && (
        <ScormExportModal
          questions={selectedQuestions}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
};

export default TestView;
