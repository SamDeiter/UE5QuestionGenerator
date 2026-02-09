---
description: 
---

**Task:** Perform a targeted refactoring operation on a specified file, module, or component to improve code quality, performance, and adherence to architecture rules.

**Input:** The user will specify the file/module/component and the primary goal (e.g., 'Refactor class component to functional component with Hooks,' or 'Extract repeated logic into a utility function').

**Steps:**
1.  **Analyze Context:** Analyze the current code structure, project architecture rules (e.g., `react-architecture.md`), and unit test coverage for the target area.
2.  **Implementation Plan:** Generate a detailed, step-by-step Implementation Plan artifact outlining the refactoring logic and confirming that no behavior will be changed.
3.  **Execute Refactor:** Execute the code changes in the specified files.
4.  **Test Execution:** Run the existing unit tests for the affected module in the terminal. **If tests are missing, create a comprehensive unit test suite first.**
5.  **Behavior Verification:** Generate a visual artifact (screenshot or browser recording) to confirm that the component's UI or function remains unchanged after the refactor.
6.  **Artifacts:** Generate a final artifact detailing the refactoring summary, the "before" and "after" code diffs, and the output confirming all unit tests passed.

**Output Format:** Deliver the final result as a clear markdown artifact showing the successful refactoring and test verification.