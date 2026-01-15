# Implementation Plan for Admin Panel Cleanup

## Overview

The goal is to modernize the admin panel UI, improve code quality, ensure accessibility, and maintain SCORM 1.2 compatibility. The plan follows Antigravity’s three‑phase workflow (Planning → Execution → Verification) and adheres to all mandatory reviews (Security, Quality, Accessibility).

## Phase A: Planning & Artifacts (Completed)

- **Task List**: `task.md` created with granular tasks.
- **Implementation Plan**: This document (generated now).
- **Human Approval Required**: Await user confirmation before any code changes.

## Phase B: Execution Steps (Atomic Commits)

| Step | Description | Files Affected | Sub‑tasks | Tests | Commit Message |
|------|-------------|----------------|----------|-------|----------------|
| 1 | **Audit Existing Components** – Identify dead code, duplicated logic, and styling inconsistencies. | `src/components/Admin/AdminPanel.jsx`, `src/components/Admin/AdminInviteManager.jsx` | Run ESLint, search for `console.log`, unused imports. | None (static analysis) | `chore: audit admin components` |
| 2 | **Design Refresh – CSS Tokens** – Add design tokens for glassmorphism, gradients, dark‑mode, and typography (Inter). | `src/index.css` | Define `--color-primary`, `--bg-glass`, `--shadow-elevated`. Import Google Font in `index.html`. | Visual regression test (Storybook snapshot). | `feat: add design tokens & Inter font` |
| 3 | **Refactor AdminPanel** – Split into smaller components (<150 lines). Create `AdminHeader.jsx`, `AdminSidebar.jsx`, `AdminContent.jsx`. | New files under `src/components/Admin/` | Extract UI sections, move state to hooks. | Unit tests for each component. | `refactor: split AdminPanel into sub‑components` |
| 4 | **Refactor AdminInviteManager** – Move business logic to custom hook `useAdminInvite`. | New hook `src/hooks/admin/useAdminInvite.js` | API calls, loading state, error handling. | Hook unit tests with mock fetch. | `refactor: extract invite logic to hook` |
| 5 | **Accessibility Improvements** – Add ARIA labels, keyboard navigation, focus outlines, ensure color contrast. | Updated component files, CSS tokens. | Use axe-core for automated audit. | Accessibility test suite. | `feat: improve admin panel accessibility` |
| 6 | **SCORM 1.2 Compatibility Check** – Verify any new assets (fonts, images) are referenced in `scormmanifest.xml`. | `scormmanifest.xml` (if exists) | Add `<resource>` entries for new CSS/JS. | None (manual verification). | `chore: update SCORM manifest` |
| 7 | **Testing** – Write Jest/Vitest tests for new components and hooks. Achieve ≥90% coverage. | `src/__tests__/admin/*` | Mock API, snapshot testing. | Run `npm test`. | `test: add admin panel unit tests` |
| 8 | **Documentation** – Update `README.md` and create `docs/admin_panel_cleanup.md` with before/after screenshots and design rationale. | `README.md`, `docs/admin_panel_cleanup.md` | Generate screenshots via browser sub‑agent. | None. | `docs: add admin panel cleanup walkthrough` |
| 9 | **Git Workflow** – After each step, commit, push, and tag version bump in `package.json`. | `package.json` | Increment patch version. | None. | `chore: bump version to x.x.x` |

## Phase C: Verification (Deliverables)

- **Walkthrough**: `walkthrough.md` summarizing changes, screenshots, and performance metrics.
- **Browser Recordings**: Video of admin panel UI before and after.
- **Screenshots**: High‑resolution before/after images.
- **Test Results**: Output of `npm test` with coverage report.
- **Accessibility Report**: Axe audit JSON with zero violations.

## Security Review Checklist

- No API keys or secrets are hard‑coded; all env vars accessed via `import.meta.env`.
- Input sanitization for invite email fields using a whitelist regex.
- All network requests use HTTPS.

## Quality Review Checklist

- Code follows PEP‑8‑style for JS/TS (eslint‑airbnb) and the project’s `code-style-guide.md`.
- Lint passes with `npm run lint`.
- Unit test coverage ≥90%.

## Accessibility Review Checklist

- All interactive elements have `role` and `aria-label` where needed.
- Keyboard focus order logical.
- Contrast ratios ≥4.5:1 (AA).

---
**Next Step**: Await your approval to proceed with the execution phase.
