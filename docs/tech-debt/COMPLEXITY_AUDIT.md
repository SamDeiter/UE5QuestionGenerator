# Code Complexity Audit

**Date**: December 14, 2025
**Auditor**: Antigravity

## Executive Summary

The codebase is generally well-structured with clear separation of concerns in `src/services` and `src/utils`. However, two key areas have accumulated significant complexity and are candidates for immediate refactoring post-presentation.

---

## 🚨 High Complexity Alerts

### 1. `src/hooks/useGeneration.js` (Critical)

* **Size**: ~1,200 lines
* **Issue**: "God Hook" anti-pattern. This hook manages too many distinct responsibilities.
* **Identified Responsibilities**:
    1. API Orchestration (Gemini)
    2. Prompt Construction
    3. Quota Enforcement
    4. Logic Transformation (MC to True/False conversion)
    5. Source Verification (URL matching)
    6. Analytics Logging
    7. Auto-Critique Flow
    8. Translation Flow
* **Cyclomatic Complexity**: The `handleGenerate` function alone is ~600 lines with deep nesting (Quota Checks -> Type Balancing -> API Call -> Parsing -> Filtering -> Verification -> Critiquing).
* **Risk**: High. modifying one part of the flow (e.g., translation) can inadvertently break state for another (e.g., generation status).

**Recommendation**: Split into specialized hooks:

* `useScenarioGenerator`: Only handles the prompt-to-question flow.
* `useAutoCritique`: Handles the background critique process.
* `useTranslation`: Handles single and bulk translation.
* Move `convertMCtoTF` to `src/utils/questionTransformers.js`.

### 2. `src/App.jsx` (Moderate)

* **Size**: ~640 lines
* **Issue**: Prop Drilling and "Hook Soup".
* **Observation**: The component body (lines 50-360) is almost entirely hook initializations. It passes massive props down to children (e.g., `sidebarProps` has 20+ keys).
* **Risk**: Moderate. Adding a new global setting requires plumbing it through `App.jsx` -> `MainLayout` -> `Sidebar`.

**Recommendation**: Implement React Context.

* `ConfigContext`: For `config`, `setConfig`, `appMode`.
* `QuestionContext`: For `questions`, `unifiedQuestions`, `updateQuestion`.
* `GenerationContext`: For `handleGenerate`, `isGenerating`.

---

## ⚠️ Complexity Hotspots (Medium Priority)

### 3. `src/hooks/useQuestionManager.js`

* **Status**: Recently refactored (Unified View), but still manages 3 separate state lists (`questions`, `historical`, `database`).
* **Complexity**: The synchronization logic (filtering duplicates, merging maps) is intricate.
* **Recommendation**: Move pure logic (deduplication, merging) to `src/utils/questionStateHelpers.js` and keep the hook focused on React state.

### 4. `src/services/scormExporter.js`

* **Status**: Functional but mixes XML template manipulation with string replacement.
* **Recommendation**: Future-proof by using a proper XML builder library if requirements grow, rather than regex replacements.

---

## Action Plan (Post-Presentation)

1. **Phase 1: Safe Extraction (Day 1)**
    * Move `convertMCtoTF` to `src/utils`.
    * Move Source Verification logic to `src/utils`.
    * No logical changes, just file re-organization.

2. **Phase 2: Hook Decomposition (Day 2-3)**
    * Break `useGeneration` into `useGenerator`, `useCritique`, `useTranslator`.
    * Update `App.jsx` to consume these smaller hooks.

3. **Phase 3: Context Implementation (Day 4+)**
    * Wrap App in `ConfigProvider` and `QuestionProvider`.
    * Remove prop drilling from `App.jsx`.
