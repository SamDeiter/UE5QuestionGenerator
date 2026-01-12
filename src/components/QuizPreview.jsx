/**
 * QuizPreview - Interactive quiz component with SCORM reporting
 *
 * NOTE: Regex patterns are for HTML tag stripping in accessibility announcements.
 * Input is question text from app database - controlled, no DoS risk.
 */
/* eslint-disable sonarjs/slow-regex */
import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "./Icon";
import {
  generateGUID,
  createSeededRandom,
  seededShuffle,
  reportToSCORM,
} from "../utils/quizUtils";
import { logger } from "../utils/logger";

// Sub-components
import QuizStartScreen from "./QuizPreview/QuizStartScreen";
import QuizResultsScreen from "./QuizPreview/QuizResultsScreen";
import QuizHeader from "./QuizPreview/QuizHeader";
import QuizQuestion from "./QuizPreview/QuizQuestion";

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
  const [quizGuid, setQuizGuid] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [wrongStreak, setWrongStreak] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(config.timeLimit * 60);
  const [quizStarted, setQuizStarted] = useState(false);
  const [showAnswerWarning, setShowAnswerWarning] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);

  // Accessibility state
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(0);
  const [announceMessage, setAnnounceMessage] = useState("");

  // Derived state
  const currentQuestion = quizQuestions[currentIndex];
  const totalQuestions = quizQuestions.length;
  const questionId = currentQuestion?.id || currentQuestion?.uniqueId;
  const selectedAnswer = answers[questionId];
  const isAnswered = selectedAnswer !== undefined;

  /**
   * Build a balanced question list at quiz start
   */
  const buildBalancedQuestionList = useCallback(
    (guid) => {
      const randomFn = createSeededRandom(guid);

      // Filter to English-only questions first
      const englishQuestions = questions.filter((q) => {
        const lang = (q.language || "").toLowerCase();
        return lang === "" || lang === "english" || lang === "en";
      });

      const easy = englishQuestions.filter((q) =>
        (q.difficulty || "").toLowerCase().includes("easy")
      );
      const medium = englishQuestions.filter((q) =>
        (q.difficulty || "").toLowerCase().includes("medium")
      );
      const hard = englishQuestions.filter((q) =>
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
      logger.log("Quiz started with GUID:", guid);
    }
  }, [quizStarted, quizGuid, buildBalancedQuestionList]);

  // Anti-cheating: Block keyboard shortcuts and track tab visibility
  useEffect(() => {
    if (!quizStarted || showResults) return;

    const handleKeydown = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "c" ||
          e.key === "v" ||
          e.key === "f" ||
          e.key === "p" ||
          e.key === "s")
      ) {
        e.preventDefault();
        logger.log("Anti-cheat: Blocked keyboard shortcut");
      }
    };

    const handleCopy = (e) => {
      e.preventDefault();
      logger.log("Anti-cheat: Blocked copy attempt");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logger.log("Anti-cheat: Quiz tab lost focus", {
          quizGuid,
          timestamp: new Date().toISOString(),
          questionIndex: currentIndex,
        });
      }
    };

    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [quizStarted, showResults, quizGuid, currentIndex]);

  // Get options for display (static A, B, C, D - always in order)
  const getOptions = useCallback((question) => {
    if (!question?.options) return {};
    return Object.entries(question.options)
      .filter(([, value]) => value)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce((acc, [key, value]) => {
        let displayValue = value;
        if (value === "TRUE") displayValue = "True";
        if (value === "FALSE") displayValue = "False";
        acc[key] = displayValue;
        return acc;
      }, {});
  }, []);

  // Handle answer selection
  const handleAnswer = useCallback(
    (selectedKey) => {
      if (!currentQuestion) return;

      const qId = currentQuestion.id || currentQuestion.uniqueId;
      const isCorrect = selectedKey === currentQuestion.correct;

      setAnswers((prev) => ({ ...prev, [qId]: selectedKey }));

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
    if (!isAnswered) {
      setShowAnswerWarning(true);
      return;
    }

    setShowAnswerWarning(false);

    if (currentIndex + 1 >= totalQuestions) {
      setShowResults(true);
      return;
    }

    // Confidence boost: if 2+ wrong in a row, try to give an easy question next
    if (wrongStreak >= 2) {
      const answeredIds = new Set(Object.keys(answers));
      const upcomingQuestions = quizQuestions.slice(currentIndex + 1);

      const easyIndex = upcomingQuestions.findIndex(
        (q) =>
          (q.difficulty || "").toLowerCase().includes("easy") &&
          !answeredIds.has(q.id || q.uniqueId)
      );

      if (easyIndex > 0) {
        const newQuestions = [...quizQuestions];
        const easyQ = newQuestions[currentIndex + 1 + easyIndex];
        const nextQ = newQuestions[currentIndex + 1];
        newQuestions[currentIndex + 1] = easyQ;
        newQuestions[currentIndex + 1 + easyIndex] = nextQ;
        setQuizQuestions(newQuestions);
      }
    }

    setCurrentIndex((prev) => prev + 1);
  }, [
    currentIndex,
    totalQuestions,
    wrongStreak,
    answers,
    quizQuestions,
    isAnswered,
  ]);

  // Accessibility: Keyboard navigation for quiz questions
  useEffect(() => {
    if (!quizStarted || showResults || !currentQuestion) return;

    const optionKeys = Object.keys(getOptions(currentQuestion));

    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedOptionIndex((prev) => {
          const newIndex = (prev + 1) % optionKeys.length;
          setAnnounceMessage(
            `Option ${optionKeys[newIndex]}, ${
              optionKeys.length - newIndex
            } of ${optionKeys.length}`
          );
          return newIndex;
        });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedOptionIndex((prev) => {
          const newIndex = prev === 0 ? optionKeys.length - 1 : prev - 1;
          setAnnounceMessage(
            `Option ${optionKeys[newIndex]}, ${newIndex + 1} of ${
              optionKeys.length
            }`
          );
          return newIndex;
        });
      } else if ((e.key === "Enter" || e.key === " ") && !selectedAnswer) {
        e.preventDefault();
        const selectedKey = optionKeys[focusedOptionIndex];
        handleAnswer(selectedKey);
        setAnnounceMessage(`Selected option ${selectedKey}`);
      } else if (e.key === "n" && selectedAnswer) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    quizStarted,
    showResults,
    currentQuestion,
    focusedOptionIndex,
    selectedAnswer,
    handleAnswer,
    handleNext,
    getOptions,
  ]);

  // Reset focused option when question changes
  useEffect(() => {
    setFocusedOptionIndex(0);
    if (currentQuestion) {
      setAnnounceMessage(
        `Question ${
          currentIndex + 1
        } of ${totalQuestions}: ${currentQuestion.question.replace(
          /<[^>]*>/g,
          ""
        )}`
      );
    }
  }, [currentIndex, currentQuestion, totalQuestions]);

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

  // Report results to SCORM when quiz completes
  useEffect(() => {
    if (showResults && quizGuid && quizStartTime) {
      const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000);
      reportToSCORM(results, quizGuid, timeSpent);
    }
  }, [showResults, results, quizGuid, quizStartTime]);

  // ========== UI RENDERING ==========

  // Start screen
  if (!quizStarted) {
    return (
      <QuizStartScreen
        questions={questions}
        config={config}
        onClose={onClose}
        onStart={() => setQuizStarted(true)}
      />
    );
  }

  // Results screen
  if (showResults) {
    return (
      <QuizResultsScreen results={results} config={config} onClose={onClose} />
    );
  }

  // No questions available
  if (!currentQuestion) {
    return (
      <div
        className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
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
    <div
      className="fixed inset-0 bg-slate-900 z-[9999] flex flex-col select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceMessage}
      </div>

      <QuizHeader
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        timeRemaining={timeRemaining}
        formatTime={formatTime}
        onClose={onClose}
      />

      <QuizQuestion
        currentQuestion={currentQuestion}
        options={options}
        selectedAnswer={selectedAnswer}
        isAnswered={isAnswered}
        focusedOptionIndex={focusedOptionIndex}
        showAnswerWarning={showAnswerWarning}
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        announceMessage={announceMessage}
        onAnswerSelect={handleAnswer}
        onNext={handleNext}
      />
    </div>
  );
};

export default QuizPreview;
