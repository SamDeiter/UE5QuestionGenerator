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
    questionsPerAttempt: null, // If set, randomly select this many questions per attempt
    shuffleQuestions: true,
    shuffleChoices: true, // Randomize answer order per question (labels stay A/B/C/D)
    adaptiveDifficulty: true,
  };

  // Decode base64 encoded questions (prevents casual view-source cheating)
  // Performance: one-time decode at page load (~2-5ms for 100+ questions)
  const rawQuestions = (() => {
    if (window.QUESTIONS_ENCODED) {
      try {
        return JSON.parse(atob(window.QUESTIONS_ENCODED));
      } catch (e) {
        console.error("Failed to decode questions:", e);
        return [];
      }
    }
    return window.QUESTIONS || [];
  })();

  // STATE
  // ═══════════════════════════════════════════════════════════════

  let currentQuestionIndex = 0;
  let answers = []; // Array of {questionId, selectedChoice, correct, timeSpent}
  let timeRemaining = config.timeLimit;
  let timerInterval = null;
  let questionStartTime = Date.now();
  let attemptToken = null;
  let quizCompleted = false;
  let wrongStreak = 0; // Track consecutive wrong answers for adaptive difficulty
  let questions = []; // Shuffled/balanced question list

  // ═══════════════════════════════════════════════════════════════
  // SECURITY STATE
  // ═══════════════════════════════════════════════════════════════

  let tabSwitchCount = 0;
  let isLocked = false;
  const ATTEMPT_STORAGE_KEY = "scorm_quiz_attempt";
  const TAB_ID_KEY = "scorm_quiz_tab_id";
  const MAX_TAB_SWITCHES = 3; // Allow 3 tab switches before warning

  // ═══════════════════════════════════════════════════════════════
  // SECURITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate unique attempt token
   */
  function generateAttemptToken() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `attempt_${timestamp}_${randomPart}`;
  }

  /**
   * Get or create tab ID
   */
  function getTabId() {
    let tabId = sessionStorage.getItem(TAB_ID_KEY);
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem(TAB_ID_KEY, tabId);
    }
    return tabId;
  }

  /**
   * Lock the current attempt to prevent restart
   */
  function lockAttempt() {
    const existing = sessionStorage.getItem(ATTEMPT_STORAGE_KEY);
    if (existing && !isLocked) {
      // There's already an active attempt
      const attemptData = JSON.parse(existing);
      if (attemptData.tabId !== getTabId()) {
        showSecurityWarning(
          "This quiz is already open in another tab. Please close other tabs to continue."
        );
        isLocked = true;
        return false;
      }
    }

    attemptToken = generateAttemptToken();
    const attemptData = {
      token: attemptToken,
      tabId: getTabId(),
      startedAt: new Date().toISOString(),
    };

    sessionStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(attemptData));
    console.log("[Quiz Security] Attempt locked:", attemptToken);
    return true;
  }

  /**
   * Clear attempt lock on completion
   */
  function clearAttempt() {
    quizCompleted = true;
    sessionStorage.removeItem(ATTEMPT_STORAGE_KEY);
    console.log("[Quiz Security] Attempt cleared - quiz completed");
  }

  /**
   * Show security warning overlay
   */
  function showSecurityWarning(message) {
    let overlay = document.getElementById("security-warning-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "security-warning-overlay";
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.9); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        flex-direction: column; color: white; text-align: center; padding: 40px;
      `;
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div style="max-width: 500px;">
        <svg style="width: 80px; height: 80px; margin-bottom: 20px; color: #f59e0b;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <h2 style="font-size: 24px; margin-bottom: 16px;">⚠️ Security Warning</h2>
        <p style="font-size: 16px; margin-bottom: 24px; opacity: 0.9;">${message}</p>
        <button onclick="document.getElementById('security-warning-overlay').style.display='none'" 
                style="padding: 12px 24px; background: #3b82f6; border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 16px;">
          I Understand
        </button>
      </div>
    `;
    overlay.style.display = "flex";
  }

  /**
   * Initialize security event listeners
   */
  function initSecurityListeners() {
    // Visibility change detection (tab switching)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !quizCompleted) {
        tabSwitchCount++;
        console.log(
          "[Quiz Security] Tab switch detected. Count:",
          tabSwitchCount
        );

        if (tabSwitchCount >= MAX_TAB_SWITCHES) {
          showSecurityWarning(
            `You have switched away from this quiz ${tabSwitchCount} times. ` +
              "This activity is being recorded. Please stay on this page to complete your assessment."
          );
        }
      }
    });

    // Window blur detection
    window.addEventListener("blur", () => {
      if (!quizCompleted) {
        console.log("[Quiz Security] Window lost focus");
      }
    });

    // Prevent back button
    history.pushState(null, "", location.href);
    window.addEventListener("popstate", () => {
      if (!quizCompleted) {
        history.pushState(null, "", location.href);
        showSecurityWarning(
          "The back button has been disabled during this assessment. Please use the quiz navigation."
        );
      }
    });

    // Context menu prevention (optional - remove right-click)
    document.addEventListener("contextmenu", (e) => {
      if (!quizCompleted) {
        e.preventDefault();
        return false;
      }
    });

    // Keyboard shortcut prevention (F12, Ctrl+Shift+I, etc.)
    document.addEventListener("keydown", (e) => {
      if (!quizCompleted) {
        // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (
          e.key === "F12" ||
          (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
          (e.ctrlKey && e.key === "u")
        ) {
          e.preventDefault();
          return false;
        }

        // Prevent copy, cut, paste (Ctrl+C, Ctrl+X, Ctrl+V)
        if (
          e.ctrlKey &&
          (e.key === "c" ||
            e.key === "x" ||
            e.key === "v" ||
            e.key === "C" ||
            e.key === "X" ||
            e.key === "V")
        ) {
          e.preventDefault();
          console.log("[Quiz Security] Copy/paste attempt blocked");
          return false;
        }

        // Prevent print (Ctrl+P)
        if (e.ctrlKey && (e.key === "p" || e.key === "P")) {
          e.preventDefault();
          console.log("[Quiz Security] Print attempt blocked");
          return false;
        }

        // Prevent select all (Ctrl+A)
        if (e.ctrlKey && (e.key === "a" || e.key === "A")) {
          e.preventDefault();
          return false;
        }
      }
    });

    // Prevent text selection via CSS and events
    document.addEventListener("selectstart", (e) => {
      if (!quizCompleted) {
        e.preventDefault();
        return false;
      }
    });

    // Prevent drag
    document.addEventListener("dragstart", (e) => {
      if (!quizCompleted) {
        e.preventDefault();
        return false;
      }
    });

    // Prevent copy/paste via clipboard events
    document.addEventListener("copy", (e) => {
      if (!quizCompleted) {
        e.preventDefault();
        return false;
      }
    });

    document.addEventListener("paste", (e) => {
      if (!quizCompleted) {
        e.preventDefault();
        return false;
      }
    });

    document.addEventListener("cut", (e) => {
      if (!quizCompleted) {
        e.preventDefault();
        return false;
      }
    });

    // DevTools detection via console timing (detects if console is open)
    let devToolsOpen = false;
    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if (
        (widthThreshold || heightThreshold) &&
        !devToolsOpen &&
        !quizCompleted
      ) {
        devToolsOpen = true;
        console.log("[Quiz Security] DevTools detected");
        showSecurityWarning(
          "Developer tools have been detected. This activity is being recorded."
        );
      } else if (!widthThreshold && !heightThreshold) {
        devToolsOpen = false;
      }
    };

    // Check for DevTools periodically
    setInterval(detectDevTools, 1000);

    // Beforeunload warning
    window.addEventListener("beforeunload", (e) => {
      if (!quizCompleted && currentQuestionIndex > 0) {
        e.preventDefault();
        e.returnValue =
          "You have an assessment in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    });

    console.log("[Quiz Security] All security listeners initialized");
  }

  // ═══════════════════════════════════════════════════════════════
  // SHUFFLE & ADAPTIVE DIFFICULTY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Fisher-Yates shuffle
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
   * Shuffle answer choices for a question
   * Labels (A/B/C/D) stay fixed, content is randomized
   * True/False questions are NEVER shuffled - True always appears first
   * @param {Array} choices - Array of choice objects with text and correct properties
   * @returns {Array} Shuffled choices array
   */
  function shuffleChoices(choices) {
    if (!config.shuffleChoices || !choices || choices.length <= 1) {
      return choices;
    }

    // Detect True/False questions - never shuffle these
    const isTrueFalse =
      choices.length === 2 &&
      choices.some((c) => c.text.toLowerCase() === "true") &&
      choices.some((c) => c.text.toLowerCase() === "false");

    if (isTrueFalse) {
      // Ensure True is always first, False second (standard convention)
      return [...choices].sort((a) =>
        a.text.toLowerCase() === "true" ? -1 : 1
      );
    }

    return shuffleArray(choices);
  }

  /**
   * Build balanced question list with difficulty interleaving
   * Interleaves Easy-Medium-Hard for optimal learning progression
   */
  function buildBalancedQuestionList(inputQuestions) {
    const easy = inputQuestions.filter((q) =>
      (q.difficulty || "").toLowerCase().includes("easy")
    );
    const medium = inputQuestions.filter((q) =>
      (q.difficulty || "").toLowerCase().includes("medium")
    );
    const hard = inputQuestions.filter((q) =>
      (q.difficulty || "").toLowerCase().includes("hard")
    );
    const other = inputQuestions.filter((q) => {
      const diff = (q.difficulty || "").toLowerCase();
      return (
        !diff.includes("easy") &&
        !diff.includes("medium") &&
        !diff.includes("hard")
      );
    });

    // Shuffle each pool
    const shuffledEasy = shuffleArray(easy);
    const shuffledMedium = shuffleArray(medium);
    const shuffledHard = shuffleArray(hard);
    const shuffledOther = shuffleArray(other);

    // Interleave: E-M-H pattern
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

    // Add any uncategorized questions at the end
    distributed.push(...shuffledOther);

    return distributed;
  }

  /**
   * Apply confidence boost - swap in easier question after wrong streak
   */
  function applyConfidenceBoost() {
    if (!config.adaptiveDifficulty || wrongStreak < 2) return;

    const upcomingQuestions = questions.slice(currentQuestionIndex + 1);
    const answeredIds = new Set(answers.map((a) => a.questionId));

    const easyIndex = upcomingQuestions.findIndex(
      (q) =>
        (q.difficulty || "").toLowerCase().includes("easy") &&
        !answeredIds.has(q.id)
    );

    if (easyIndex > 0) {
      // Swap easier question to next position
      const realIndex = currentQuestionIndex + 1 + easyIndex;
      const temp = questions[currentQuestionIndex + 1];
      questions[currentQuestionIndex + 1] = questions[realIndex];
      questions[realIndex] = temp;
      console.log("[Adaptive] Swapped in easier question for confidence boost");
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ANTI-CHEAT SECURITY
  // ═══════════════════════════════════════════════════════════════

  const ATTEMPT_KEY = "ue5_scorm_active_attempt";
  const CHANNEL_NAME = "ue5_scorm_coordination";
  let broadcastChannel = null;

  /**
   * Generate unique attempt token
   */
  function generateAttemptToken() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return "scorm_" + timestamp + "_" + randomPart;
  }

  /**
   * Lock attempt in sessionStorage
   */
  function lockAttempt(token) {
    const existing = sessionStorage.getItem(ATTEMPT_KEY);
    if (existing) {
      console.warn("[Security] Attempt already active:", existing);
      return false;
    }
    sessionStorage.setItem(
      ATTEMPT_KEY,
      JSON.stringify({
        token: token,
        startedAt: new Date().toISOString(),
      })
    );
    broadcastAttemptStart(token);
    return true;
  }

  /**
   * Check if attempt is active
   */
  function isAttemptActive() {
    return sessionStorage.getItem(ATTEMPT_KEY) !== null;
  }

  /**
   * Clear attempt on completion
   */
  function clearAttempt() {
    sessionStorage.removeItem(ATTEMPT_KEY);
    quizCompleted = true;
  }

  /**
   * Prevent back navigation using history API
   */
  function preventBackNavigation() {
    window.history.pushState({ quizActive: true }, "");
    window.addEventListener("popstate", function () {
      if (!quizCompleted) {
        window.history.pushState({ quizActive: true }, "");
        console.log("[Security] Back navigation blocked");
      }
    });
  }

  /**
   * Add beforeunload warning
   */
  function enableUnloadWarning() {
    window.addEventListener("beforeunload", function (e) {
      if (!quizCompleted) {
        e.preventDefault();
        e.returnValue =
          "You have an active quiz. Are you sure you want to leave?";
        return e.returnValue;
      }
    });
  }

  /**
   * Initialize multi-tab detection
   */
  function initMultiTabDetection() {
    // Try BroadcastChannel first
    if (typeof BroadcastChannel !== "undefined") {
      try {
        broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        broadcastChannel.onmessage = function (event) {
          if (event.data.type === "ATTEMPT_START" && !quizCompleted) {
            console.warn("[Security] Another tab started a quiz attempt");
          }
          if (event.data.type === "QUERY_ACTIVE" && isAttemptActive()) {
            broadcastChannel.postMessage({
              type: "ACTIVE_RESPONSE",
              token: attemptToken,
            });
          }
          if (event.data.type === "ACTIVE_RESPONSE") {
            showDuplicateWarning();
          }
        };
        // Query other tabs
        setTimeout(function () {
          broadcastChannel.postMessage({ type: "QUERY_ACTIVE" });
        }, 100);
      } catch (err) {
        console.warn("[Security] BroadcastChannel failed:", err);
      }
    }
  }

  /**
   * Broadcast attempt start
   */
  function broadcastAttemptStart(token) {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: "ATTEMPT_START", token: token });
    }
  }

  /**
   * Show duplicate attempt warning
   */
  function showDuplicateWarning() {
    questionContainer.innerHTML = `
      <div class="bg-yellow-900/30 border border-yellow-500 rounded-lg p-8 text-center">
        <h2 class="text-2xl font-bold text-yellow-400 mb-4">Quiz Already Active</h2>
        <p class="text-slate-300 mb-4">Another browser tab is already running this quiz.</p>
        <p class="text-slate-400 text-sm">Please complete or close that attempt first.</p>
      </div>
    `;
  }

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

    // Shuffle choices for this question (labels A/B/C/D stay fixed, content shuffles)
    const shuffledChoices = shuffleChoices(question.choices);
    // Store shuffled choices on the question for handleAnswer to access
    question._shuffledChoices = shuffledChoices;

    // Detect True/False question type (via type property or choice detection)
    const isTrueFalse =
      question.type === "True/False" ||
      (shuffledChoices.length === 2 &&
        shuffledChoices.some((c) => c.text.toLowerCase() === "true") &&
        shuffledChoices.some((c) => c.text.toLowerCase() === "false"));

    const labels = ["A", "B", "C", "D", "E", "F", "G", "H"]; // Support up to 8 choices

    // Get appropriate label for choice
    const getLabel = (index, choiceText) => {
      if (isTrueFalse) {
        // Use T/F labels for True/False questions (case-insensitive comparison)
        return choiceText.toLowerCase() === "true" ? "T" : "F";
      }
      return labels[index] || String(index + 1);
    };

    const html = `
      <div class="bg-slate-800 rounded-lg p-6 shadow-xl">
        <h2 class="text-2xl font-bold text-blue-300 mb-4">${question.text}</h2>
        <div class="space-y-3">
          ${shuffledChoices
            .map(
              (choice, index) => `
            <button 
              class="choice-btn w-full text-left p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-blue-500 transition-all"
              data-index="${index}"
              data-correct="${choice.correct}"
            >
              <span class="inline-block w-8 h-8 mr-3 bg-slate-600 rounded text-center leading-8 font-bold text-blue-300">${getLabel(index, choice.text)}</span>
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
    const isCorrect = button.dataset.correct === "true";
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    // Use shuffled choices if available (for recording the correct text)
    const choices = question._shuffledChoices || question.choices;

    // Record answer
    answers.push({
      questionId: question.id,
      questionText: question.text,
      selectedChoice: choices[choiceIndex].text,
      correct: isCorrect,
      timeSpent: timeSpent,
    });

    // Report to SCORM as cmi.interactions (optional, non-breaking)
    // This allows LMS to show which questions were asked and how learner responded
    try {
      if (
        typeof window.SCORM12 !== "undefined" &&
        window.SCORM12.isConnected() &&
        window.SCORM12.setInteraction
      ) {
        // Find correct answer text
        const correctChoice = choices.find((c) => c.correct);
        const correctText = correctChoice ? correctChoice.text : "";

        window.SCORM12.setInteraction(currentQuestionIndex, {
          id: question.id || "q" + currentQuestionIndex,
          type: "choice",
          studentResponse: choices[choiceIndex].text.substring(0, 255), // SCORM 1.2 length limit
          correctResponse: correctText.substring(0, 255),
          result: isCorrect ? "correct" : "wrong",
          latency: timeSpent,
        });
      }
    } catch (interactionError) {
      // Never break quiz for interaction tracking failure
      console.warn(
        "[SCORM] Interaction tracking failed (non-critical):",
        interactionError
      );
    }

    // Track wrong streak for adaptive difficulty
    if (isCorrect) {
      wrongStreak = 0;
    } else {
      wrongStreak++;
    }

    // Visual feedback - neutral "selected" style (does NOT reveal correctness)
    // Uses blue highlight to indicate the selected answer without showing right/wrong
    button.style.cssText =
      "background: #2563eb !important; border-color: #3b82f6 !important; color: white !important;";

    // Disable all buttons
    document.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("cursor-not-allowed");
    });

    // Apply confidence boost before moving to next question
    applyConfidenceBoost();

    // Move to next question after delay
    setTimeout(() => {
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        renderQuestion();
      } else {
        endQuiz("completed");
      }
    }, 1500);
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

    // Clear the attempt lock on completion
    clearAttempt();

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
          id="close-assessment-btn"
          class="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          Close Assessment
        </button>
        <p id="close-message" class="mt-2 text-sm text-slate-400 hidden">
          Assessment complete. You may now close this window or navigate away.
        </p>
      </div>
    `;

    resultsContainer.innerHTML = resultHtml;

    // Attach close button handler (window.close() may fail in LMS iframe context)
    const closeBtn = document.getElementById("close-assessment-btn");
    const closeMsg = document.getElementById("close-message");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        // Try to close the window
        window.close();

        // If we're still here, window.close() failed (common in LMS iframes)
        // Hide the button and show a friendly message instead
        if (closeMsg) {
          closeMsg.classList.remove("hidden");
        }
        closeBtn.style.display = "none";
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  function init() {
    // Initialize SCORM
    initializeSCORM();

    // Initialize security features
    initSecurityListeners();

    // Lock the attempt
    if (!lockAttempt()) {
      console.warn(
        "[Security] Could not lock attempt - quiz may be open in another tab"
      );
    }

    // Validate questions
    if (!rawQuestions || rawQuestions.length === 0) {
      questionContainer.innerHTML = `
        <div class="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <h2 class="text-xl font-bold text-red-400 mb-2">No Questions Available</h2>
          <p class="text-slate-300">This assessment package contains no questions.</p>
        </div>
      `;
      return;
    }

    // Build balanced, shuffled question list
    if (config.shuffleQuestions) {
      questions = buildBalancedQuestionList(rawQuestions);
      console.log(
        "[Quiz] Shuffled and balanced",
        questions.length,
        "questions"
      );
    } else {
      questions = [...rawQuestions];
    }

    // Limit to questionsPerAttempt if configured (runtime random selection)
    if (
      config.questionsPerAttempt &&
      config.questionsPerAttempt < questions.length
    ) {
      questions = questions.slice(0, config.questionsPerAttempt);
      console.log(
        "[Quiz] Limited to",
        config.questionsPerAttempt,
        "questions for this attempt"
      );
    }

    // Start quiz
    startTimer();
    renderQuestion();
  }

  // Start the quiz
  init();
});
