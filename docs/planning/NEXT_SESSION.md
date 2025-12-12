# Next Session Plan: Data Export & Quality Loop

## Status as of Dec 9, 2025
- **App.jsx Refactoring**: ✅ Complete. Split into `ViewRouter` and `GlobalModals`.
- **Crash Fix**: ✅ `AnalyticsDashboard` reference error resolved.
- **Quality Loop**: ✅ `promptBuilder.js` updated to include specific critiques for rejected questions.
- **Git**: ✅ All changes committed and pushed to `main`.

## Immediate Next Task
**Implement Enhanced Data Export (Step 1.3 from Roadmap)**
We need to ensure that the rich metadata we are generating (Critiques, Rejection Reasons, Quality Scores) is properly saved to the Google Sheets backend.

### Action Items:
1.  **Update `Code.gs`**:
    - Add `RejectionReason`, `RejectedAt`, `HumanVerifiedBy` to the `HEADERS` constant.
    - Deploy the new script version.
2.  **Update `googleSheets.js`**:
    - Map these new fields in the `saveQuestionsToSheets` payload.
3.  **Verify**:
    - export a batch of questions (including some rejected ones if possible) and check the Sheet.

### 3. Code Cleanup (Sanitation)
- [ ] Reduce lint warnings from 343 -> 0.
- [ ] Extract large components identified in `CODE_QUALITY.md`.
