# 🧹 Code Quality & Sanitation Plan

This document outlines the standards and workflows for maintaining code quality in the `UE5QuestionGenerator` project.

## 1. Linting Strategy
We use **ESLint** with a modern Flat Config (`eslint.config.js`).

### Core Rules
- **Framework**: `eslint:recommended`, `plugin:react/recommended`, `plugin:react-hooks/recommended`.
- **Formatting**: We rely on ESLint for basic stylistic issues, but primarily focus on logical correctness.
- **Unused Variables**: `warn` (Use `_` prefix for intentionally unused args).
- **Console**: Allowed (`off`) for development logging.

### Workflow
- **Continuous**: The AI Agent checks for lint errors during file edits.
- **On-Demand**: Run `npm run lint` to scan the entire codebase.

## 2. Code Sanitation Plan

### Component Structure
- **Modularization**: Components exceeding 300 LOC should be analyzed for extraction (e.g., `App.jsx` split into `GlobalModals` and `ViewRouter`).
- **File Limits**: Keep React components focused on a single responsibility.

### State Management
- **Hooks**: Use custom hooks (`useGeneration`, `useExport`) for complex logic to keep UI components clean.
- **Context**: (Future) Migrate global state to Context API if prop drilling exceeds 3 levels.

### testing
- **Integration Tests**: Critical paths (Generation -> Prompt -> Parsing) must be covered by integration tests in `src/__tests__/`.
- **Unit Tests**: Utility functions (`helpers.js`, `promptBuilder.js`) should have unit tests.

## 3. Sanitation Status (Dec 9, 2025)

### Completed ✅
- [x] **Critical Errors Fixed** (17 → 0): Missing imports, syntax errors, dead code, duplicate keys
- [x] **Unused Import Cleanup**: Removed unnecessary `React` imports (64 files), restored where `React.*` used (8 files)
- [x] **ESLint Auto-fix Applied**: `prefer-const`, formatting issues
- [x] **Integration Test Verified**: Feedback loop test passing

### Current Status
- **Errors**: 0
- **Warnings**: 26 (down from 343 - **92% reduction**)
- **Remaining**: Hook deps, catch variables

### Remaining Work
- [ ] Remove unused component imports in `App.jsx`, `Sidebar.jsx`, etc.
- [ ] Address `react-hooks/exhaustive-deps` warnings (3 instances)
- [ ] Set up pre-commit hooks for automated linting
