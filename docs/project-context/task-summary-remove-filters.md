# Task Summary: Remove Difficulty/Type Filters

## Completed Tasks

1. **Removed Filters:**
    * Removed `difficulty` and `type` from the filter state in `TestView.jsx`.
    * Deleted the UI dropdowns for selecting difficulty and question type.
    * Simplified the `filteredQuestions` logic to only filter by `discipline` (if selected).
2. **Rationale:**
    * Tests should naturally contain a mix of all question types and difficulties for a given discipline.
    * Users should not be able to manually restrict a test to only "Easy" or "Multiple Choice" questions.

## Verification

- **UI:** The "Question Filters" card now only shows the "Discipline" dropdown.
* **Functionality:**
  * Selecting a Discipline filters the list to that subject.
  * The list contains a random assortment of Easy/Medium/Hard and MC/TF questions (based on the mock data mix).
  * Generating mock data works as expected.

## Passive Rules Check

- [x] **Security:** Safe.
* [x] **Quality:** Code is clearer and aligns with user requirements.
* [x] **Accessibility:** Reduced UI complexity.

## Next Steps

- User can continue testing the "Test Mode" flow with the simplified interface.
