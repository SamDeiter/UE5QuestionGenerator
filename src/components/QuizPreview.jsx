import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "./Icon";
import {
  generateGUID,
  createSeededRandom,
  seededShuffle,
  reportToSCORM,
} from "../utils/quizUtils";

/**
 * QuizPreview - Simplified interactive quiz component
 *
 * Features:
 * - Balanced difficulty distribution (interleaves Easy/Medium/Hard)
 * - Confidence boost: gives easy question after 2 wrong in a row
 * - Fixed question count and timer
 * - Static A, B, C, D answer display
 */
const QuizPreview = ({ questions, config, onClose }) => {
  // Core quiz state
  const [quizGuid, setQuizGuid] = useState(null); // Unique GUID for this quiz instance
  const [quizQuestions, setQuizQuestions] = useState([]); // Built once at start
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // Simple: { questionId: "A" }
  const [wrongStreak, setWrongStreak] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(config.timeLimit * 60);
  const [quizStarted, setQuizStarted] = useState(false);
  const [showAnswerWarning, setShowAnswerWarning] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);

  /**
   * Build a balanced question list at quiz start
   * Uses seeded randomization for reproducibility
   * Interleaves Easy, Medium, Hard to avoid clustering
   */
  const buildBalancedQuestionList = useCallback(
    (guid) => {
      const randomFn = createSeededRandom(guid);

      const easy = questions.filter((q) =>
        (q.difficulty || "").toLowerCase().includes("easy")
      );
      const medium = questions.filter((q) =>
        (q.difficulty || "").toLowerCase().includes("medium")
      );
      const hard = questions.filter((q) =>
        (q.difficulty || "").toLowerCase().includes("hard")
      );

      // Shuffle each pool using seeded random
      const shuffledEasy = seededShuffle(easy, randomFn);
      const shuffledMedium = seededShuffle(medium, randomFn);
      const shuffledHard = seededShuffle(hard, randomFn);

      // Interleave: E-M-H-E-M-H...
      const distributed = [];
      const maxLen = Math.max(
        shuffledEasy.length,
        shuffledMedium.length,
        shuffledHard.length
      );

      for (let i = 0; i < maxLen; i++) {
        if (shuffledEasy[i]) distributed.push(shuffledEasy[i]);
        if (shuffledMedium[i]) distributed.push(shuffledMedium[i]);
        if (shuffledHard[i]) distributed.push(shuffledHard[i]);
      }

      // Take only what we need
      return distributed.slice(0, config.questionCount || distributed.length);
    },
    [questions, config.questionCount]
  );

  // Generate GUID and build question list when quiz starts
  useEffect(() => {
    if (quizStarted && !quizGuid) {
      const guid = generateGUID();
      setQuizGuid(guid);
      setQuizStartTime(Date.now());
      setQuizQuestions(buildBalancedQuestionList(guid));
      console.log("Quiz started with GUID:", guid);
    }
  }, [quizStarted, quizGuid, buildBalancedQuestionList]);

  // Current question
  const currentQuestion = quizQuestions[currentIndex];
  const totalQuestions = quizQuestions.length;

  // Timer
  useEffect(() => {
    if (!quizStarted || showResults) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, showResults]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle answer selection
  const handleAnswer = useCallback(
    (selectedKey) => {
      if (!currentQuestion) return;

      const questionId = currentQuestion.id || currentQuestion.uniqueId;
      const isCorrect = selectedKey === currentQuestion.correct;

      // Store just the key
      setAnswers((prev) => ({ ...prev, [questionId]: selectedKey }));

      // Update wrong streak
      if (isCorrect) {
        setWrongStreak(0);
      } else {
        setWrongStreak((prev) => prev + 1);
      }
    },
    [currentQuestion]
  );

  // Handle next question with confidence boost
  const handleNext = useCallback(() => {
    setShowAnswerWarning(false);

    if (currentIndex + 1 >= totalQuestions) {
      setShowResults(true);
      return;
    }

    // Confidence boost: if 2+ wrong in a row, try to give an easy question next
    if (wrongStreak >= 2) {
      const answeredIds = new Set(Object.keys(answers));
      const upcomingQuestions = quizQuestions.slice(currentIndex + 1);

      // Find first easy question in upcoming that hasn't been answered
      const easyIndex = upcomingQuestions.findIndex(
        (q) =>
          (q.difficulty || "").toLowerCase().includes("easy") &&
          !answeredIds.has(q.id || q.uniqueId)
      );

      if (easyIndex > 0) {
        // Swap the easy question to be next
        const newQuestions = [...quizQuestions];
        const easyQ = newQuestions[currentIndex + 1 + easyIndex];
        const nextQ = newQuestions[currentIndex + 1];
        newQuestions[currentIndex + 1] = easyQ;
        newQuestions[currentIndex + 1 + easyIndex] = nextQ;
        setQuizQuestions(newQuestions);
      }
    }

    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, totalQuestions, wrongStreak, answers, quizQuestions]);

  // Calculate results
  const results = useMemo(() => {
    let correct = 0;
    const total = Object.keys(answers).length;

    quizQuestions.forEach((q) => {
      const qId = q.id || q.uniqueId;
      if (answers[qId] === q.correct) {
        correct++;
      }
    });

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = percentage >= config.passingScore;

    return { correct, total, percentage, passed };
  }, [answers, quizQuestions, config.passingScore]);

  // Get options for display (static A, B, C, D - always in order)
  const getOptions = (question) => {
    if (!question?.options) return {};
    return Object.entries(question.options)
      .filter(([, value]) => value)
      .sort(([a], [b]) => a.localeCompare(b)) // Ensure A, B, C, D order
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  };

  // Report results to SCORM when quiz completes
  useEffect(() => {
    if (showResults && quizGuid && quizStartTime) {
      const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000);
      reportToSCORM(results, quizGuid, timeSpent);
    }
  }, [showResults, results, quizGuid, quizStartTime]);

  // Derived state for current question
  const questionId = currentQuestion?.id || currentQuestion?.uniqueId;
  const selectedAnswer = answers[questionId];
  const isAnswered = selectedAnswer !== undefined;

  // ========== UI RENDERING (unchanged from before) ==========

  // Start screen
  if (!quizStarted) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8">
            {/* Unreal Engine Logo */}
            <img
              src="/UE5QuestionGenerator/logos/UE-Secondary-Logo-2023-Horizontal-White.svg"
              alt="Unreal Engine"
              className="h-12 mx-auto mb-6"
            />
            <h2 className="text-2xl font-bold text-white mb-2">
              Assessment Preview
            </h2>
            <p className="text-slate-400">
              Test your knowledge with{" "}
              {config.questionCount || questions.length} questions
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
              onClick={() => setQuizStarted(true)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (showResults) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          {/* UE Branding */}
          <img
            src="/UE5QuestionGenerator/logos/UE-Secondary-Logo-2023-Horizontal-White.svg"
            alt="Unreal Engine"
            className="h-8 mx-auto mb-8 opacity-60"
          />

          <div
            className={`text-6xl mb-4 ${
              results.passed ? "text-green-400" : "text-red-400"
            }`}
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
            You scored {results.percentage}% ({results.correct} of{" "}
            {results.total} correct)
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
            © 2025 Epic Games, Inc. Unreal and its logo are registered
            trademarks.
          </p>
        </div>
      </div>
    );
  }

  // No questions available
  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg text-center max-w-sm">
          <Icon
            name="alert-triangle"
            size={48}
            className="mx-auto text-yellow-500 mb-4"
          />
          <h3 className="text-xl font-bold text-white mb-2">
            No questions available
          </h3>
          <p className="text-slate-400 mb-6">
            There are no questions in the selection.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const options = getOptions(currentQuestion);

  // Question screen
  return (
    <div className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col">
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

      {/* Question content */}
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
            dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
          />

          {/* Calming instruction */}
          <p className="text-sm text-slate-400 mb-4">
            {currentQuestion.type === "True/False" ||
            Object.keys(options).length === 2
              ? "Select True or False:"
              : "Select the best answer:"}
          </p>

          {/* Options */}
          <div className="space-y-4" role="listbox" aria-label="Answer options">
            {Object.entries(options).map(([key, text]) => {
              const isSelected = selectedAnswer === key;
              const isCorrectAnswer = key === currentQuestion.correct;

              return (
                <button
                  key={key}
                  onClick={() => !isAnswered && handleAnswer(key)}
                  disabled={isAnswered}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`Option ${key}: ${text}${
                    isSelected ? ", selected" : ""
                  }`}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                    isSelected
                      ? "border-blue-500 bg-blue-900/30"
                      : "border-slate-600 hover:border-slate-500 bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {key}
                    </span>
                    <span
                      className="text-white flex-1"
                      dangerouslySetInnerHTML={{ __html: text }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Next button - always visible */}
          <div className="mt-8 text-center">
            {/* Warning message */}
            {!isAnswered && showAnswerWarning && (
              <p className="text-red-400 text-sm mb-3 animate-bounce">
                ⚠️ Please select an answer before continuing
              </p>
            )}
            <button
              onClick={() => {
                if (!isAnswered) {
                  setShowAnswerWarning(true);
                  return;
                }
                handleNext();
              }}
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
    </div>
  );
};

export default QuizPreview;
