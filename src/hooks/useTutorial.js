import { useState } from "react";
import { TUTORIAL_SCENARIOS } from "../utils/tutorialSteps";

/**
 * Hook for managing the interactive tutorial system with multiple scenarios.
 *
 * @param {Function} showMessage - Function to display toast messages
 * @returns {Object} Tutorial state and handlers
 */
export const useTutorial = (showMessage) => {
  const [tutorialActive, setTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeScenario, setActiveScenario] = useState("welcome");

  // Get current steps based on active scenario, fallback to welcome
  const tutorialSteps =
    TUTORIAL_SCENARIOS[activeScenario] || TUTORIAL_SCENARIOS.welcome;

  const handleTutorialNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, tutorialSteps.length - 1));
  };

  const handleTutorialPrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleTutorialSkip = () => {
    setTutorialActive(false);
    // We track completion per scenario if desired, or just global
    localStorage.setItem(`ue5_tutorial_${activeScenario}_completed`, "true");
  };

  const handleTutorialComplete = () => {
    setTutorialActive(false);
    localStorage.setItem(`ue5_tutorial_${activeScenario}_completed`, "true");
  };

  /**
   * Starts a specific tutorial scenario
   * @param {string} scenarioId - The key from TUTORIAL_SCENARIOS (e.g., 'create', 'review')
   */
  const handleStartTutorial = (scenarioId = "welcome") => {
    if (!TUTORIAL_SCENARIOS[scenarioId]) {
      console.warn(`Tutorial scenario '${scenarioId}' not found.`);
      return;
    }
    setActiveScenario(scenarioId);
    setCurrentStep(0);
    setTutorialActive(true);
  };

  const handleRestartTutorial = () => {
    // Restart current scenario
    handleStartTutorial(activeScenario);
    if (showMessage) {
      showMessage(`Restarting ${activeScenario} tutorial!`, 2000);
    }
  };

  return {
    // State
    tutorialActive,
    currentStep,
    tutorialSteps,
    activeScenario,

    // Handlers
    handleTutorialNext,
    handleTutorialPrev,
    handleTutorialSkip,
    handleTutorialComplete,
    handleRestartTutorial,
    handleStartTutorial, // New handler for specific scenarios
  };
};
