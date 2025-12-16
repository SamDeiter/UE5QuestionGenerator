# Next Session Plan: Chart & Analytics Fixes

## Status as of Dec 16, 2025

- **Recharts Warnings Fix**: ✅ **RESOLVED** - Fixed `width(-1)/height(-1)` warnings by passing explicit pixel dimensions to `ResponsiveContainer`.
- **JSON Parsing Fix**: ✅ **RESOLVED** - Fixed markdown code block stripping to handle Windows line endings (`\r\n`).
- **Git**: ✅ All changes committed and pushed to `main`.

## Commits This Session

1. `fix: improve SafeResponsiveContainer dimension detection to prevent recharts warnings`
2. `fix: use explicit pixel dimensions in ResponsiveContainer to eliminate warnings`
3. `fix: handle Windows line endings when stripping markdown code blocks from AI response`

## Previous Session Completed Work

- **App.jsx Refactoring**: ✅ Complete. Split into `ViewRouter` and `GlobalModals`.
- **Crash Fix**: ✅ `AnalyticsDashboard` reference error resolved.
- **Quality Loop**: ✅ `promptBuilder.js` updated to include specific critiques for rejected questions.
- **Tag Connection Graph**: ✅ Added color-coded connection strength and Top 20 display.

## Pending Tasks

### 1. Data Export Enhancement (Step 1.3 from Roadmap)

Ensure rich metadata (Critiques, Rejection Reasons, Quality Scores) is properly saved to Google Sheets.

**Action Items:**

1. **Update `Code.gs`**:
   - Add `RejectionReason`, `RejectedAt`, `HumanVerifiedBy` to the `HEADERS` constant.
   - Deploy the new script version.
2. **Update `googleSheets.js`**:
   - Map these new fields in the `saveQuestionsToSheets` payload.
3. **Verify**:
   - Export a batch of questions (including some rejected ones if possible) and check the Sheet.

### 2. Code Cleanup (Sanitation)

- [ ] Reduce lint warnings from 343 -> 0.
- [ ] Extract large components identified in `CODE_QUALITY.md`.
