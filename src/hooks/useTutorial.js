import { useState } from "react";
import { TUTORIAL_SCENARIOS } from "../utils/tutorialSteps";
import { validateScenario } from "../utils/tutorial/tutorialValidation";
import {
  setScenarioCompleted,
  isScenarioCompleted,
} from "../utils/tutorial/tutorialHelpers";
import { logTutorialEvent, TUTORIAL_EVENTS } from "../utils/tutorialAnalytics";

// State machine states
const TUTORIAL_STATES = {
  IDLE: "idle",
  ACTIVE: "active",
  COMPLETED: "completed",
  ERROR: "error",
};

/**
 * Hook for managing the interactive tutorial system with multiple scenarios.
 * Implements a state machine for robust tutorial flow control.
 *
 * @param {Function} showMessage - Function to display toast messages
 * @param {Function} [onError] - Optional error callback
 * @param {Object} [appContext] - App context with setters for modals/panels/tabs
 * @param {Function} [appContext.setShowGenSettings] - Setter for generation settings panel
 * @param {Function} [appContext.setShowAdvancedConfig] - Setter for advanced config panel
 * @param {Function} [appContext.setShowCritiqueModal] - Setter for critique modal
 * @param {Function} [appContext.setActiveAnalyticsTab] - Setter for analytics tab
 * @returns {Object} Tutorial state and handlers
 */
export const useTutorial = (showMessage, onError, appContext = {}) => {
  const [tutorialState, setTutorialState] = useState(TUTORIAL_STATES.IDLE);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeScenario, setActiveScenario] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Get current steps based on active scenario
  const scenario = activeScenario ? TUTORIAL_SCENARIOS[activeScenario] : null;
  const tutorialSteps = scenario?.steps || [];
  const tutorialActive = tutorialState === TUTORIAL_STATES.ACTIVE;

  /**
   * Execute side effects for tutorial step actions
   * @param {import('../utils/tutorial/tutorialTypes').TutorialStep} step - Tutorial step with optional action
   */
  const executeStepAction = (step) => {
    if (!step?.action) return;

    const { type, payload } = step.action;

    console.log(`[Tutorial] Executing action: ${type}`, payload);

    try {
      switch (type) {
        case "OPEN_PANEL":
          if (
            payload === "advanced-settings" &&
            appContext.setShowAdvancedConfig
          ) {
            appContext.setShowAdvancedConfig(true);
          } else if (
            payload === "gen-settings" &&
            appContext.setShowGenSettings
          ) {
            appContext.setShowGenSettings(true);
          }
          break;

        case "OPEN_MODAL":
          if (payload === "critique" && appContext.setShowCritiqueModal) {
            appContext.setShowCritiqueModal(true);
          }
          break;

        case "SWITCH_TAB":
          if (appContext.setActiveAnalyticsTab) {
            appContext.setActiveAnalyticsTab(payload);
          }
          break;

        case "EXPAND_ELEMENT": {
          // Find element and trigger click/expand
          const element = document.querySelector(`[data-tour="${payload}"]`);
          if (element && element.click) {
            element.click();
          }
          break;
        }

        case "CLOSE_PANEL":
          if (
            payload === "advanced-settings" &&
            appContext.setShowAdvancedConfig
          ) {
            appContext.setShowAdvancedConfig(false);
          } else if (
            payload === "gen-settings" &&
            appContext.setShowGenSettings
          ) {
            appContext.setShowGenSettings(false);
          }
          break;

        case "CLOSE_MODAL":
          if (payload === "critique" && appContext.setShowCritiqueModal) {
            appContext.setShowCritiqueModal(false);
          }
          break;

        default:
          console.warn(`[Tutorial] Unknown action type: ${type}`);
      }
    } catch (error) {
      console.error("[Tutorial] Error executing step action:", error);
      logTutorialEvent(TUTORIAL_EVENTS.ERROR, {
        scenarioId: activeScenario,
        stepId: step.id,
        error: "action_execution_failed",
        actionType: type,
      });
    }
  };

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
        error: "scenario_not_found",
      });
      return;
    }

    // Validate scenario
    const errors = validateScenario(targetScenario, scenarioId);
    if (errors.length > 0) {
      console.warn("Tutorial validation warnings:", errors);
      // Don't block tutorial, just warn
    }

    // Log start event
    logTutorialEvent(TUTORIAL_EVENTS.STARTED, {
      scenarioId,
      stepCount: targetScenario.steps.length,
    });

    setActiveScenario(scenarioId);
    setCurrentStep(0);
    setTutorialState(TUTORIAL_STATES.ACTIVE);
    setErrorMessage(null);

    // Execute action for first step after a brief delay
    setTimeout(() => {
      executeStepAction(targetScenario.steps[0]);
    }, 100);
  };

  /**
   * Navigate to next step (with state guard)
   */
  const handleTutorialNext = () => {
    if (tutorialState !== TUTORIAL_STATES.ACTIVE) {
      console.warn("Cannot navigate: tutorial not active");
      return;
    }

    const newStep = Math.min(currentStep + 1, tutorialSteps.length - 1);

    logTutorialEvent(TUTORIAL_EVENTS.STEP_CHANGED, {
      scenarioId: activeScenario,
      fromStep: currentStep,
      toStep: newStep,
      stepId: tutorialSteps[newStep]?.id,
    });

    setCurrentStep(newStep);

    // Execute step action after a brief delay to allow state to update
    setTimeout(() => {
      executeStepAction(tutorialSteps[newStep]);
    }, 100);
  };

  /**
   * Navigate to previous step (with state guard)
   */
  const handleTutorialPrev = () => {
    if (tutorialState !== TUTORIAL_STATES.ACTIVE) {
      console.warn("Cannot navigate: tutorial not active");
      return;
    }

    const newStep = Math.max(currentStep - 1, 0);

    logTutorialEvent(TUTORIAL_EVENTS.STEP_CHANGED, {
      scenarioId: activeScenario,
      fromStep: currentStep,
      toStep: newStep,
      stepId: tutorialSteps[newStep]?.id,
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
      stepId: tutorialSteps[currentStep]?.id,
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
      totalSteps: tutorialSteps.length,
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
      console.warn("Cannot restart: no active scenario");
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
