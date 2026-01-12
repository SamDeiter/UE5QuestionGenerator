/**
 * QuizHeader - The header bar with progress, timer, and close button
 */
import Icon from "../Icon";

const QuizHeader = ({
  currentIndex,
  totalQuestions,
  timeRemaining,
  formatTime,
  onClose,
}) => {
  return (
    <>
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* UE Icon */}
            <img
              src="/UE5QuestionGenerator/logos/UE-Icon-2023-White.svg"
              alt="Unreal Engine"
              className="h-6 w-6 opacity-80"
            />
            <span className="text-white font-semibold">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 ${
                timeRemaining < 60 ? "text-red-400" : "text-slate-300"
              }`}
            >
              <Icon name="clock" size={18} />
              <span className="font-mono">{formatTime(timeRemaining)}</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close quiz"
            >
              <Icon name="x" size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 bg-slate-700"
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={totalQuestions}
      >
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
          }}
        />
      </div>
    </>
  );
};

export default QuizHeader;
