# UE5 Question Generator - Developer Guide

## 💻 Technology Stack
*   **Framework:** React 18
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **Icons:** Lucide React
*   **Testing:** Vitest + React Testing Library
*   **AI Integration:** Google Gemini API

---

## 📂 Project Structure

```
src/
├── components/         # UI Components
│   ├── QuestionItem.jsx    # Individual question card
│   ├── Icon.jsx            # Icon wrapper
│   ├── FlagIcon.jsx        # Language flag icons
│   └── Toast.jsx           # Notification system
├── services/           # External Services
│   ├── gemini.js           # AI Generation logic
│   └── googleSheets.js     # Google Apps Script integration
├── utils/              # Helper Functions
│   ├── helpers.js          # Formatting, sanitization
│   ├── fileProcessor.js    # CSV parsing/import
│   ├── exportUtils.js      # CSV generation/export
│   ├── questionFilters.js  # Filtering logic
│   └── constants.js        # App constants (Languages, Limits)
├── App.jsx             # Main Application Controller
└── main.jsx            # Entry point
```

---

## 🔑 Key Components

### `App.jsx`
The main controller component that handles:
*   **State Management:** `questions`, `config`, `appMode` ('create', 'review', 'database').
*   **Persistence:** Saves state to `localStorage`.
*   **Routing:** Manages views (Create vs Review vs Database).

### `QuestionItem.jsx`
Renders a single question card. Handles:
*   **Display:** Renders badges, question text, options.
*   **Interactions:** Accept/Reject, Translate, Expand Menu.
*   **Styling:** Dynamic gradients based on difficulty.

---

## 🧪 Testing
The project uses **Vitest** for unit testing.

### Running Tests
```bash
npm test        # Run all tests
npm test -- ui  # Run tests with UI interface
```

### Test Files
*   `src/components/QuestionItem.test.jsx`: UI component tests.
*   `src/utils/questionFilters.test.js`: Logic tests for filtering.
*   `src/utils/exportUtils.test.js`: Logic tests for CSV export.
*   `src/utils/fileProcessor.test.js`: Logic tests for file parsing.

---

## 🚀 Deployment

### Build for Production
```bash
npm run build
```
This generates static files in the `dist/` directory.

### Deploy to GitHub Pages
```bash
npm run deploy
```
This pushes the `dist/` folder to the `gh-pages` branch.

---

## 🤝 Contribution Guidelines
1.  **Code Style:** Follow standard React/ES6+ conventions.
2.  **Commits:** Use descriptive commit messages (e.g., `feat: Add new filter`, `fix: CSV parsing error`).
3.  **Testing:** Ensure all tests pass (`npm test`) before pushing.
