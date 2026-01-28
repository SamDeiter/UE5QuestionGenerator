/**
 * UE5 Question Generator - SCORM Quiz Engine
 * Simplified quiz engine for Multiple Choice and True/False questions
 * Based on UE5ScenarioTracker but adapted for linear quiz format
 */

document.addEventListener("DOMContentLoaded", () => {
  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  const config = window.QUIZ_CONFIG || {
    title: "UE5 Knowledge Assessment",
    passingScore: 80,
    timeLimit: 1800, // 30 minutes in seconds
    totalQuestions: 0,
  };

  // Load all questions from bank
  const allQuestions = window.QUESTIONS || [];

  // ═══════════════════════════════════════════════════════════════
  // QUESTION SELECTION - 60 total (20 per difficulty)
  // ═══════════════════════════════════════════════════════════════

  const QUESTIONS_PER_DIFFICULTY = 20;
  const TARGET_TOTAL = 60;

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Select N random questions from an array
   */
  function selectRandom(array, count) {
    if (array.length <= count) return [...array];
    return shuffleArray(array).slice(0, count);
  }

  /**
   * Categorize questions by difficulty
   */
  function categorizeByDifficulty(questionList) {
    const easy = [];
    const medium = [];
    const hard = [];
    const unknown = [];

    questionList.forEach((q) => {
      const diff = (q.difficulty || "").toLowerCase();
      if (diff.includes("easy") || diff.includes("beginner")) {
        easy.push(q);
      } else if (diff.includes("medium") || diff.includes("intermediate")) {
        medium.push(q);
      } else if (
        diff.includes("hard") ||
        diff.includes("expert") ||
        diff.includes("advanced")
      ) {
        hard.push(q);
      } else {
        unknown.push(q);
      }
    });

    return { easy, medium, hard, unknown };
  }

  /**
   * Select 60 questions: 20 easy, 20 medium, 20 hard
   * Falls back to more from other categories if one is short
   */
  function selectQuizQuestions(questionList) {
    const { easy, medium, hard, unknown } =
      categorizeByDifficulty(questionList);

    // Select up to 20 from each category
    let selected = [];
    let remaining = TARGET_TOTAL;

    // Try to get 20 from each
    const easyPick = selectRandom(easy, QUESTIONS_PER_DIFFICULTY);
    const mediumPick = selectRandom(medium, QUESTIONS_PER_DIFFICULTY);
    const hardPick = selectRandom(hard, QUESTIONS_PER_DIFFICULTY);

    selected = [...easyPick, ...mediumPick, ...hardPick];
    remaining = TARGET_TOTAL - selected.length;

    // If we don't have 60 yet, fill from unknown category
    if (remaining > 0 && unknown.length > 0) {
      const unknownPick = selectRandom(unknown, remaining);
      selected = [...selected, ...unknownPick];
      remaining = TARGET_TOTAL - selected.length;
    }

    // If still short, try to get more from categories that have extras
    if (remaining > 0) {
      const allUnused = [
        ...easy.filter((q) => !easyPick.includes(q)),
        ...medium.filter((q) => !mediumPick.includes(q)),
        ...hard.filter((q) => !hardPick.includes(q)),
      ];
      const extraPick = selectRandom(allUnused, remaining);
      selected = [...selected, ...extraPick];
    }

    // Shuffle final selection so difficulties are mixed
    return shuffleArray(selected);
  }

  // Select questions for this quiz session
  const questions =
    allQuestions.length > TARGET_TOTAL
      ? selectQuizQuestions(allQuestions)
      : shuffleArray(allQuestions);

  console.log(
    `Quiz initialized: ${questions.length} questions selected from ${allQuestions.length} in bank`
  );

  // ═══════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════

  let currentQuestionIndex = 0;
  let answers = []; // Array of {questionId, selectedChoice, correct, timeSpent}
  let timeRemaining = config.timeLimit;
  let timerInterval = null;
  let questionStartTime = Date.now();

  // ═══════════════════════════════════════════════════════════════
  // DOM ELEMENTS
  // ═══════════════════════════════════════════════════════════════

  const timerDisplay = document.getElementById("countdown-timer");
  const questionContainer = document.getElementById("question-container");
  const resultsContainer = document.getElementById("results-container");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  // ═══════════════════════════════════════════════════════════════
  // SCORM INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  function initializeSCORM() {
    if (typeof window.SCORM12 !== "undefined") {
      const initialized = window.SCORM12.init();
      if (initialized) {
        console.log("SCORM initialized successfully");
        // Set initial status
        window.SCORM12.setStatus("incomplete");
        window.SCORM12.commit();
      } else {
        console.warn(
          "SCORM initialization failed - running in standalone mode"
        );
      }
    } else {
      console.log("SCORM not available - running in standalone mode");
    }
  }

  function reportScoreToSCORM(score, passed) {
    if (typeof window.SCORM12 !== "undefined" && window.SCORM12.isConnected()) {
      window.SCORM12.setScoreRaw(score, 0, 100);
      window.SCORM12.setStatus(passed ? "passed" : "failed");

      const totalTimeSpent = config.timeLimit - timeRemaining;
      window.SCORM12.setSessionTimeSeconds(totalTimeSpent);

      window.SCORM12.commit();
      window.SCORM12.finish();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TIMER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function updateTimer() {
    if (timeRemaining <= 0) {
      endQuiz("timeout");
      return;
    }

    timerDisplay.textContent = formatTime(timeRemaining);

    // Warning colors
    if (timeRemaining <= 60) {
      timerDisplay.classList.add("text-red-400", "animate-pulse");
    } else if (timeRemaining <= 300) {
      timerDisplay.classList.add("text-yellow-400");
    }

    timeRemaining--;
  }

  function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // QUIZ LOGIC
  // ═══════════════════════════════════════════════════════════════

  function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Question ${currentQuestionIndex + 1} of ${
      questions.length
    }`;
  }

  function renderQuestion() {
    const question = questions[currentQuestionIndex];
    questionStartTime = Date.now();

    updateProgress();

    // SECURITY: Do NOT expose correct answer in DOM (no data-correct attribute)
    // Correctness is checked server-side via question data at answer time
    const html = `
      <div class="bg-slate-800 rounded-lg p-6 shadow-xl">
        <h2 class="text-2xl font-bold text-blue-300 mb-4">${question.text}</h2>
        <div class="space-y-3">
          ${question.choices
            .map(
              (choice, index) => `
            <button 
              class="choice-btn w-full text-left p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border-2 border-slate-600 hover:border-blue-500 transition-all"
              data-index="${index}"
            >
              <span class="font-semibold">${choice.text}</span>
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    questionContainer.innerHTML = html;

    // Attach click handlers
    document.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => handleAnswer(btn));
    });
  }

  function handleAnswer(button) {
    const question = questions[currentQuestionIndex];
    const choiceIndex = parseInt(button.dataset.index);
    // SECURITY: Check correctness from question data, not DOM attribute
    const isCorrect = question.choices[choiceIndex].correct === true;
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    // Record answer
    answers.push({
      questionId: question.id,
      questionText: question.text,
      selectedChoice: question.choices[choiceIndex].text,
      correct: isCorrect,
      timeSpent: timeSpent,
    });

    // Testing mode: No correct/incorrect feedback - just show selection
    // This prevents test-takers from learning answers during the test

    // Disable all buttons to prevent double-click
    document.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("cursor-not-allowed", "opacity-40");
    });

    // IMPROVED: Show clear "selected" indicator on chosen answer
    button.classList.remove("opacity-40", "bg-slate-700", "border-slate-600");
    button.classList.add(
      "bg-blue-600",
      "border-blue-400",
      "ring-2",
      "ring-blue-400",
      "ring-offset-2",
      "ring-offset-slate-800",
      "opacity-100"
    );

    // Move to next question after brief delay (long enough to show selection clearly)
    setTimeout(() => {
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        renderQuestion();
      } else {
        endQuiz("completed");
      }
    }, 600);
  }

  function calculateScore() {
    const correctCount = answers.filter((a) => a.correct).length;
    const totalQuestions = answers.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    return {
      correct: correctCount,
      incorrect: totalQuestions - correctCount,
      total: totalQuestions,
      percentage: percentage,
      passed: percentage >= config.passingScore,
    };
  }

  function endQuiz(reason) {
    stopTimer();

    const score = calculateScore();
    const totalTimeSpent = config.timeLimit - timeRemaining;

    // Report to SCORM
    reportScoreToSCORM(score.percentage, score.passed);

    // Show results
    questionContainer.classList.add("hidden");
    resultsContainer.classList.remove("hidden");

    const resultHtml = `
      <div class="bg-slate-800 rounded-lg p-8 shadow-xl text-center">
        <h2 class="text-3xl font-bold mb-6 ${
          score.passed ? "text-green-400" : "text-red-400"
        }">
          ${score.passed ? "✓ Assessment Passed!" : "✗ Assessment Not Passed"}
        </h2>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-slate-900 p-4 rounded">
            <div class="text-4xl font-bold text-blue-400">${
              score.percentage
            }%</div>
            <div class="text-sm text-slate-400">Final Score</div>
          </div>
          <div class="bg-slate-900 p-4 rounded">
            <div class="text-4xl font-bold text-green-400">${
              score.correct
            }</div>
            <div class="text-sm text-slate-400">Correct Answers</div>
          </div>
          <div class="bg-slate-900 p-4 rounded">
            <div class="text-4xl font-bold text-red-400">${
              score.incorrect
            }</div>
            <div class="text-sm text-slate-400">Incorrect Answers</div>
          </div>
          <div class="bg-slate-900 p-4 rounded">
            <div class="text-4xl font-bold text-purple-400">${formatTime(
              totalTimeSpent
            )}</div>
            <div class="text-sm text-slate-400">Time Spent</div>
          </div>
        </div>
        
        <div class="text-sm text-slate-400 mb-4">
          Passing Score: ${config.passingScore}%
        </div>
        
        ${
          reason === "timeout"
            ? `
          <div class="bg-yellow-900/20 border border-yellow-500/50 rounded p-3 mb-4">
            <p class="text-yellow-400">⏱ Time limit reached</p>
          </div>
        `
            : ""
        }
        
        <button 
          onclick="window.close()" 
          class="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          Close Assessment
        </button>
      </div>
    `;

    resultsContainer.innerHTML = resultHtml;
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  function init() {
    // Initialize SCORM
    initializeSCORM();

    // Validate questions
    if (!questions || questions.length === 0) {
      questionContainer.innerHTML = `
        <div class="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <h2 class="text-xl font-bold text-red-400 mb-2">No Questions Available</h2>
          <p class="text-slate-300">This assessment package contains no questions.</p>
        </div>
      `;
      return;
    }

    // Start quiz
    startTimer();
    renderQuestion();
  }

  // Start the quiz
  init();
});
