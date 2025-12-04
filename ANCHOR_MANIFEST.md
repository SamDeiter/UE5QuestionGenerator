# Anchor Manifest

This file lists the key components and files ("anchors") of the project for quick reference.

## Core Application
- `src/App.jsx` - Main application orchestrator (701 lines - **needs refactoring**)
- `src/main.jsx` - React entry point
- `index.html` - HTML template

## Major Components
- `src/components/QuestionItem.jsx` - Individual question display (577 lines - **needs refactoring**)
- `src/components/ReviewMode.jsx` - Review interface
- `src/components/DatabaseView.jsx` - Database view
- `src/components/AnalyticsDashboard.jsx` - Metrics dashboard (lazy loaded)
- `src/components/SettingsModal.jsx` - Settings configuration (373 lines)
- `src/components/Sidebar.jsx` - Generation controls
- `src/components/Header.jsx` - App header
- `src/components/LandingPage.jsx` - Mode selection

## Dialog Components (New)
- `src/components/ConfirmDialog.jsx` - Custom confirmation modal
- `src/components/PromptDialog.jsx` - Custom prompt modal
- `src/components/BulkExportModal.jsx` - Export options

## Services
- `src/services/gemini.js` - Gemini API integration
- `src/services/googleSheets.js` - Google Sheets integration
- `src/services/firebase.js` - Firestore integration
- `src/services/promptBuilder.js` - AI prompt construction

## Custom Hooks
- `src/hooks/useQuestionManager.js` - Question state management
- `src/hooks/useGeneration.js` - Question generation logic (471 lines)
- `src/hooks/useExport.js` - Export functionality
- `src/hooks/useAppConfig.js` - App configuration
- `src/hooks/useFileHandler.js` - File upload handling

## Utilities
- `src/utils/helpers.js` - General utilities (431 lines - **should split**)
- `src/utils/analyticsStore.js` - Analytics tracking
- `src/utils/tokenCounter.js` - Token usage calculation
- `src/utils/contextOptimizer.js` - Context optimization
- `src/utils/constants.js` - App constants
- `src/utils/questionFilters.js` - Filtering logic

## Configuration
- `vite.config.js` - Vite configuration
- `tailwind.config.js` - Tailwind CSS config
- `package.json` - Dependencies and scripts
- `firebase.json` - Firebase config
- `firestore.rules` - Firestore security rules (**needs update**)

## Documentation
- `README.md` - Project overview
- `AGENTS.md` - Agent guidelines
- `docs/` - Detailed documentation
  - `NEXT_STEPS.md` - Roadmap
  - `USER_GUIDE.md` - User documentation
  - `DEVELOPER_GUIDE.md` - Developer documentation
  - `V1.6_CHECKLIST.md` - Version 1.6 status

## Google Apps Script
- `Code.gs` - Google Sheets backend (176 lines)

## Testing
- `src/__tests__/` - Test files
  - `questionGeneration.integration.test.jsx`
  - `translation.integration.test.jsx`
  - `testHelpers.js`

## Known Issues
- `App.jsx` - Too large (701 lines), needs refactoring
- `QuestionItem.jsx` - Too large (577 lines), needs refactoring
- `helpers.js` - Should be split into focused modules
- `firestore.rules` - Currently too permissive (allow all)

## Planned Components (Not Yet Created)
- `src/components/Tutorial/` - Interactive tutorial system
- `src/components/QuestionItem/` - Refactored sub-components
- `src/components/AppLayout.jsx` - Layout wrapper
- `src/utils/validation.js` - Input validation utilities
