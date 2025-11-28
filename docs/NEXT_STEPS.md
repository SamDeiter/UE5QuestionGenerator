# Project Roadmap: Remaining Tasks

## 🟢 Phase 1: Final Validation & Polish (Current Priority)
**Goal:** Ensure the application is polished, accessible, and bug-free for release.

### 1.1 Manual Validation
- [ ] **End-to-End Walkthrough:** Manually test the full flow: Generate -> Review -> Edit -> Export.
- [ ] **Edge Cases:** Test with network offline, invalid API keys, and malformed CSV imports.
- [ ] **Cross-Browser Check:** Verify layout on Chrome, Firefox, and Edge.

### 1.2 Accessibility (WCAG 2.1 AA)
- [ ] **Focus Indicators:** Ensure all interactive elements have visible focus states for keyboard users.
- [ ] **Screen Reader Testing:** Verify compatibility with NVDA or Narrator.
- [ ] **Reduced Motion:** Respect user's system preference for reduced motion.

---

## 🟡 Phase 2: Scaling & Infrastructure (Next Up)
**Goal:** Prepare the application for heavier usage and higher quality generation.

### 2.1 Vertex AI Integration
- [ ] **Dataset Preparation:** Curate a dataset of 100+ "Gold Standard" questions.
- [ ] **Fine-tuning:** Train a custom Gemini model on Vertex AI for consistent formatting and tone.
- [ ] **Integration:** Update `gemini.js` to use the fine-tuned model endpoint.

### 2.2 Robust Rate Limiting
- [ ] **Queue System:** Implement a request queue to manage API limits (RPM/TPM).
- [ ] **User Feedback:** Show precise "Cooling down..." timers to the user when limits are hit.

---

## 🔵 Phase 3: Future Enhancements (Backlog)
**Goal:** Add value-add features based on user feedback.

### 3.1 Advanced Analytics
- [ ] **Dashboard:** Visual graphs of question difficulty distribution.
- [ ] **Export History:** Track previously exported batches to prevent duplicates.

### 3.2 Content Expansion
- [ ] **New Disciplines:** Add support for C++, Animation, and Audio specific question types.
- [ ] **Image Generation:** (Experimental) Generate diagrams for questions.

---

## ✅ Completed Milestones
- **Core Functionality:** Question Generation, Translation, Import/Export.
- **Testing:** Unit Tests (Utilities), Integration Tests (Generation, Translation, Import/Export).
- **UX/UI:** Virtual Scrolling, Dark Mode, Responsive Design.
- **Documentation:** User Guide, Developer Guide.
