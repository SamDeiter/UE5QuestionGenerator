# Project Roadmap: Next Steps

## 🟢 Phase 1: Advanced User Experience (Immediate Priority)
**Goal:** Enhance the user interface with visual analytics and smarter workflows.

### 1.1 Visual Analytics Dashboard
- [ ] **Charts:** Implement `recharts` or `chart.js` to visualize the metrics data (Difficulty Distribution, Token Usage over time).
- [ ] **Trends:** Show quality trends over time (e.g., "Are my questions getting better?").

### 1.2 Robust Rate Limiting
- [ ] **Queue System:** Implement a request queue to manage API limits (RPM/TPM).
- [ ] **User Feedback:** Show precise "Cooling down..." timers to the user when limits are hit.

### 1.3 Enhanced Data Export
- [ ] **Metadata Columns:** Add columns for AI Critique, Score, and Token Cost to Google Sheets export.
- [ ] **Apps Script Update:** Modify `Code.gs` to handle dynamic columns and metadata.

---

## 🟡 Phase 2: AI-Assisted Workflows (Next Up)
**Goal:** Streamline the review and editing process.

### 2.1 Smart Tools
- [ ] **Auto-Fix:** Add a "Fix it" button next to AI Critiques to automatically apply suggestions.
- [ ] **Prompt Playground:** A UI to tweak system prompts without editing code.

### 2.2 Offline Capabilities
- [ ] **PWA Support:** Make the app installable and functional offline (viewing/editing existing questions).

---

## 🔵 Phase 3: Long-Term Scaling (Backlog)
**Goal:** Prepare for enterprise-scale usage after Question Bank is established.

### 3.1 Vertex AI Integration
- [ ] **Data Collection:** Continue collecting "Gold Standard" questions (Target: 1000+).
- [ ] **Fine-tuning:** Train a custom Gemini model on Vertex AI using the collected data.
- [ ] **Integration:** Update `gemini.js` to use the fine-tuned model endpoint.

### 3.2 Content Expansion
- [ ] **New Disciplines:** Add support for C++, Animation, and Audio specific question types.
- [ ] **Image Generation:** (Experimental) Generate diagrams for questions.

---

## ✅ Completed Milestones
- **Core Functionality:** Question Generation, Translation, Import/Export.
- **Refactoring:** Modular Component Architecture, Constants Extraction.
- **Performance:** Code Splitting (Lazy Loading), Memoization, Component Extraction (QuestionItem sub-components).
- **Metrics:** Token Usage Tracking, Question Quality Dashboard.
- **Accessibility:** WCAG 2.1 AA Compliance (Focus, ARIA, Reduced Motion).
- **Validation:** Error Boundaries, Unit & Integration Tests.
- **User Onboarding:** Interactive Tutorial System with guided tour.
- **Authentication:** Firebase Authentication with Google Sign-In.
- **Security:** Firestore security rules enforcing user data ownership.

## 📅 Recently Completed (Dec 4, 2025)

### Phase 2: Performance Optimization ✅
- **Component Refactoring:**
  - Extracted `QuestionItem` into 6 sub-components: `QuestionHeader`, `QuestionContent`, `QuestionMetadata`, `LanguageControls`, `QuestionActions`, `QuestionMenu`
  - Extracted `QuestionList` and `BulkActionBar` from `App.jsx`
  - Applied `React.memo` for optimized re-rendering
  - Reduced `QuestionItem.jsx` from 578 LOC to ~180 LOC

### Phase 3: Interactive Tutorial ✅
- **Tutorial System:**
  - Created `TutorialOverlay` component with spotlight effect
  - Defined 6-step guided tour for new users
  - Implemented smart boundary checking to prevent tooltips going off-screen
  - Added "Restart Tutorial" button in Header
  - Integrated tutorial state management with localStorage
  - Added `data-tour` attributes to key UI elements

