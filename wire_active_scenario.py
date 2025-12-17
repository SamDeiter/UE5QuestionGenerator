"""
Update App.jsx and GlobalModals.jsx to pass activeScenario to TutorialOverlay
"""

# Update App.jsx - add activeScenario to destructuring
with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\App.jsx', 'r', encoding='utf-8') as f:
    app_content = f.read()

# Add activeScenario to the destructuring (line 84-94)
app_content = app_content.replace(
    '''  const {
    tutorialActive,
    currentStep,
    tutorialSteps,
    handleTutorialNext,
    handleTutorialPrev,
    handleTutorialSkip,
    handleTutorialComplete,
    handleRestartTutorial,
    handleStartTutorial,
  } = useTutorial(showMessage);''',
    '''  const {
    tutorialActive,
    currentStep,
    tutorialSteps,
    activeScenario,
    handleTutorialNext,
    handleTutorialPrev,
    handleTutorialSkip,
    handleTutorialComplete,
    handleRestartTutorial,
    handleStartTutorial,
  } = useTutorial(showMessage);'''
)

# Add activeScenario to GlobalModals state prop (line 552-568)
app_content = app_content.replace(
    '''          state={{
            config,
            isProcessing,
            status,
            translationProgress,
            allQuestionsMap,
            appMode,
            currentStep,
            tutorialSteps,''',
    '''          state={{
            config,
            isProcessing,
            status,
            translationProgress,
            allQuestionsMap,
            appMode,
            currentStep,
            tutorialSteps,
            activeScenario,'''
)

with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(app_content)

print("✅ Updated App.jsx with activeScenario")

# Update GlobalModals.jsx - add activeScenario to state and pass to TutorialOverlay
with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\GlobalModals.jsx', 'r', encoding='utf-8') as f:
    modals_content = f.read()

# Add activeScenario to state destructuring
modals_content = modals_content.replace(
    '''  const {
    config,
    isProcessing,
    status,
    translationProgress,
    allQuestionsMap,
    currentStep,
    tutorialSteps,

    isAdmin, // passed for SettingsModal
  } = state;''',
    '''  const {
    config,
    isProcessing,
    status,
    translationProgress,
    allQuestionsMap,
    currentStep,
    tutorialSteps,
    activeScenario,

    isAdmin, // passed for SettingsModal
  } = state;'''
)

# Add activeScenario prop to TutorialOverlay
modals_content = modals_content.replace(
    '''      {tutorialActive && (
        <TutorialOverlay
          steps={tutorialSteps}
          currentStepIndex={currentStep}
          onNext={handleTutorialNext}
          onPrev={handleTutorialPrev}
          onSkip={handleTutorialSkip}
          onComplete={handleTutorialComplete}
        />
      )}''',
    '''      {tutorialActive && (
        <TutorialOverlay
          steps={tutorialSteps}
          currentStepIndex={currentStep}
          onNext={handleTutorialNext}
          onPrev={handleTutorialPrev}
          onSkip={handleTutorialSkip}
          onComplete={handleTutorialComplete}
          activeScenario={activeScenario}
        />
      )}'''
)

with open(r'c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\GlobalModals.jsx', 'w', encoding='utf-8') as f:
    f.write(modals_content)

print("✅ Updated GlobalModals.jsx with activeScenario prop")
print("✅ AGENT T2 Integration Complete")
