# ⚙️ Antigravity Agent Guide for UE5QuestionGenerator Development

This project uses the **Google Antigravity** platform to drive agentic development. This guide outlines the best practices for prompt engineering, model selection, and managing the Agent workflow within the Antigravity IDE.

## 1. Primary Agent Models (The "Brains")

Antigravity supports a multi-model architecture. For the `UE5QuestionGenerator`, we will use the following models for specific tasks to optimize for speed, cost, and quality.

| Task | Recommended Model | Rationale |
| :--- | :--- | :--- |
| **Complex Planning & Reasoning** | **Gemini 3 Pro** | Ideal for multi-step tasks, like designing the Firebase structure, integrating the Google Sheets API, or architecting the React component flow. |
| **Code Generation & Refactoring** | **Gemini 3 Pro** | Highest fidelity for writing React/JavaScript, implementing complex logic in `src/services/gemini.js`, and ensuring type-safe code. |
| **Documentation & Summary** | **Gemini 2.5 Flash** | Cost-effective for generating README updates, writing JSDoc comments, or summarizing long documentation for context reduction. |
| **UI/UX Iteration** | **Claude Sonnet 4.5** | Excellent for front-end tasks, such as generating Tailwind CSS classes, refining the layout, and providing alternative designs for the question dashboard. |

## 2. Agent Workflow & Mode Selection

Antigravity agents operate in different modes that should be selected based on the complexity of the task.

| Mode | Task Type | Best Practice |
| :--- | :--- | :--- |
| **Planning Mode** | **New Features, Complex Bug Fixes, Architecture Changes.** (e.g., *“Implement token tracking across all API calls”*) | **Always use Planning Mode** for tasks that affect multiple files or require external research (browser use). This generates the verifiable **Task List** and **Implementation Plan** Artifacts. |
| **Fast Mode** | **Simple, Localized Tasks.** (e.g., *“Rename `questionData` variable to `quizItem` in `App.jsx`”*) | Use for quick edits, renaming, or running simple terminal commands. **Avoid** for tasks that require research or major code structure changes. |

## 3. High-Value Agent Prompts

When delegating a task, provide a focused, goal-oriented prompt.

### 🎯 Feature Implementation Prompt

> "As the lead architect, I need you to implement the **Database View** feature.
> 1.  Create a new React component at `src/views/DatabaseView.jsx`.
> 2.  Fetch all question documents from the Firestore collection `/questions`.
> 3.  Display the data in a table using a maximum of 5 columns (Question Text, Type, Difficulty, Language, Last Modified Date).
> 4.  The entire view must use **Tailwind CSS** for styling and be fully accessible (ARIA labels). **Use Planning Mode.**"

### 🛡️ Security / Refactoring Prompt

> "The current API key management in `App.jsx` is insecure.
> 1.  Refactor all direct Gemini API calls to use a new Firebase Function endpoint: `/api/generate_question`.
> 2.  Ensure the client-side code passes the necessary Firebase Authentication token with the request.
> 3.  **Do not** expose the raw `VITE_GEMINI_API_KEY` in any client-side code."

### 📝 Documentation Prompt

> "Using the code you just generated, write a detailed `WALKTHROUGH.md` artifact summarizing the steps taken to implement the **Database View** feature, including a screenshot of the final UI."

## 4. Reviewing Artifacts and Feedback

One of the core strengths of Antigravity is the use of **Artifacts**.

* **Review Policy**: The recommended default is **"Agent Decides"** for simple tasks, but set to **"Always Proceed"** only for routine, low-risk changes like dependency updates.
* **Providing Feedback**: If an **Implementation Plan** or a **Code Diff** looks incorrect, leave a Google-Doc-style comment directly on the Artifact. The agent will read this feedback and adjust its execution **without needing to be stopped and restarted.**
* **Verification**: Always review the **Screenshots** and **Browser Recordings** (if enabled) in the Manager View to ensure the functional requirement was met before merging the branch.
## 5. Coding Standards & Tools

*   **Python for File Edits**: When making changes to files (especially complex refactors or multi-line edits), **always prioritize using Python scripts** over direct text replacement tools. This ensures robustness against encoding issues and complex pattern matching.


## 6. Critical Project Documentation

To ensure you have full context before starting any task, **ALWAYS** check these reference files if they are available:

*   **`AGENTS.md`**: Contains specific instructions, persona definitions, and strict rules for each Agent role. You must follow the directives in this file.
*   **`ANCHOR_MANIFEST.md`**: Serves as the "map" of the project. It lists key files, their purposes, and known issues. Consult this to understand where to find code and where to place new files.
