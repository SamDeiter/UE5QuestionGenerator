/**
 * QuizStartScreen - The introductory screen before quiz starts
 */

const QuizStartScreen = ({ questions, config, onClose, onStart }) => {
  return (
    <div
      className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          {/* Unreal Engine Logo */}
          <img
            src={`${import.meta.env.BASE_URL}logos/UE-Secondary-Logo-2023-Horizontal-White.svg`}
            alt="Unreal Engine"
            className="h-12 mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-white mb-2">
            Assessment Preview
          </h2>
          <p className="text-slate-400">
            Test your knowledge with {config.questionCount || questions.length}{" "}
            questions
          </p>
        </div>

        {/* Quiz info */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8 text-left">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Questions</span>
              <span className="text-white font-medium">
                {config.questionCount || questions.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Time Limit</span>
              <span className="text-white font-medium">
                {config.timeLimit} minutes
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Passing Score</span>
              <span className="text-white font-medium">
                {config.passingScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div
          className="bg-slate-800/50 rounded-lg p-4 mb-8 text-left"
          role="region"
          aria-label="Assessment instructions"
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            How This Assessment Works
          </h3>
          <ul className="text-sm text-slate-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              Read each question carefully before selecting your answer
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              Click on your chosen answer to select it
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              Use the &quot;Next Question&quot; button to proceed
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              Keep an eye on the timer in the top right
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              Your results will be shown at the end
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={onStart}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Start Assessment
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizStartScreen;
