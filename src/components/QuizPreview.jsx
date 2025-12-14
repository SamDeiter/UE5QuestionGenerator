import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "./Icon";

/**
 * QuizPreview - Interactive quiz preview with adaptive difficulty
 * 
 * Features:
 * - Distributed difficulty (interleaves Easy/Medium/Hard)
 * - Adaptive mode: adjusts difficulty based on recent performance
 * - Timer support
 * - Immediate or end-of-quiz feedback
 */
const QuizPreview = ({ questions, config, onClose }) => {
  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: selectedAnswer }
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(config.timeLimit * 60);
  const [quizStarted, setQuizStarted] = useState(false);
  const [feedbackShown, setFeedbackShown] = useState(false);

  // Adaptive difficulty state
  const [recentCorrect, setRecentCorrect] = useState([]); // Last 3 answers: true/false

  /**
   * Distribute questions by difficulty to avoid clustering
   * Interleaves Easy, Medium, Hard questions
   */
  const distributeByDifficulty = useCallback((qs) => {
    const easy = qs.filter((q) => 
      (q.difficulty || "").toLowerCase().includes("easy")
    );
    const medium = qs.filter((q) => 
      (q.difficulty || "").toLowerCase().includes("medium")
    );
    const hard = qs.filter((q) => 
      (q.difficulty || "").toLowerCase().includes("hard")
    );

    // Interleave: take one from each bucket in rotation
    const distributed = [];
    const maxLen = Math.max(easy.length, medium.length, hard.length);
    
    for (let i = 0; i < maxLen; i++) {
      if (easy[i]) distributed.push(easy[i]);
      if (medium[i]) distributed.push(medium[i]);
      if (hard[i]) distributed.push(hard[i]);
    }

    return distributed;
  }, []);

  /**
   * Organize questions with distributed difficulty
   */
  const orderedQuestions = useMemo(() => {
    if (config.shuffleQuestions) {
      // First distribute by difficulty, then add some randomness within groups
      return distributeByDifficulty(questions);
    }
    return questions;
  }, [questions, config.shuffleQuestions, distributeByDifficulty]);

  // Pool of questions by difficulty for adaptive mode
  const questionPools = useMemo(() => {
    return {
      easy: questions.filter((q) => 
        (q.difficulty || "").toLowerCase().includes("easy")
      ),
      medium: questions.filter((q) => 
        (q.difficulty || "").toLowerCase().includes("medium")
      ),
      hard: questions.filter((q) => 
        (q.difficulty || "").toLowerCase().includes("hard")
      ),
    };
  }, [questions]);

  // Current question (may be adaptive or pre-ordered)
  const [adaptiveQueue, setAdaptiveQueue] = useState([]);
  
  // Initialize adaptive queue
  useEffect(() => {
    if (config.adaptiveDifficulty) {
      // Start with medium difficulty
      const initial = orderedQuestions.slice(0, 1);
      setAdaptiveQueue(initial);
    }
  }, [config.adaptiveDifficulty, orderedQuestions]);

  const currentQuestion = config.adaptiveDifficulty 
    ? adaptiveQueue[currentIndex] 
    : orderedQuestions[currentIndex];

  const totalQuestions = config.adaptiveDifficulty 
    ? Math.min(config.questionCount, questions.length)
    : orderedQuestions.length;

  // Timer effect
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

  /**
   * Get next question based on adaptive difficulty
   * If doing poorly (< 50% on last 3), give easier question
   * If doing well (> 80% on last 3), give harder question
   */
  const getNextAdaptiveQuestion = useCallback((recentAnswers) => {
    const answeredIds = new Set(Object.keys(answers));
    const correctCount = recentAnswers.filter(Boolean).length;
    const recentPerformance = recentAnswers.length > 0 
      ? correctCount / recentAnswers.length 
      : 0.5;

    let targetPool;
    if (recentPerformance < 0.4) {
      // Struggling - give easier question
      targetPool = questionPools.easy.filter((q) => !answeredIds.has(q.id || q.uniqueId));
      if (targetPool.length === 0) targetPool = questionPools.medium.filter((q) => !answeredIds.has(q.id || q.uniqueId));
    } else if (recentPerformance > 0.75) {
      // Doing well - give harder question
      targetPool = questionPools.hard.filter((q) => !answeredIds.has(q.id || q.uniqueId));
      if (targetPool.length === 0) targetPool = questionPools.medium.filter((q) => !answeredIds.has(q.id || q.uniqueId));
    } else {
      // Average - give medium question
      targetPool = questionPools.medium.filter((q) => !answeredIds.has(q.id || q.uniqueId));
      if (targetPool.length === 0) {
        targetPool = [...questionPools.easy, ...questionPools.hard].filter((q) => !answeredIds.has(q.id || q.uniqueId));
      }
    }

    // Fallback to any unanswered question
    if (targetPool.length === 0) {
      targetPool = questions.filter((q) => !answeredIds.has(q.id || q.uniqueId));
    }

    return targetPool.length > 0 ? targetPool[Math.floor(Math.random() * targetPool.length)] : null;
  }, [answers, questionPools, questions]);

  // Handle answer selection
  const handleAnswer = (answer) => {
    if (!currentQuestion) return;
    
    const questionId = currentQuestion.id || currentQuestion.uniqueId;
    const isCorrect = answer === currentQuestion.correct;

    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    
    // Track recent performance for adaptive mode
    const newRecent = [...recentCorrect, isCorrect].slice(-3);
    setRecentCorrect(newRecent);

    // Show immediate feedback if enabled
    if (config.showFeedback === "immediate") {
      setFeedbackShown(true);
    } else {
      // Auto-advance after brief delay
      setTimeout(() => handleNext(newRecent), 300);
    }
  };

  // Handle next question
  const handleNext = useCallback((updatedRecent = recentCorrect) => {
    setFeedbackShown(false);
    
    if (currentIndex + 1 >= totalQuestions) {
      setShowResults(true);
      return;
    }

    if (config.adaptiveDifficulty) {
      const nextQ = getNextAdaptiveQuestion(updatedRecent);
      if (nextQ) {
        setAdaptiveQueue((prev) => [...prev, nextQ]);
      }
    }

    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, totalQuestions, config.adaptiveDifficulty, getNextAdaptiveQuestion, recentCorrect]);

  // Calculate results
  const results = useMemo(() => {
    const questionsToCheck = config.adaptiveDifficulty ? adaptiveQueue : orderedQuestions;
    let correct = 0;
    const total = Object.keys(answers).length;

    questionsToCheck.forEach((q) => {
      const qId = q.id || q.uniqueId;
      if (answers[qId] === q.correct) {
        correct++;
      }
    });

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = percentage >= config.passingScore;

    return { correct, total, percentage, passed };
  }, [answers, orderedQuestions, adaptiveQueue, config]);

  // Start screen
  if (!quizStarted) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8">
            <Icon name="clipboard-list" size={64} className="mx-auto text-blue-400 mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">{config.title}</h1>
            <p className="text-slate-400">{config.description}</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 mb-8 text-left">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Questions:</span>
                <span className="text-white ml-2 font-semibold">{totalQuestions}</span>
              </div>
              <div>
                <span className="text-slate-400">Time Limit:</span>
                <span className="text-white ml-2 font-semibold">{config.timeLimit} min</span>
              </div>
              <div>
                <span className="text-slate-400">Passing Score:</span>
                <span className="text-white ml-2 font-semibold">{config.passingScore}%</span>
              </div>
              <div>
                <span className="text-slate-400">Difficulty:</span>
                <span className="text-white ml-2 font-semibold">
                  {config.adaptiveDifficulty ? "Adaptive" : "Mixed"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setQuizStarted(true)}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Icon name="play" size={18} />
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (showResults) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className={`mb-8 ${results.passed ? "text-green-400" : "text-red-400"}`}>
            <Icon 
              name={results.passed ? "check-circle" : "x-circle"} 
              size={80} 
              className="mx-auto mb-4" 
            />
            <h1 className="text-3xl font-bold mb-2">
              {results.passed ? "Congratulations!" : "Keep Practicing!"}
            </h1>
            <p className="text-slate-400">
              {results.passed 
                ? "You passed the assessment!" 
                : `You need ${config.passingScore}% to pass.`}
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 mb-8">
            <div className="text-6xl font-bold text-white mb-2">
              {results.percentage}%
            </div>
            <div className="text-slate-400">
              {results.correct} of {results.total} correct
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Quiz question screen
  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center">
        <p className="text-slate-400">No questions available</p>
      </div>
    );
  }

  const questionId = currentQuestion.id || currentQuestion.uniqueId;
  const selectedAnswer = answers[questionId];
  const isAnswered = selectedAnswer !== undefined;
  const isCorrect = selectedAnswer === currentQuestion.correct;

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-white font-semibold">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className={`text-xs px-2 py-1 rounded ${
              (currentQuestion.difficulty || "").toLowerCase().includes("easy") 
                ? "bg-green-900 text-green-400" 
                : (currentQuestion.difficulty || "").toLowerCase().includes("hard")
                  ? "bg-red-900 text-red-400"
                  : "bg-yellow-900 text-yellow-400"
            }`}>
              {currentQuestion.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className={`font-mono text-lg ${timeRemaining < 60 ? "text-red-400" : "text-white"}`}>
              <Icon name="clock" size={16} className="inline mr-2" />
              {formatTime(timeRemaining)}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <Icon name="x" size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-700">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl text-white mb-8 leading-relaxed">
            {currentQuestion.question}
          </h2>

          {/* Options */}
          <div className="space-y-4">
            {Object.entries(currentQuestion.options || {}).map(([key, value]) => {
              if (!value) return null;
              
              const isSelected = selectedAnswer === key;
              const showCorrect = feedbackShown && key === currentQuestion.correct;
              const showWrong = feedbackShown && isSelected && !isCorrect;

              return (
                <button
                  key={key}
                  onClick={() => !isAnswered && handleAnswer(key)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    showCorrect
                      ? "border-green-500 bg-green-900/30"
                      : showWrong
                        ? "border-red-500 bg-red-900/30"
                        : isSelected
                          ? "border-blue-500 bg-blue-900/30"
                          : "border-slate-600 hover:border-slate-500 bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isSelected ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"
                    }`}>
                      {key}
                    </span>
                    <span className="text-white flex-1">{value}</span>
                    {showCorrect && <Icon name="check" size={20} className="text-green-400" />}
                    {showWrong && <Icon name="x" size={20} className="text-red-400" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feedback / Next button */}
          {feedbackShown && (
            <div className="mt-8 text-center">
              <button
                onClick={() => handleNext()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                {currentIndex + 1 >= totalQuestions ? "See Results" : "Next Question"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPreview;
