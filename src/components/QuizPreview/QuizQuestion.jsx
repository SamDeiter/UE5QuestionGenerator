/**
 * QuizQuestion - The main question display with options
 */
import { sanitizeText } from "../../utils/sanitize";

const QuizQuestion = ({
  currentQuestion,
  options,
  selectedAnswer,
  isAnswered,
  focusedOptionIndex,
  showAnswerWarning,
  currentIndex,
  totalQuestions,
  onAnswerSelect,
  onNext,
}) => {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Question type badge */}
        <div className="mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentQuestion.type === "True/False" ||
              Object.keys(options).length === 2
                ? "bg-purple-900/50 text-purple-300 border border-purple-700"
                : "bg-blue-900/50 text-blue-300 border border-blue-700"
            }`}
          >
            {currentQuestion.type === "True/False" ||
            Object.keys(options).length === 2
              ? "✓✗ True/False"
              : "◎ Multiple Choice"}
          </span>
        </div>

        <h2
          className="text-xl text-white mb-6 leading-relaxed"
          dangerouslySetInnerHTML={sanitizeText(currentQuestion.question)}
        />

        {/* Calming instruction */}
        <p className="text-sm text-slate-400 mb-4">
          {currentQuestion.type === "True/False" ||
          Object.keys(options).length === 2
            ? "Select True or False:"
            : "Select the best answer:"}
        </p>

        {/* Keyboard navigation hint */}
        <p className="text-xs text-slate-500 mb-4 italic">
          Use arrow keys to navigate, Enter/Space to select, N for next question
        </p>

        {/* Options */}
        <div className="space-y-4" role="listbox" aria-label="Answer options">
          {Object.entries(options)
            .sort(([, textA], [, textB]) => {
              // For True/False: ensure True is always first, False always last
              const aLower = textA.toLowerCase();
              const bLower = textB.toLowerCase();
              if (aLower === "true" || aLower === "true.") return -1;
              if (bLower === "true" || bLower === "true.") return 1;
              if (aLower === "false" || aLower === "false.") return 1;
              if (bLower === "false" || bLower === "false.") return -1;
              // Fallback to alphabetical for other options
              return aLower.localeCompare(bLower);
            })
            .map(([key, text], index) => {
              const isSelected = selectedAnswer === key;
              const isFocused = index === focusedOptionIndex;

              return (
                <button
                  key={key}
                  onClick={() => !isAnswered && onAnswerSelect(key)}
                  disabled={isAnswered}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${text}${isSelected ? ", selected" : ""}`}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all focus:outline-none ${
                    isFocused
                      ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900"
                      : ""
                  } ${
                    isSelected
                      ? "border-blue-500 bg-blue-900/30"
                      : "border-slate-600 hover:border-slate-500 bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        isSelected ? "bg-blue-500" : "bg-slate-500"
                      }`}
                    />
                    <span
                      className="text-white flex-1"
                      dangerouslySetInnerHTML={sanitizeText(text)}
                    />
                  </div>
                </button>
              );
            })}
        </div>

        {/* Next button */}
        <div className="mt-8 text-center">
          {/* Warning message */}
          {!isAnswered && showAnswerWarning && (
            <p className="text-red-400 text-sm mb-3 animate-bounce">
              ⚠️ Please select an answer before continuing
            </p>
          )}
          <button
            onClick={onNext}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
              isAnswered
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-700 hover:bg-slate-600 text-slate-300"
            }`}
          >
            {currentIndex + 1 >= totalQuestions
              ? "See Results"
              : "Next Question"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizQuestion;
