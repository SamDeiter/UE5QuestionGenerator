/**
 * QuizResultsScreen - The results/summary screen after quiz completion
 */
import Icon from "../Icon";
import { useAccessibility } from "../../contexts/AccessibilityContext";

const QuizResultsScreen = ({ results, onClose }) => {
  const { colorblindMode } = useAccessibility();
  const cb = colorblindMode;

  // Colorblind-safe colors for pass/fail
  const passColor = cb ? "text-blue-400" : "text-green-400";
  const failColor = cb ? "text-rose-400" : "text-red-400";

  return (
    <div
      className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="max-w-lg w-full text-center">
        {/* UE Branding */}
        <img
          src="/UE5QuestionGenerator/logos/UE-Secondary-Logo-2023-Horizontal-White.svg"
          alt="Unreal Engine"
          className="h-8 mx-auto mb-8 opacity-60"
        />

        <div
          className={`text-6xl mb-4 ${results.passed ? passColor : failColor}`}
        >
          {results.passed ? (
            <Icon name="check-circle" size={64} className="mx-auto" />
          ) : (
            <Icon name="x-circle" size={64} className="mx-auto" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {results.passed ? "Assessment Passed!" : "Assessment Not Passed"}
        </h2>

        <p className="text-slate-400 mb-8">
          You scored {results.percentage}% ({results.correct} of {results.total}{" "}
          correct)
        </p>

        <div className="bg-slate-800 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-white">
                {results.correct}
              </div>
              <div className="text-sm text-slate-400">Correct</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">
                {results.total - results.correct}
              </div>
              <div className="text-sm text-slate-400">Incorrect</div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          Close Preview
        </button>

        <p className="text-xs text-slate-500 mt-6">
          © 2025 Epic Games, Inc. Unreal and its logo are registered trademarks.
        </p>
      </div>
    </div>
  );
};

export default QuizResultsScreen;
