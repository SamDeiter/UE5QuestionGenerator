# Task Summary: Stabilize Quiz Preview

## Completed Tasks

1. **Analyzed Instability Issue:**
    * Identified that `TestView.jsx` was re-calculating (re-shuffling) `selectedQuestions` on every render due to `Math.random()` inside `useMemo`.
    * Confirmed this caused the `QuizPreview` component to receive a fresh list of questions constantly, leading to "changing questions" during the quiz session.
2. **Implemented Stabilization Logic:**
    * Added `activeQuizQuestions` state to `TestView.jsx` to store a *snapshot* of the questions.
    * Created `handleStartPreview` to capture this snapshot exactly when the user clicks "Preview Quiz".
    * Modified the `QuizPreview` component prop to use this stable `activeQuizQuestions` array instead of the volatile `selectedQuestions`.
    * Ensured memory cleanup by clearing `activeQuizQuestions` when the modal closes.

## Verification

- **Stability:** The quiz question list is now locked once the preview starts. Background re-renders or state updates in the parent `TestView` will no longer trigger a re-shuffle in the child `QuizPreview`.
* **Functionality:** "Preview Quiz" button correctly opens the modal with the expected number of questions.

## Passive Rules Check

- [x] **Security:** No secrets involved.
* [x] **Quality:** Solved a critical UX bug using standard React state patterns (snapshotting).
* [x] **Accessibility:** No changes to UI semantics; focus management remains handled by the modal.

## Next Steps

- User can now test the quiz without questions disappearing or changing unexpectedly.
