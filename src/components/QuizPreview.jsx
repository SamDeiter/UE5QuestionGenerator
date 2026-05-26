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
  classifyDifficulty,
} from "../utils/quizUtils";
import { logger } from "../utils/logger";
import {
  generateAttemptToken,
  lockAttempt,
  getActiveAttempt,
  clearAttempt,
  forceAbandonAttempt,
  preventBackNavigation,
  restoreBackNavigation,
  enableUnloadWarning,
  disableUnloadWarning,
  initMultiTabDetection,
  cleanupMultiTabDetection,
  queryOtherTabs,
} from "../utils/quizSessionManager";

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
 * - Weighted difficulty distribution (15% Easy, 35% Medium, 50% Hard)
 * - Fixed question count and timer
 * - Static A, B, C, D answer display
 */
const QuizPreview = ({ questions, config, onClose }) => {
  // Core quiz state
  const [quizGuid, setQuizGuid] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(config.timeLimit * 60);
  const [quizStarted, setQuizStarted] = useState(false);
  const [showAnswerWarning, setShowAnswerWarning] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [attemptToken, setAttemptToken] = useState(null);
  const [duplicateAttemptWarning, setDuplicateAttemptWarning] = useState(null);

  // Accessibility state - start with -1 (no focus) until user uses keyboard
  const [focusedOptionIndex, setFocusedOptionIndex] = useState(-1);
  const [announceMessage, setAnnounceMessage] = useState("");

  // Derived state
  const currentQuestion = quizQuestions[currentIndex];
  const totalQuestions = quizQuestions.length;
  const questionId = currentQuestion?.id || currentQuestion?.uniqueId;
  const selectedAnswer = answers[questionId];
  const isAnswered = selectedAnswer !== undefined;

  /**
   * Build a weighted question list at quiz start
   * Allocates 15% Easy + 35% Medium + 50% Hard (target 60 questions)
   * Starts with an easy question for confidence, then interleaves E-M-H
   */
  const buildBalancedQuestionList = useCallback(
    (guid) => {
      const randomFn = createSeededRandom(guid);

      // Filter to English-only questions first
      const englishQuestions = questions.filter((q) => {
        const lang = (q.language || "").toLowerCase();
        return lang === "" || lang === "english" || lang === "en";
      });

      // Use classifyDifficulty so Beginner/Intermediate/Expert questions are
      // tiered alongside legacy Easy/Medium/Hard values (40% of Firestore
      // questions otherwise fall through and get excluded from the draw).
      const easy = [];
      const medium = [];
      const hard = [];
      for (const q of englishQuestions) {
        const tier = classifyDifficulty(q.difficulty);
        if (tier === "easy") easy.push(q);
        else if (tier === "medium") medium.push(q);
        else if (tier === "hard") hard.push(q);
      }

      // Shuffle each pool using seeded random
      const shuffledEasy = seededShuffle(easy, randomFn);
      const shuffledMedium = seededShuffle(medium, randomFn);
      const shuffledHard = seededShuffle(hard, randomFn);

      // Weighted allocation: 15% Easy, 35% Medium, 50% Hard
      // These weights ensure certification exams are appropriately challenging
      const TOTAL_TARGET = 60;
      const targetEasy = Math.round(TOTAL_TARGET * 0.15); // 9
      const targetMedium = Math.round(TOTAL_TARGET * 0.35); // 21
      const targetHard = TOTAL_TARGET - targetEasy - targetMedium; // 30

      // Select up to target from each pool (or as many as available)
      const actualEasy = Math.min(targetEasy, shuffledEasy.length);
      const actualMedium = Math.min(targetMedium, shuffledMedium.length);
      const actualHard = Math.min(targetHard, shuffledHard.length);

      // Redistribute shortfall to harder pools first
      let surplus =
        targetEasy -
        actualEasy +
        (targetMedium - actualMedium) +
        (targetHard - actualHard);
      const extraHard = Math.min(surplus, shuffledHard.length - actualHard);
      surplus -= extraHard;
      const extraMedium = Math.min(
        surplus,
        shuffledMedium.length - actualMedium
      );
      surplus -= extraMedium;
      const extraEasy = Math.min(surplus, shuffledEasy.length - actualEasy);

      const selectedEasy = shuffledEasy.slice(0, actualEasy + extraEasy);
      const selectedMedium = shuffledMedium.slice(
        0,
        actualMedium + extraMedium
      );
      const selectedHard = shuffledHard.slice(0, actualHard + extraHard);

      // Build the question order:
      // 1. Start with ONE easy question for confidence
      // 2. Interleave remaining: E-M-H-E-M-H...
      const distributed = [];

      // Add first easy question
      if (selectedEasy.length > 0) {
        distributed.push(selectedEasy[0]);
      }

      // Interleave the rest (starting from index 1 for easy, 0 for others)
      const remainingEasy = selectedEasy.slice(1);
      const maxLen = Math.max(
        remainingEasy.length,
        selectedMedium.length,
        selectedHard.length
      );

      for (let i = 0; i < maxLen; i++) {
        if (remainingEasy[i]) distributed.push(remainingEasy[i]);
        if (selectedMedium[i]) distributed.push(selectedMedium[i]);
        if (selectedHard[i]) distributed.push(selectedHard[i]);
      }

      logger.log(
        `Quiz built: ${selectedEasy.length} easy, ${selectedMedium.length} medium, ${selectedHard.length} hard = ${distributed.length} total`
      );

      return distributed;
    },
    [questions]
  );

  // Generate GUID, lock attempt, and build question list when quiz starts
  useEffect(() => {
    if (quizStarted && !quizGuid) {
      const guid = generateGUID();
      const token = generateAttemptToken();

      // Lock the attempt to prevent restarts
      const locked = lockAttempt(token, guid);
      if (!locked) {
        const active = getActiveAttempt();
        logger.warn("Cannot start: attempt already active", active);
        // Allow continuing if it's the same session
      }

      setAttemptToken(token);
      setQuizGuid(guid);
      setQuizStartTime(Date.now());
      setQuizQuestions(buildBalancedQuestionList(guid));

      // Enable security features
      preventBackNavigation();
      enableUnloadWarning();

      logger.log("Quiz started with GUID:", guid, "Token:", token);
    }
  }, [quizStarted, quizGuid, buildBalancedQuestionList]);

  // Multi-tab detection: Initialize on mount
  useEffect(() => {
    initMultiTabDetection((duplicateData) => {
      setDuplicateAttemptWarning(duplicateData);
      logger.warn("[QuizPreview] Duplicate attempt detected in another tab");
    });

    // Query other tabs for active attempts
    queryOtherTabs();

    return () => {
      cleanupMultiTabDetection();
    };
  }, []);

  // Cleanup security features on unmount or completion
  useEffect(() => {
    return () => {
      restoreBackNavigation();
      disableUnloadWarning();
    };
  }, []);

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

      setAnswers((prev) => ({ ...prev, [qId]: selectedKey }));
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

    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, totalQuestions, isAnswered]);

  // Accessibility: Keyboard navigation for quiz questions
  useEffect(() => {
    if (!quizStarted || showResults || !currentQuestion) return;

    const optionKeys = Object.keys(getOptions(currentQuestion));

    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedOptionIndex((prev) => {
          // If no focus yet (-1), start at first option (0)
          const newIndex = prev < 0 ? 0 : (prev + 1) % optionKeys.length;
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
          // If no focus yet (-1), start at last option; otherwise move up (wrap around)
          let newIndex;
          if (prev < 0) {
            newIndex = optionKeys.length - 1;
          } else {
            newIndex = prev === 0 ? optionKeys.length - 1 : prev - 1;
          }
          setAnnounceMessage(
            `Option ${optionKeys[newIndex]}, ${newIndex + 1} of ${
              optionKeys.length
            }`
          );
          return newIndex;
        });
      } else if (
        (e.key === "Enter" || e.key === " ") &&
        !selectedAnswer &&
        focusedOptionIndex >= 0
      ) {
        // Only allow Enter/Space selection if an option is focused
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

  // Reset focused option when question changes - start at -1 (no visible focus)
  useEffect(() => {
    setFocusedOptionIndex(-1);
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

  // Report results to SCORM and clear attempt when quiz completes
  useEffect(() => {
    if (showResults && quizGuid && quizStartTime) {
      const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000);
      reportToSCORM(results, quizGuid, timeSpent);

      // Clear the attempt lock on completion
      if (attemptToken) {
        clearAttempt(attemptToken);
        restoreBackNavigation();
        disableUnloadWarning();
      }
    }
  }, [showResults, results, quizGuid, quizStartTime, attemptToken]);

  // ========== UI RENDERING ==========

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    if (quizStarted && !showResults && attemptToken) {
      // Abandon attempt on close during quiz
      forceAbandonAttempt();
      restoreBackNavigation();
      disableUnloadWarning();
    }
    onClose();
  }, [quizStarted, showResults, attemptToken, onClose]);

  // Duplicate attempt warning modal
  if (duplicateAttemptWarning && !quizStarted) {
    return (
      <div
        className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="bg-slate-800 p-8 rounded-lg text-center max-w-md">
          <Icon
            name="alert-triangle"
            size={48}
            className="mx-auto text-yellow-500 mb-4"
          />
          <h3 className="text-xl font-bold text-white mb-2">
            Quiz Already Active
          </h3>
          <p className="text-slate-400 mb-6">
            A quiz attempt is already in progress in another browser tab. Please
            complete or close that attempt first.
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

  // Start screen
  if (!quizStarted) {
    return (
      <QuizStartScreen
        questions={questions}
        config={config}
        onClose={handleClose}
        onStart={() => setQuizStarted(true)}
      />
    );
  }

  // Results screen
  if (showResults) {
    return (
      <QuizResultsScreen
        results={results}
        config={config}
        onClose={handleClose}
      />
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
