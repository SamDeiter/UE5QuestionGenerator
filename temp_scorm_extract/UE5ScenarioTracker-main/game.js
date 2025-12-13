// Wait for the DOM to be fully loaded before running the game logic
document.addEventListener('DOMContentLoaded', () => {

    // --- GLOBAL CONFIGURATION ---
    const TOTAL_TEST_TIME_SECONDS = 30 * 60; // Total 30 minutes for the assessment countdown timer
    const LOW_TIME_WARNING_SECONDS = 5 * 60; // Time remaining threshold to trigger pulsing red timer
    const PASS_THRESHOLD = 0.80; // Pass if (Ideal Time / Logged Time) >= 80%
    const DEBUG_PASSWORD = 'IloveUnreal'; // Secret password to enable Debug Mode

    // --- DEBUG ACCESS STATE ---
    let debugAccessState = {
        passwordModalVisible: false // Tracks if the password input is currently shown
    };

    // --- DOM ELEMENT CACHE ---
    // Note: Removed unused variables related to audit features and hard reset UI.
    let headerControls, backlogList, ticketViewColumn, ticketPlaceholder, 
        ticketContent, ticketTitle, ticketDescription, ticketStepContent,
        debugToggle, countdownTimer, jiraBoard, timesUpScreen, 
        debugDropdown; 
    
    let timerContainer; // Parent container for the countdown timer

    // --- CORE GAME STATE ---
    let scenarioState = {}; // Stores progress, time logged, and choices for each scenario (Ticket)
    let currentScenarioId = null; // Key of the scenario currently displayed (e.g., 'golem')
    let currentStepId = null; // Key of the current question step within the scenario
    let interruptedSteps = {}; // Stores the last active step for non-completed scenarios
    let isDebugMode = false; // Flag for debug visualization/controls
    let mainTimerInterval = null; // ID for the setInterval used for the 30-minute countdown
    
    let timeRemaining = TOTAL_TEST_TIME_SECONDS; // Remaining time on the countdown timer
    
	// --- ENCODING UTILITIES (Restored for Test Key Generation) ---
    /**
     * Encodes a string to a Unicode-safe Base64 string.
     * @param {string} str - The string to encode.
     * @returns {string} The Base64 encoded string.
     */
    function base64EncodeUnicode(str) {
        const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function(match, p1) {
                return String.fromCharCode('0x' + p1);
            });
            return btoa(utf8Bytes);
    }
    
	// --- TIMER & TIME UTILITIES ---
    
    /**
     * Converts total seconds into MM:SS format for display.
     * @param {number} totalSeconds - Total seconds remaining.
     * @returns {string} Formatted time string (MM:SS).
     */
    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Calculates the time cost in hours based on the choice type.
     * @param {string} type - 'correct', 'partial', 'misguided', 'wrong'.
     * @returns {number} Time cost in hours.
     */
    function getTimeCostForChoice(type) {
        switch (type) {
            case 'correct':
                return 0.5; // Optimal
            case 'partial':
                return 1.0; // Standard
            case 'misguided':
                return 1.5; // Extended
            case 'wrong':
                return 2.0; // Maximum
            default:
                return 0;
        }
    }

    // --- TIMER LOGIC ---
    
    /**
     * Updates the main timer display, applies visual cues, and handles expiry.
     */
    function updateMainTimerDisplay() {
        // 1. Update Display
        countdownTimer.textContent = formatTime(timeRemaining);
        
        // 2. Update Color/Pulse based on time left
        countdownTimer.classList.remove('pulse-red', 'text-blue-300', 'text-yellow-400', 'text-orange-400', 'text-green-500');
        if (timeRemaining <= LOW_TIME_WARNING_SECONDS && timeRemaining > 0) {
            countdownTimer.classList.add('text-yellow-400', 'pulse-red');
        } else if (timeRemaining > 0) {
            countdownTimer.classList.add('text-blue-300');
        }

        // 3. Time's Up Check
        if (timeRemaining <= 0) {
            endGameByTime();
            return;
        }

        // 4. Decrement
        timeRemaining--;
        
        // 5. Save remaining time to Local Storage
        localStorage.setItem('ue5ScenarioTimer', timeRemaining.toString());
    }

    /**
     * Starts the main 30-minute countdown timer.
     */
    function startMainTimer(isInitialStart = false) {
        // Load time state
        if (isInitialStart) {
            timeRemaining = TOTAL_TEST_TIME_SECONDS;
            localStorage.removeItem('ue5ScenarioTimer');
        } else {
            const savedTime = localStorage.getItem('ue5ScenarioTimer');
            if (savedTime !== null) {
                timeRemaining = parseInt(savedTime, 10);
            } else {
                timeRemaining = TOTAL_TEST_TIME_SECONDS;
            }
        }
        
        // CRITICAL FIX: Ensure timer container is visible if time is > 0
        if (timerContainer && timeRemaining > 0) {
            timerContainer.classList.remove('hidden');
        }

        if (mainTimerInterval) clearInterval(mainTimerInterval);
        
        if (timeRemaining > 0) {
             updateMainTimerDisplay(); // Initial display update
             mainTimerInterval = setInterval(updateMainTimerDisplay, 1000); // Start the 1-second interval
        } else {
             endGameByTime(); // Time already ran out
        }
    }
    
    /**
     * Pauses the countdown timer without clearing state.
     */
    function pauseMainTimer() {
        if (mainTimerInterval) {
            clearInterval(mainTimerInterval);
            mainTimerInterval = null;
        }
    }
    
    /**
     * Resumes the countdown timer only if the assessment is incomplete.
     */
    function resumeMainTimer() {
        if (!mainTimerInterval) {
            const allComplete = Object.values(scenarioState).every(state => state.completed);
            if (!allComplete) {
                mainTimerInterval = setInterval(updateMainTimerDisplay, 1000);
            }
        }
    }

    // --- CORE GAME INITIALIZATION ---

    /**
     * Toggles the Debug Mode state and updates the UI visibility.
     */
    function toggleDebugMode(forceDisable = false) {
        if (forceDisable) {
            isDebugMode = false;
        } else {
            isDebugMode = !isDebugMode;
        }
        
        // Manually toggle UI state
        if (debugDropdown) {
            debugDropdown.classList.toggle('hidden', !isDebugMode);
        }
        
        // Update internal logic based on new mode
        if (isDebugMode) {
            pauseMainTimer();
            // Allow copying/inspection in debug mode
            document.body.classList.remove('unselectable');
        } else {
            resumeMainTimer();
            // Re-enable security when exiting debug mode
            document.body.classList.add('unselectable');
        }
        
        // Update the visual status of the hidden toggle (for consistency)
        if (debugToggle) {
            debugToggle.checked = isDebugMode;
        }
        
        // Re-render current step to show/hide hints if a ticket is open
        if (currentScenarioId && currentStepId) {
            renderStep(currentScenarioId, currentStepId);
        }
    }

    /**
     * Shows the password input modal when the secret key combination is pressed.
     */
    function showPasswordModal() {
        if (debugAccessState.passwordModalVisible) return;
        debugAccessState.passwordModalVisible = true;

        const modalHtml = `
            <div id="password-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 z-[999] flex items-center justify-center">
                <div class="bg-gray-800 p-8 rounded-xl shadow-2xl text-center max-w-sm w-full">
                    <h3 class="text-xl font-bold text-blue-400 mb-4">Administrator Access Required</h3>
                    <p class="text-gray-300 mb-6">Enter the password to enable Debug Mode:</p>
                    <input type="password" id="password-input" placeholder="Password..." 
                           class="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-yellow-300 focus:ring-blue-500 focus:border-blue-500 text-center mb-4">
                    <div class="flex justify-around space-x-3">
                        <button id="submit-password" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-all duration-200">
                            Enable
                        </button>
                        <button id="cancel-password" class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 rounded-lg transition-all duration-200">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('password-modal');
        const input = document.getElementById('password-input');
        
        input.focus();

        const cleanup = () => {
            modal.remove();
            debugAccessState.passwordModalVisible = false;
        };

        const checkPassword = () => {
            if (input.value === DEBUG_PASSWORD) {
                toggleDebugMode(); // Enable Debug Mode
                cleanup();
            } else {
                input.value = '';
                input.placeholder = 'Incorrect Password!';
                input.classList.add('ring-2', 'ring-red-500');
                setTimeout(() => {
                    input.classList.remove('ring-2', 'ring-red-500');
                }, 1000);
            }
        };

        document.getElementById('submit-password').addEventListener('click', checkPassword);
        document.getElementById('cancel-password').addEventListener('click', cleanup);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                checkPassword();
            } else if (e.key === 'Escape') {
                cleanup();
            }
        });
    }


    /**
     * The primary entry point for setting up the game state.
     */
    function initializeApp() {
        
        // 1. --- AGGRESSIVE STATE CHECK AND RESET (Fixes infinite modal loop) ---
        const savedStateJSON = localStorage.getItem('ue5ScenarioState');
        let initialScenarioState = {};
        let allCompleteOnLoad = false;
        
        if (savedStateJSON) {
            try {
                initialScenarioState = JSON.parse(savedStateJSON);
            } catch (e) {
                console.error("Initial load failed, resetting saved state.");
            }
        }
        
        // Determine completion state based on potentially loaded data
        if (Object.keys(initialScenarioState).length > 0) {
             allCompleteOnLoad = Object.values(initialScenarioState).every(s => s.completed);
        }
        
        // CRITICAL FIX: If completed, clear the state immediately so the next load starts clean.
        let showCompletionModal = false;
        if (allCompleteOnLoad) {
            // We set a flag to show the modal *this time*
            showCompletionModal = true;
            
            // Then, we clear the data immediately so the next load gets a clean start.
            localStorage.removeItem('ue5ScenarioState'); // Clears the completion status
            localStorage.removeItem('ue5InterruptedSteps');
            localStorage.removeItem('ue5ActiveScenario');
            localStorage.removeItem('ue5ActiveStep');
            localStorage.removeItem('ue5ScenarioTimer'); 
        }
        // --- END AGGRESSIVE STATE CHECK ---

        // 2. Load data from local storage (this loads a default clean state if the state was just cleared above)
        loadScenarioState();
        loadInterruptedSteps();
        
        // 3. Check for crash recovery / active scenario
        const activeScenarioId = localStorage.getItem('ue5ActiveScenario');
        const activeStepId = localStorage.getItem('ue5ActiveStep');
        
        // 4. Start the timer (handles loading saved time or 30:00)
        startMainTimer();

        // 5. Render the backlog
        renderBacklog();
        
        // 6. Recover the active ticket view if the state was saved
        if (activeScenarioId && activeStepId) {
             selectScenario(activeScenarioId, activeStepId);
        }
        
        // 7. If completed on load, stop the timer and show the final modal immediately.
        if (showCompletionModal) { 
            if (timerContainer) {
                timerContainer.classList.add('hidden');
            }
            toggleDebugMode(true); // Ensure debug mode is off
            stopTimerOnComplete();
            
            // Use the initial state's data (which still holds the score) to show the final modal
            let totalLoggedTime = Object.values(initialScenarioState).reduce((acc, s) => acc + s.loggedTime, 0);

            showAssessmentModal('complete', totalLoggedTime, initialScenarioState); 
        }

        // 8. Initialize debug UI state (Dropdown is always hidden on start)
        if (debugDropdown) {
             debugDropdown.classList.add('hidden');
        }
    }
	
    // --- CORE INITIALIZATION HELPERS ---
    
    /**
     * Finds and assigns all necessary DOM elements to global variables.
     */
    function cacheDOMElements() {
        headerControls = document.getElementById('header-controls');
        backlogList = document.getElementById('backlog-list');
        ticketViewColumn = document.getElementById('ticket-view-column');
        ticketPlaceholder = document.getElementById('ticket-placeholder');
        ticketContent = document.getElementById('ticket-content');
        ticketTitle = document.getElementById('ticket-title');
        ticketDescription = document.getElementById('ticket-description');
        ticketStepContent = document.getElementById('ticket-step-content');
        debugToggle = document.getElementById('debug-toggle'); 
        countdownTimer = document.getElementById('countdown-timer');
        jiraBoard = document.getElementById('jira-board');
        timesUpScreen = document.getElementById('times-up-screen');
        // 'restartTimerBtn' was unused and removed.
        debugDropdown = document.getElementById('debug-dropdown'); 
        // 'testKeyInput', 'loadKeyBtn', 'hardResetBtn' were unused and removed.
        
        // Cache the timer's parent div for visibility control
        timerContainer = countdownTimer ? countdownTimer.parentElement : null; 
    }
    
    /**
     * Checks if the test is currently running (i.e., not fully completed).
     * @returns {boolean} True if the assessment is not yet fully complete.
     */
    function isTestRunning() {
        const allComplete = Object.values(scenarioState).every(state => state.completed);
        return !allComplete;
    }
    
    /**
     * Attaches all primary event listeners.
     */
    function attachEventListeners() {
        const hardResetBtn = document.getElementById('hard-reset-btn'); // Local variable for local usage
        
        // --- ADMIN ACCESS (CTRL + SHIFT + DELETE + Password Gate) ---
        document.addEventListener('keydown', (e) => {
            // Check for the combination: CTRL + SHIFT + DELETE (KeyCode 46 is Delete on most systems)
            if (e.ctrlKey && e.shiftKey && (e.key === 'Delete' || e.keyCode === 46)) {
                e.preventDefault();
                // If Debug Mode is already on, the combination turns it off without a password
                if (isDebugMode) {
                    toggleDebugMode(true); // Force Disable
                } else if (!debugAccessState.passwordModalVisible) {
                    showPasswordModal();
                }
            }
        });
        
        // --- SECURITY (Disable Right-Click Menu) ---
        document.body.addEventListener('contextmenu', (e) => {
            // Only block right-click if Debug Mode is OFF
            if (!isDebugMode) {
                 e.preventDefault(); 
            }
        });
        
        // Debug: Hard Reset button handler (Wipes all local storage)
        if (hardResetBtn) {
            hardResetBtn.addEventListener('click', () => {
                if (!confirm("WARNING: This will clear ALL progress, including saved completion data and the timer. Are you sure you want to restart the assessment completely?")) return;

                localStorage.removeItem('ue5ScenarioTimer');
                localStorage.removeItem('ue5ScenarioState');
                localStorage.removeItem('ue5InterruptedSteps');
                localStorage.removeItem('ue5ActiveScenario');
                localStorage.removeItem('ue5ActiveStep');
                
                location.reload();
            });
        }
    }
    
    /**
     * Calculates the total ideal time (0.5 hours per step) across all scenarios.
     * @returns {{totalSteps: number, idealTotalTime: number}} The calculated totals.
     */
    function calculateTotalIdealTime() {
        let totalSteps = 0;
        
        Object.values(window.SCENARIOS).forEach(scenario => {
            if (scenario.steps) {
                // Counting all steps, including dead ends, as they all represent an "ideal" 0.5hr time cost for a correct answer.
                totalSteps += Object.keys(scenario.steps).length;
            }
        });
        return {
            totalSteps: totalSteps,
            idealTotalTime: totalSteps * 0.5 
        };
    }

    /**
     * Serializes scenario choices into a compact, stable Base64 JSON string.
     * @param {object} [stateToSerialize=scenarioState] - The state to serialize.
     * @returns {string} The Base64 encoded test key.
     */
    function generateTestKey(stateToSerialize = scenarioState) {
        const compactData = {};
        
        Object.keys(stateToSerialize).forEach(scenarioId => {
            const state = stateToSerialize[scenarioId];
            if (Object.keys(state.choicesMade).length > 0) {
                // choicesMade contains the original (unshuffled) index, ensuring stability.
                compactData[scenarioId] = state.choicesMade;
            }
        });
        
        if (Object.keys(compactData).length === 0) {
            return "No Choices Recorded";
        }

        try {
            const jsonString = JSON.stringify(compactData);
            return base64EncodeUnicode(jsonString);
        } catch (e) {
            console.error("Failed to generate test key:", e);
            return "ERROR_SERIALIZING_CHOICES";
        }
    }


    // --- STATE MANAGEMENT ---

    /**
     * Loads game state from localStorage, ensuring cleanup of old penalty/corrupted keys.
     */
    function loadScenarioState() {
        const savedStateJSON = localStorage.getItem('ue5ScenarioState');
        let savedState = {};

        if (savedStateJSON) {
            try {
                savedState = JSON.parse(savedStateJSON);
            } catch (e) {
                console.error("Failed to parse saved state, resetting.", e);
                savedState = {}; 
            }
        }

        const newScenarioState = {};
        
        Object.keys(window.SCENARIOS).forEach(scenarioId => {
            const defaultState = {
                completed: false,
                loggedTime: 0,
                choicesMade: {}
            };

            newScenarioState[scenarioId] = {
                ...defaultState,
                ...(savedState[scenarioId] || {})
            };
            
            // Recalculate logged time based on choicesMade to ensure consistency 
            let recalculateTime = 0;
            if (newScenarioState[scenarioId].choicesMade) {
                const scenario = window.SCENARIOS[scenarioId];
                if (scenario) {
                    Object.keys(newScenarioState[scenarioId].choicesMade).forEach(stepId => {
                        const originalIndex = newScenarioState[scenarioId].choicesMade[stepId];
                        if (scenario.steps[stepId] && scenario.steps[stepId].choices.length > originalIndex) {
                            recalculateTime += getTimeCostForChoice(scenario.steps[stepId].choices[originalIndex].type);
                        }
                    });
                }
            }
            newScenarioState[scenarioId].loggedTime = recalculateTime;
        });
        
        scenarioState = newScenarioState;
        saveScenarioState();
    }

    /**
     * Saves the current game state to localStorage.
     */
    function saveScenarioState() {
        localStorage.setItem('ue5ScenarioState', JSON.stringify(scenarioState));
    }

    /**
     * Resets all scenario progress to default values.
     */
    function resetAllScenarioState() {
        scenarioState = {};
        Object.keys(window.SCENARIOS).forEach(scenarioId => {
            scenarioState[scenarioId] = {
                completed: false,
                loggedTime: 0,
                choicesMade: {}
            };
        });
        interruptedSteps = {};
        saveScenarioState();
    }

    /**
     * Loads the interrupted steps map from localStorage.
     */
    function loadInterruptedSteps() {
        const savedInterruptedJSON = localStorage.getItem('ue5InterruptedSteps');
        if (savedInterruptedJSON) {
            try {
                interruptedSteps = JSON.parse(savedInterruptedJSON);
            } catch (e) {
                console.error("Failed to parse interrupted steps state, resetting.", e);
                interruptedSteps = {}; 
            }
        }
    }
    
    /**
     * Saves the currently active ticket state and the multi-ticket progress map.
     */
    function saveCurrentTicketState() {
        if (currentScenarioId && currentStepId) {
            localStorage.setItem('ue5ActiveScenario', currentScenarioId);
            localStorage.setItem('ue5ActiveStep', currentStepId);
        } else {
            localStorage.removeItem('ue5ActiveScenario');
            localStorage.removeItem('ue5ActiveStep');
        }

        localStorage.setItem('ue5InterruptedSteps', JSON.stringify(interruptedSteps));
    }

    // --- UI RENDERING & FLOW ---

    /**
     * Determines the color class for time logged vs. estimate.
     * @param {number} logged - Logged hours.
     * @param {number} estimate - Estimated hours.
     * @returns {string} Tailwind CSS class for color.
     */
    function getLoggedTimeColorClass(logged, estimate) {
        if (logged <= estimate) {
            return 'text-green-400';
        } 
        
        const overBudgetRatio = logged / estimate;
        
        if (overBudgetRatio <= 1.20) { 
            return 'text-yellow-400';
        } else if (overBudgetRatio <= 1.40) {
            return 'text-orange-400';
        } else { 
            return 'text-red-400';
        }
    }

    /**
     * Renders the list of tickets in the backlog (left column).
     */
    function renderBacklog() {
        backlogList.innerHTML = '';
        
        const scenarioKeys = Object.keys(window.SCENARIOS);
        
        const validScenarios = scenarioKeys
            .map(id => ({ id, data: window.SCENARIOS[id] }))
            .filter(item => 
                item.data && 
                item.data.meta && 
                item.data.meta.title &&
                typeof item.data.meta.estimateHours !== 'undefined'
            );

        validScenarios.forEach(item => {
            const scenarioId = item.id;
            const scenario = item.data;
            const state = scenarioState[scenarioId];

            const meta = scenario.meta;
            const title = meta.title;
            const description = meta.description ? meta.description.substring(0, 70) + '...' : "No description available.";
            
            let estimate = parseFloat(meta.estimateHours); 
            if (isNaN(estimate)) {
                estimate = 0;
            }
            
            const card = document.createElement('div');
            const isActive = currentScenarioId === scenarioId && !state.completed;
            
            card.className = `p-4 rounded-lg border-l-4 cursor-pointer transition-all duration-200 ${
                state.completed 
                    ? 'bg-gray-700/50 border-green-600' 
                    : isActive
                        ? 'bg-blue-900/40 border-blue-400 ring-2 ring-blue-400' 
                        : 'bg-gray-700 hover:bg-gray-600/80 border-blue-500'
            }`;
            card.dataset.scenarioId = scenarioId;

            let statusSpan;
            let loggedTimeDisplay = '';
            const logged = state.loggedTime;
            const loggedColorClass = getLoggedTimeColorClass(logged, estimate);


            if (state.completed) {
                statusSpan = `<span class="text-xs font-semibold text-green-400">COMPLETED</span>`;
                loggedTimeDisplay = `
                    <div class="text-sm text-gray-300">
                        Logged: <span class="font-bold ${loggedColorClass}">${logged.toFixed(1)} hrs</span> / 
                        Est: <span class="font-bold text-green-400">${estimate.toFixed(1)} hrs</span>
                    </div>
                `;
            } else {
                 const savedStepId = interruptedSteps[scenarioId];
                 
                 if (savedStepId && savedStepId !== scenario.start) {
                     statusSpan = `<span class="text-xs font-semibold text-yellow-400">IN PROGRESS</span>`;
                     loggedTimeDisplay = `
                        <div class="text-sm text-gray-400">
                            Logged: <span class="font-bold ${loggedColorClass}">${logged.toFixed(1)} hrs</span> / 
                            Est: <span class="font-bold text-green-400">${estimate.toFixed(1)} hrs</span>
                        </div>
                    `;
                 } else {
                     statusSpan = `<span class="text-xs font-semibold text-blue-400">NOT STARTED</span>`;
                     loggedTimeDisplay = `
                        <div class="text-sm text-gray-400">
                            Est. Time: <span class="font-bold text-green-400">${estimate.toFixed(1)} hrs</span>
                        </div>
                    `;
                 }
            }
            
            const html = `
                <h4 class="font-bold ${state.completed ? 'text-gray-400 line-through' : 'text-gray-100'}">${title}</h4>
                <p class="text-xs text-gray-400 mt-1">${description}</p>
                <div class="mt-3 pt-3 border-t border-gray-600">
                    ${statusSpan}
                    ${loggedTimeDisplay}
                </div>
            `;


            card.innerHTML = html;
            
            if (!state.completed) {
                card.addEventListener('click', () => selectScenario(scenarioId));
            }

            backlogList.appendChild(card);
        });
    }
    
    /**
     * Renders a specific step (prompt and choices) of a scenario.
     * @param {string} scenarioId - The ID of the scenario.
     * @param {string} stepId - The ID of the step to render.
     */
    function renderStep(scenarioId, stepId) {
        const scenario = window.SCENARIOS[scenarioId];
        const step = scenario.steps[stepId];
        
        if (!step) {
            console.error(`Step "${stepId}" not found in scenario "${scenarioId}"`);
            return;
        }
        
        // 1. Update the active ticket references
        currentScenarioId = scenarioId;
        currentStepId = stepId;

        // Save the progress of the currently active ticket in the interrupted map
        interruptedSteps[currentScenarioId] = currentStepId;
        saveCurrentTicketState();

        // 2. Resume timer if not in debug mode
        if (!isDebugMode) {
            resumeMainTimer();
        }

        // 3. Shuffle choices 
        const shuffledChoices = [...step.choices].sort(() => Math.random() - 0.5);

        // 4. Determine Step Number for display
        const stepKeys = Object.keys(scenario.steps);
        const stepIndex = stepKeys.indexOf(stepId);
        const stepNumber = stepIndex !== -1 ? stepIndex + 1 : 1;
        const totalSteps = stepKeys.length;

        // Conditionally generate the step count prefix (visible only in debug mode)
        const stepCountPrefix = isDebugMode 
            ? `Step ${stepNumber} / ${totalSteps}: ` 
            : '';

        // 5. Build the Step Prompt and Choices
        const stepHtml = `
            <div id="ticket-step-prompt" class="mb-6">
                <h5 class="text-xl font-bold text-gray-200 mb-4">${stepCountPrefix}${step.title}</h5>
                <div class="prose prose-sm prose-invert text-gray-300">${step.prompt}</div>
            </div>
            <div id="ticket-step-choices" class="space-y-3"></div>
        `;

        ticketStepContent.innerHTML = stepHtml;

        const choicesContainer = ticketStepContent.querySelector('#ticket-step-choices');

        // 6. Create Choice Buttons
        // Map original index to shuffled button for time tracking stability
        shuffledChoices.forEach((choice) => {
            const timeCost = getTimeCostForChoice(choice.type);
            const isCorrect = choice.type === 'correct';

            const btn = document.createElement('button');
            
            // Determine button styling (Debug Mode only shows hint colors)
            let debugClass = '';
            if (isDebugMode) {
                if (isCorrect) {
                     debugClass = 'border-green-600 debug-correct';
                } else if (choice.type === 'partial') {
                     debugClass = 'border-yellow-600';
                } else if (choice.type === 'misguided') {
                     debugClass = 'border-orange-600';
                } else {
                     debugClass = 'border-red-600';
                }
            } else {
                debugClass = 'border-gray-600 hover:border-blue-500';
            }
            
            // Apply unselectable class to choices
            btn.className = `block w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 unselectable ${debugClass}`;
            
            btn.innerHTML = `<span class="font-bold">${choice.text}</span>`; 

            // Attach minimal data to dataset
            btn.dataset.choiceNext = choice.next;
            btn.dataset.choiceTimeCost = timeCost;
            
            // CRITICAL: Store the original index from the SCENARIOS array for stable score tracking
            // We need to find the original index in the unshuffled array
            const originalIndexInChoices = step.choices.indexOf(choice);
            if (originalIndexInChoices !== -1) {
                btn.dataset.originalIndex = originalIndexInChoices;
            } else {
                console.error("Could not find choice in original array for stable index mapping.");
                btn.dataset.originalIndex = -1; // Fallback to -1 if mapping fails
            }

            btn.addEventListener('click', () => handleChoice(btn));
            choicesContainer.appendChild(btn);
        });
        
        renderBacklog();
    }

    /**
     * Called when a user clicks an answer choice.
     * @param {HTMLElement} choiceButton - The clicked button element.
     */
    function handleChoice(choiceButton) {
        const { choiceNext, choiceTimeCost, originalIndex } = choiceButton.dataset;
        const timeCost = parseFloat(choiceTimeCost);
        const index = parseInt(originalIndex, 10);
        
        // 1. Log the time cost (updates global state)
        const state = scenarioState[currentScenarioId];
        state.loggedTime += timeCost;
        
        // 2. Record the original index of the choice made
        state.choicesMade[currentStepId] = index;

        saveScenarioState();

        // 3. Check for scenario conclusion
        if (choiceNext === 'conclusion') {
            finishScenario();
        } else {
            // 4. Move to the next step immediately 
            currentStepId = choiceNext;
            renderStep(currentScenarioId, currentStepId);
        }
    }

    /**
     * Called when a user clicks a scenario card from the backlog.
     * @param {string} scenarioId - The ID of the scenario selected.
     * @param {string|null} startStepId - Optional ID for the step to start at.
     */
    function selectScenario(scenarioId, startStepId = null) {
        
        // Save previous ticket's progress before switching
        if (currentScenarioId && currentStepId && currentScenarioId !== scenarioId) {
            interruptedSteps[currentScenarioId] = currentStepId;
            localStorage.removeItem('ue5ActiveScenario');
            localStorage.removeItem('ue5ActiveStep');
            saveCurrentTicketState(); 
        }
        
        const scenario = window.SCENARIOS[scenarioId];
        
        // Determine starting step: 1. Passed in ID, 2. Interrupted map, 3. Scenario start
        currentStepId = startStepId 
            || interruptedSteps[scenarioId] 
            || scenario.start; 
        
        // Update ticket header
        ticketTitle.textContent = scenario.meta.title;
        ticketDescription.textContent = scenario.meta.description;

        // Show ticket content, hide placeholder
        ticketPlaceholder.classList.add('hidden');
        ticketContent.classList.remove('hidden');

        // Render the chosen step
        renderStep(scenarioId, currentStepId);
        
        // Update the global active ticket tracking
        currentScenarioId = scenarioId;
    }
    
    /**
     * Called when the user completes the final step of a scenario.
     */
    function finishScenario() {
        // Mark as completed
        const state = scenarioState[currentScenarioId];
        state.completed = true;
        
        // Clear its step from the interrupted map since it's done
        if (interruptedSteps[currentScenarioId]) {
            delete interruptedSteps[currentScenarioId];
        }

        saveScenarioState();
        saveCurrentTicketState();
        renderBacklog();
        
        // Check if all scenarios are done (triggers final modal)
        const allComplete = Object.values(scenarioState).every(s => s.completed);
        
        if (allComplete) {
            let totalLoggedTime = Object.values(scenarioState).reduce((acc, s) => acc + s.loggedTime, 0);
            stopTimerOnComplete(); 
            // Pass the calculated time to the modal
            showAssessmentModal('complete', totalLoggedTime);
        } else {
             // Show the individual ticket conclusion inline
            pauseMainTimer();
            renderSingleTicketConclusion();
        }
    }
    
    /**
     * Renders the final summary screen for a completed scenario directly into the ticket panel.
     */
    function renderSingleTicketConclusion() {
        
        const state = scenarioState[currentScenarioId];
        const scenario = window.SCENARIOS[currentScenarioId];
        const estimateHours = scenario.meta.estimateHours;
        const loggedHours = state.loggedTime;
        
        const timeColorClass = getLoggedTimeColorClass(loggedHours, estimateHours);

        // Calculate overrun/underrun
        const timeDifference = (loggedHours - estimateHours);
        const diffColorClass = timeDifference > 0 ? 'text-red-400' : 'text-green-400';
        const diffLabel = timeDifference > 0 ? 'Over' : 'Under';
        const diffValue = Math.abs(timeDifference);
        
        let summaryMessage;
        if (loggedHours <= estimateHours) {
            summaryMessage = "Excellent outcome! The solution was found well within the estimated time.";
        } else if (loggedHours <= estimateHours * 1.5) {
            summaryMessage = "Solid work. The solution was delivered, requiring a moderate but acceptable amount of time.";
        } else {
            summaryMessage = "Ticket resolved. The issue was complex, resulting in a higher time log than originally estimated.";
        }
        
        const buttonText = "Back to Backlog";
        const buttonId = "close-scenario-btn";
        
        const conclusionHtml = `
            <div class="text-center p-8">
                <h3 class="text-3xl font-bold ${timeColorClass} mb-6">Ticket Resolved</h3>
                <p class="text-lg text-gray-300 mb-8">${summaryMessage}</p>

                <div class="max-w-md mx-auto bg-gray-700/50 p-6 rounded-lg">
                    <h4 class="text-xl font-semibold text-gray-100 mb-4">Ticket Time Breakdown (Step Cost)</h4>
                    <div class="space-y-3 text-left">
                        <div class="flex justify-between text-gray-300">
                            <span>Logged Fix Time:</span>
                            <span class="font-bold">${loggedHours.toFixed(1)} hrs</span>
                        </div>
                        <div class="flex justify-between text-gray-300">
                            <span>Original Estimate:</span>
                            <span class="font-bold text-green-400">${estimateHours.toFixed(1)} hrs</span>
                        </div>
                        <div class="flex justify-between text-lg text-white border-t border-gray-500 pt-3 mt-3">
                            <span class="font-bold">${diffLabel} Budget By:</span>
                            <span class="font-bold ${diffColorClass}">${diffValue.toFixed(1)} hrs</span>
                        </div>
                    </div>
                </div>

                <button id="${buttonId}" class="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-all duration-200">
                    ${buttonText}
                </button>
            </div>
        `;
        
        ticketStepContent.innerHTML = conclusionHtml;
        
        // Add event listener to the close button
        document.getElementById(buttonId).addEventListener('click', () => {
            // Reset UI to placeholder state
            ticketContent.classList.add('hidden');
            ticketPlaceholder.classList.remove('hidden');
            
            currentScenarioId = null;
            currentStepId = null;
            
            saveCurrentTicketState(); 

            renderBacklog();
            
            // Resume the timer now that the user is selecting the next task
            resumeMainTimer();
        });
    }

    /**
     * Stops the game when the timer runs out. 
     */
    function endGameByTime() {
        clearInterval(mainTimerInterval);
        localStorage.removeItem('ue5ScenarioTimer'); 
        
        if (timerContainer) {
            timerContainer.classList.add('hidden');
        }

        countdownTimer.classList.remove('pulse-red', 'text-blue-300', 'text-yellow-400');
        countdownTimer.classList.add('text-orange-400');
        countdownTimer.textContent = "00:00";
        
        // Show "Time's Up" modal
        showAssessmentModal('timeout'); 
    }
    
    /**
     * Stops the timer when all scenarios are completed.
     */
    function stopTimerOnComplete() {
        clearInterval(mainTimerInterval);
        localStorage.removeItem('ue5ScenarioTimer'); 
        
        // HIDE THE TIMER DISPLAY ENTIRELY
        if (timerContainer) {
            timerContainer.classList.add('hidden');
        }

        // Ensure no low-time colors here
        countdownTimer.classList.remove('pulse-red', 'text-blue-300', 'text-yellow-400', 'text-orange-400');
        countdownTimer.classList.add('text-green-500');
        countdownTimer.textContent = "Complete!";
    }

    /**
     * Assessment modal rendering function (ONLY for final, global status).
     * @param {string} status - 'timeout' or 'complete'.
     * @param {number|null} [totalLoggedTime=null] - Total simulated time in hours.
     * @param {object} [stateToUse=scenarioState] - The state object to use for generating the key.
     */
    function showAssessmentModal(status, totalLoggedTime = null, stateToUse = scenarioState) {
        pauseMainTimer(); // Ensure timer stops when the modal appears

        let mainTitle, subText, mainTitleColor;
        let finalStatsHtml = '';
        let buttonHtml = ''; 
        
        // Determine completion based on the state that was passed in
        const allScenariosComplete = Object.values(stateToUse).every(s => s.completed);

        if (status === 'timeout') {
            // TIME'S UP status
            mainTitle = "Time's Up!";
            subText = "The assessment period has ended. Assessment incomplete.";
            mainTitleColor = "text-orange-400";
            
            buttonHtml = `
                <p class="text-sm text-gray-400 mt-4">This assessment is incomplete.</p>
            `;
            
        } else if (allScenariosComplete || totalLoggedTime !== null) { 
            // ASSESSMENT COMPLETE status 
            
            // 1. Calculate final scores
            if (totalLoggedTime === null) {
                // If the time is null (e.g., loaded from a cleared state), recalculate from the passed state
                totalLoggedTime = Object.values(stateToUse).reduce((acc, s) => acc + s.loggedTime, 0);
            }
            
            // Note: calculateTotalIdealTime correctly uses the global SCENARIOS data
            const { idealTotalTime } = calculateTotalIdealTime();
            const efficiencyScore = totalLoggedTime > 0 ? (idealTotalTime / totalLoggedTime) : 0;
            const finalEfficiencyPercent = Math.round(efficiencyScore * 100);
            const passed = efficiencyScore >= PASS_THRESHOLD;
            
            // 2. Generate Test Key (Using the state that was passed in)
            const testKey = generateTestKey(stateToUse);

            mainTitle = passed ? "Assessment Passed" : "Assessment Completed";
            mainTitleColor = passed ? "text-green-500" : "text-yellow-500";
            subText = passed 
                ? "Congratulations! Your results are logged based on efficient problem-solving."
                : "You completed all tickets. Review the details below.";
            
            // 4. Assemble Final Stats HTML (Reproducible Key added back)
            finalStatsHtml = `
                <div class="mt-4 border-t border-gray-600 pt-4">
                    <h4 class="text-xl font-bold ${mainTitleColor} mb-3">Final Time Report</h4>
                    <div class="space-y-2 text-left max-w-sm mx-auto">
                        <div class="flex justify-between text-sm text-gray-200">
                            <span>Total Optimal Time (0.5h/step):</span>
                            <span class="font-bold">${idealTotalTime.toFixed(1)} hrs</span>
                        </div>
                         <div class="flex justify-between text-sm text-gray-200">
                            <span>Total Simulated Time (Choice Cost):</span>
                            <span class="font-bold text-sm">${totalLoggedTime.toFixed(1)} hrs</span>
                        </div>
                        <div class="flex justify-between text-lg text-white border-t border-gray-500 pt-3">
                            <span class="font-bold">Efficiency Score:</span>
                            <span class="font-bold ${mainTitleColor}">${finalEfficiencyPercent}%</span>
                        </div>
                        <p class="text-xs text-gray-400 text-center">(Pass Threshold: ${PASS_THRESHOLD * 100}%)</p>
                    </div>
                </div>
                
                <div class="mt-4 border-t border-gray-600 pt-4">
                    <h4 class="text-xl font-bold text-gray-100 mb-3">Reproducible Test Key</h4>
                    <p class="text-sm text-gray-400 mb-2">Copy this key to recreate this exact test path and results.</p>
                    
                    <div class="flex justify-center">
                        <span id="test-key-display" class="font-mono text-xs md:text-sm bg-gray-700/70 p-3 rounded-lg break-all max-w-full inline-block text-yellow-300">
                            ${testKey}
                        </span>
                    </div>
                    
                    <button id="copy-key-btn" class="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200">
                        Copy Key
                    </button>
                </div>
            `;
            
            buttonHtml = `
                <p class="text-sm text-gray-400 mt-4">This assessment is complete.</p>
            `;
        }

        // --- Render Modal ---
        const modalContentHtml = `
            <div id="final-modal-content" class="bg-gray-800 p-6 rounded-xl shadow-2xl text-center max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <h2 class="text-3xl font-extrabold ${mainTitleColor} mb-2">${mainTitle}</h2>
                <p class="text-base text-gray-300 mb-2">${subText}</p>
                
                ${finalStatsHtml}

                ${buttonHtml}
            </div>
        `;

        timesUpScreen.innerHTML = modalContentHtml;
        jiraBoard.classList.add('hidden');
        timesUpScreen.classList.remove('hidden');

        // Attach Copy button listener
        if (allScenariosComplete || totalLoggedTime !== null) {
            const copyButton = document.getElementById('copy-key-btn');
            const keyDisplay = document.getElementById('test-key-display');
            
            if (copyButton && keyDisplay) {
                copyButton.addEventListener('click', () => {
                    const keyToCopy = keyDisplay.textContent; 
                    
                    // Use document.execCommand('copy') for better compatibility in iframe environments
                    const tempInput = document.createElement('textarea');
                    tempInput.value = keyToCopy;
                    document.body.appendChild(tempInput);
                    tempInput.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempInput);

                    copyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        copyButton.textContent = 'Copy Key';
                    }, 2000);
                });
            }
        }
    }


    // --- Entry Point ---
    cacheDOMElements();
    attachEventListeners();
    initializeApp();

});