import { useState } from 'react';
import { TUTORIAL_STEPS } from '../utils/tutorialSteps';

/**
 * Hook for managing the interactive tutorial system.
 * Handles tutorial state, navigation, persistence, and completion.
 * 
 * @param {Function} showMessage - Function to display toast messages
 * @returns {Object} Tutorial state and handlers
 */
export const useTutorial = (showMessage) => {
    // Tutorial is disabled by default - enabled via Tutorial button
    const [tutorialActive, setTutorialActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const handleTutorialNext = () => {
        setCurrentStep(prev => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
    };

    const handleTutorialPrev = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const handleTutorialSkip = () => {
        setTutorialActive(false);
        localStorage.setItem('ue5_tutorial_completed', 'true');
    };

    const handleTutorialComplete = () => {
        setTutorialActive(false);
        localStorage.setItem('ue5_tutorial_completed', 'true');
        if (showMessage) {
            showMessage("Tutorial completed! Happy generating!", 5000);
        }
    };

    const handleRestartTutorial = () => {
        localStorage.removeItem('ue5_tutorial_completed');
        setCurrentStep(0);
        setTutorialActive(true);
        if (showMessage) {
            showMessage("Tutorial restarted!", 2000);
        }
    };

    return {
        // State
        tutorialActive,
        currentStep,
        tutorialSteps: TUTORIAL_STEPS,

        // Handlers
        handleTutorialNext,
        handleTutorialPrev,
        handleTutorialSkip,
        handleTutorialComplete,
        handleRestartTutorial
    };
};
