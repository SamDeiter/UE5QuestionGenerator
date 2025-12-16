# Next Session Plan: Chart & Analytics Fixes

## Status as of Dec 16, 2025

- **SafeResponsiveContainer Fix**: ✅ Enhanced dimension detection with multiple delayed checks and minimum dimension threshold (10px) to prevent recharts width(-1)/height(-1) warnings.
- **Chart Components**: All chart components (`AnalyticsView.jsx`, `AnalyticsDashboard.jsx`, `TrendCharts.jsx`, `DistributionCharts.jsx`) are using `SafeResponsiveContainer`.
- **Git**: ✅ Committed: `fix: improve SafeResponsiveContainer dimension detection to prevent recharts warnings`

## Previous Session Completed Work

- **App.jsx Refactoring**: ✅ Complete. Split into `ViewRouter` and `GlobalModals`.
- **Crash Fix**: ✅ `AnalyticsDashboard` reference error resolved.
- **Quality Loop**: ✅ `promptBuilder.js` updated to include specific critiques for rejected questions.
- **Tag Connection Graph**: ✅ Added color-coded connection strength and Top 20 display.

## Immediate Next Task

**Verify Chart Warning Fix**

- Refresh the analytics page and check if the recharts width(-1)/height(-1) warnings are resolved.

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
