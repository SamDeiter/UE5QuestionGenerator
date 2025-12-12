# Project Roadmap: Next Steps

## 🟢 Phase 1: Advanced User Experience (Immediate Priority)

**Goal:** Enhance the user interface with visual analytics and smarter workflows.

### 1.1 Visual Analytics Dashboard ✅

- [x] **Charts:** `recharts` already integrated with Difficulty Distribution, Token Usage, Quality Trends.
- [x] **Trends:** Quality trends over time shown in AnalyticsView and TrendCharts.

### 1.2 Robust Rate Limiting ✅

- [x] **Queue System:** Implemented `rateLimitState.js` with reactive state manager.
- [x] **User Feedback:** Added `CooldownTimer.jsx` component showing countdown timers.

### 1.3 Enhanced Data Export ✅

- [x] **Metadata Columns:** Add columns for AI Critique, Score, and Token Cost to Google Sheets export.
- [x] **Apps Script Update:** Modify `Code.gs` to handle dynamic columns and metadata.

### 1.4 Code Health & Sanitation ✅

- [x] **Lint Config:** ESLint config already ignores tools/backups.
- [x] **Cleanup:** Fixed remaining lint warnings (0 warnings now).
- [x] **Pre-commit:** Husky + lint-staged enforces ESLint before commit.

---

## 🟡 Phase 2: AI-Assisted Workflows (Next Up)

**Goal:** Streamline the review and editing process.

### 2.1 Smart Tools

- [x] **Auto-Fix:** "APPLY FIX" button applies AI suggestions (keeps question pending for human review).
- [ ] **Reduce Hardcoded Values:** Consolidate magic numbers into `constants.js` (e.g., `QUALITY_PASS_THRESHOLD = 70`).
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

## 📅 Recently Completed (Dec 9, 2025)

### Phase 2: Architecture & Quality Loop ✅

- **App.jsx Refactoring:**
  - Extracted `GlobalModals.jsx` to centralize all modal logic (reduced `App.jsx` complexity).
  - Created `ViewRouter.jsx` to handle main content switching.
  - Cleaned up unused imports and `AnalyticsDashboard` crash.
- **AI Feedback Loop:**
  - Enhanced `promptBuilder.js` to feed Rejected Questions + Critiques back into the context.
  - Added "CRITICAL: FAILURE AVOIDANCE" section to system prompt.
- **Analytics:**
  - Confirmed `AnalyticsDashboard` includes Topic Coverage and Quality metrics.

## 🚀 Immediate Next Steps (Next Session)

### 1. Enhanced Data Export (Priority) ✅

- **Goal:** Ensure the "Gold Standard" dataset allows looking back at *why* questions failed.
- [x] **Update `Code.gs`:** Add columns for `RejectionReason`, `HumanVerifiedBy`, and `RejectedAt`.
- [x] **Update `googleSheets.js`:** Map the new fields in the save payload.
- [x] **Verify:** Export a mixed batch of questions to validate the new columns.

### 2. Testing (Next Up) ✅

- [x] Run a full generation batch to test the new "Failure Avoidance" prompt. (Verified via `feedbackLoop.integration.test.jsx`)

---

## 📅 Previously Completed (Dec 4, 2025)

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
