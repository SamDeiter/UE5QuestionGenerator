"""
Refactor App.jsx to use the new useTutorial hook.
This script:
1. Adds the import for useTutorial
2. Removes the inline tutorial state and handlers
3. Adds the hook call after showMessage is defined
"""
import re
from pathlib import Path

def refactor_app_jsx():
    file_path = Path(r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\App.jsx")
    
    content = file_path.read_text(encoding='utf-8')
    original = content
    
    # 1. Add import for useTutorial after other hook imports
    import_pattern = r"(import { useCrashRecovery } from './hooks/useCrashRecovery';)"
    import_replacement = r"\1\nimport { useTutorial } from './hooks/useTutorial';"
    content = re.sub(import_pattern, import_replacement, content)
    
    # 2. Remove the TUTORIAL_STEPS import from tutorialSteps since hook handles it
    # Actually keep it for now since GlobalModals still needs it
    
    # 3. Remove inline tutorial state and handlers (lines 61-89 approximately)
    # We need to carefully remove this block
    tutorial_block_pattern = r"""    // Tutorial State \(disabled by default for now - enable with Tutorial button\)\r?\n    const \[tutorialActive, setTutorialActive\] = useState\(false\);\r?\n    const \[currentStep, setCurrentStep\] = useState\(0\);\r?\n\r?\n    const handleTutorialNext = \(\) => \{\r?\n        setCurrentStep\(prev => Math\.min\(prev \+ 1, TUTORIAL_STEPS\.length - 1\)\);\r?\n    \};\r?\n\r?\n    const handleTutorialPrev = \(\) => \{\r?\n        setCurrentStep\(prev => Math\.max\(prev - 1, 0\)\);\r?\n    \};\r?\n\r?\n    const handleTutorialSkip = \(\) => \{\r?\n        setTutorialActive\(false\);\r?\n        localStorage\.setItem\('ue5_tutorial_completed', 'true'\);\r?\n    \};\r?\n\r?\n    const handleTutorialComplete = \(\) => \{\r?\n        setTutorialActive\(false\);\r?\n        localStorage\.setItem\('ue5_tutorial_completed', 'true'\);\r?\n        showMessage\("Tutorial completed! Happy generating!", 5000\);\r?\n    \};\r?\n\r?\n    const handleRestartTutorial = \(\) => \{\r?\n        localStorage\.removeItem\('ue5_tutorial_completed'\);\r?\n        setCurrentStep\(0\);\r?\n        setTutorialActive\(true\);\r?\n        showMessage\("Tutorial restarted!", 2000\);\r?\n    \};\r?\n\r?\n"""
    content = re.sub(tutorial_block_pattern, "", content)
    
    # 4. Add the hook call after showMessage is defined
    # Find the location after showMessage definition
    hook_call_pattern = r"(    const showMessage = useCallback\(\(msg, duration = 3000\) => \{\r?\n        addToast\(msg, 'info', duration\);\r?\n    \}, \[addToast\]\);)"
    hook_call_replacement = r"""\1

    // 0. Tutorial System
    const {
        tutorialActive,
        currentStep,
        tutorialSteps,
        handleTutorialNext,
        handleTutorialPrev,
        handleTutorialSkip,
        handleTutorialComplete,
        handleRestartTutorial
    } = useTutorial(showMessage);"""
    content = re.sub(hook_call_pattern, hook_call_replacement, content)
    
    # 5. Update GlobalModals to use tutorialSteps from hook instead of TUTORIAL_STEPS constant
    content = content.replace(
        "tutorialSteps: TUTORIAL_STEPS",
        "tutorialSteps"
    )
    
    if content != original:
        file_path.write_text(content, encoding='utf-8')
        print("✅ Successfully refactored App.jsx to use useTutorial hook")
        print("   - Added import for useTutorial")
        print("   - Removed inline tutorial logic (28 lines)")
        print("   - Added hook call after showMessage")
        print("   - Updated GlobalModals tutorialSteps reference")
    else:
        print("❌ No changes made - pattern may not have matched")

if __name__ == "__main__":
    refactor_app_jsx()
