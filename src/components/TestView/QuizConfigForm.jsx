import Icon from "../Icon";

/**
 * QuizConfigForm — the 7-field settings panel inside TestView. Pure
 * presentational: owns no state, just renders inputs against the
 * `quizConfig` shape and bubbles changes back through `onChange`.
 *
 * Extracted from TestView so the parent can keep its filter / selection
 * / export logic in one place and so this form can be reused (e.g. in
 * a future template editor) without dragging in the rest of TestView.
 *
 * @param {object} props
 * @param {object} props.quizConfig - The current quiz config object
 * @param {Function} props.onChange - Receives a partial update merged into quizConfig
 * @param {number} props.maxQuestionCount - Upper bound for the question-count slider (typically filtered.length capped at 50)
 */
const QuizConfigForm = ({ quizConfig, onChange, maxQuestionCount }) => {
  const update = (patch) => onChange({ ...quizConfig, ...patch });

  return (
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
          onChange={(e) => update({ title: e.target.value })}
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
          onChange={(e) => update({ passingScore: parseInt(e.target.value) })}
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
          onChange={(e) => update({ timeLimit: parseInt(e.target.value) })}
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
          max={Math.min(50, maxQuestionCount || 50)}
          value={Math.min(quizConfig.questionCount, maxQuestionCount)}
          onChange={(e) => update({ questionCount: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Shuffle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={quizConfig.shuffleQuestions}
            onChange={(e) => update({ shuffleQuestions: e.target.checked })}
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
          onChange={(e) => update({ showFeedback: e.target.value })}
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
            onChange={(e) => update({ adaptiveDifficulty: e.target.checked })}
            className="rounded border-slate-600"
          />
          Adaptive difficulty
        </label>
        <p className="text-xs text-slate-500 mt-1 ml-6">
          Adjusts question difficulty based on performance
        </p>
      </div>
    </div>
  );
};

export default QuizConfigForm;
