# Task Summary: Enforce Manual Navigation

## Completed Tasks

1. **Removed Auto-Advance:**
    * Completely removed the `setTimeout` logic from `QuizPreview.jsx`.
    * The quiz can **never** advance automatically now. It will wait indefinitely for the user to click "Next Question".
2. **Universal Next Button:**
    * Verified that the "Next Question" button appears immediately after an answer is selected.
    * This button appears regardless of the "Show Feedback" setting (Immediate or End).

## Verification

- **Behavior:**
    1. User clicks an answer.
    2. The answer highlights (Blue if selected, Green/Red if immediate feedback is on).
    3. The "Next Question" button appears below.
    4. The page waits.
    5. User clicks "Next Question" to proceed.
* **User Requirement:** Matches "the user should always be the one to press the button".

## Passive Rules Check

- [x] **Security:** Safe.
* [x] **Quality:** UX is now consistent and user-controlled.
* [x] **Accessibility:** No unexpected focus changes or timing issues.

## Next Steps

- Final testing by the user to confirm the pace feels right.
