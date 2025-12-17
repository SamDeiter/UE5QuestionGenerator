"""
AGENT T1 - Transform useTutorial.js to add state machine, validation, and analytics
"""

new_content = '''import { useState } from "react";
import { TUTORIAL_SCENARIOS } from "../utils/tutorialSteps";
import { validateScenario } from "../utils/tutorial/tutorialValidation";
import { 
  setScenarioCompleted, 
  isScenarioCompleted 
} from "../utils/tutorial/tutorialHelpers";
import { logTutorialEvent, TUTORIAL_EVENTS } from "../utils/tutorialAnalytics";

// State machine states
const TUTORIAL_STATES = {
  IDLE: 'idle',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ERROR: 'error'
};

/**
 * Hook for managing the interactive tutorial system with multiple scenarios.
 * Implements a state machine for robust tutorial flow control.
 *
 * @param {Function} showMessage - Function to display toast messages
 * @param {Function} [onError] - Optional error callback
 * @returns {Object} Tutorial state and handlers
 */
export const useTutorial = (showMessage, onError) => {
  const [tutorialState, setTutorialState] = useState(TUTORIAL_STATES.IDLE);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeScenario, setActiveScenario] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Get current steps based on active scenario
  const scenario = activeScenario ? TUTORIAL_SCENARIOS[activeScenario] : null;
  const tutorialSteps = scenario?.steps || [];
  const tutorialActive = tutorialState === TUTORIAL_STATES.ACTIVE;

  /**
   * Starts a specific tutorial scenario with validation
   * @param {string} scenarioId - The key from TUTORIAL_SCENARIOS (e.g., 'create', 'review')
   */
  const handleStartTutorial = (scenarioId = "welcome") => {
    const targetScenario = TUTORIAL_SCENARIOS[scenarioId];
    
    if (!targetScenario) {
      const error = `Tutorial scenario '${scenarioId}' not found`;
      console.error(error);
      setTutorialState(TUTORIAL_STATES.ERROR);
      setErrorMessage(error);
      onError?.(error);
      
      logTutorialEvent(TUTORIAL_EVENTS.ERROR, {
        scenarioId,
        error: 'scenario_not_found'
      });
      return;
    }
    
    // Validate scenario
    const errors = validateScenario(targetScenario, scenarioId);
    if (errors.length > 0) {
      console.warn('Tutorial validation warnings:', errors);
      // Don't block tutorial, just warn
    }
    
    // Log start event
    logTutorialEvent(TUTORIAL_EVENTS.STARTED, {
      scenarioId,
      stepCount: targetScenario.steps.length
    });
    
    setActiveScenario(scenarioId);
    setCurrentStep(0);
    setTutorialState(TUTORIAL_STATES.ACTIVE);
    setErrorMessage(null);
  };

  /**
   * Navigate to next step (with state guard)
   */
  const handleTutorialNext = () => {
    if (tutorialState !== TUTORIAL_STATES.ACTIVE) {
      console.warn('Cannot navigate: tutorial not active');
      return;
    }
    
    const newStep = Math.min(currentStep + 1, tutorialSteps.length - 1);
    
    logTutorialEvent(TUTORIAL_EVENTS.STEP_CHANGED, {
      scenarioId: activeScenario,
      fromStep: currentStep,
      toStep: newStep,
      stepId: tutorialSteps[newStep]?.id
    });
    
    setCurrentStep(newStep);
  };

  /**
   * Navigate to previous step (with state guard)
   */
  const handleTutorialPrev = () => {
    if (tutorialState !== TUTORIAL_STATES.ACTIVE) {
      console.warn('Cannot navigate: tutorial not active');
      return;
    }
    
    const newStep = Math.max(currentStep - 1, 0);
    
    logTutorialEvent(TUTORIAL_EVENTS.STEP_CHANGED, {
      scenarioId: activeScenario,
      fromStep: currentStep,
      toStep: newStep,
      stepId: tutorialSteps[newStep]?.id
    });
    
    setCurrentStep(newStep);
  };

  /**
   * Skip/cancel the tutorial
   */
  const handleTutorialSkip = () => {
    if (tutorialState !== TUTORIAL_STATES.ACTIVE) {
      return;
    }
    
    logTutorialEvent(TUTORIAL_EVENTS.SKIPPED, {
      scenarioId: activeScenario,
      atStep: currentStep,
      stepId: tutorialSteps[currentStep]?.id
    });
    
    setTutorialState(TUTORIAL_STATES.IDLE);
    setActiveScenario(null);
    setCurrentStep(0);
  };

  /**
   * Complete the tutorial
   */
  const handleTutorialComplete = () => {
    if (tutorialState !== TUTORIAL_STATES.ACTIVE) {
      return;
    }
    
    logTutorialEvent(TUTORIAL_EVENTS.COMPLETED, {
      scenarioId: activeScenario,
      totalSteps: tutorialSteps.length
    });
    
    // Mark as completed with timestamp
    setScenarioCompleted(activeScenario);
    
    setTutorialState(TUTORIAL_STATES.COMPLETED);
    
    // Show success message
    if (showMessage) {
      showMessage(`✅ Tutorial completed!`, 2000);
    }
    
    // Reset to idle after a brief delay
    setTimeout(() => {
      setTutorialState(TUTORIAL_STATES.IDLE);
      setActiveScenario(null);
      setCurrentStep(0);
    }, 500);
  };

  /**
   * Restart the current tutorial scenario
   */
  const handleRestartTutorial = () => {
    if (!activeScenario) {
      console.warn('Cannot restart: no active scenario');
      return;
    }
    
    const scenarioToRestart = activeScenario;
    handleStartTutorial(scenarioToRestart);
    
    if (showMessage) {
      showMessage(`Restarting ${scenarioToRestart} tutorial!`, 2000);
    }
  };

  return {
    // State
    tutorialActive,
    currentStep,
    tutorialSteps,
    activeScenario,
    tutorialState,
    errorMessage,

    // Handlers
    handleTutorialNext,
    handleTutorialPrev,
    handleTutorialSkip,
    handleTutorialComplete,
    handleRestartTutorial,
    handleStartTutorial,
    
    // Helper
    isScenarioCompleted,
  };
};
'''

# Write the new file
with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useTutorial.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ AGENT T1 Complete: useTutorial.js transformed with state machine, validation, and analytics")
