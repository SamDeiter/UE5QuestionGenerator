# Task List for Admin Panel Cleanup

## Overview

We will modernize, simplify, and make the admin panel accessible, performant, and visually premium.

## Tasks

1. **Audit Existing Components**
   - Review `AdminPanel.jsx` and `AdminInviteManager.jsx` for dead code, duplicated logic, and styling inconsistencies.
2. **Design Refresh**
   - Apply a glassmorphism style with vibrant gradients.
   - Use Google Font **Inter** for typography.
   - Ensure dark‑mode support.
3. **Component Refactor**
   - Split large components into smaller functional components (<150 lines each).
   - Move any business logic to custom hooks under `src/hooks/admin/`.
4. **Accessibility Improvements**
   - Add proper ARIA labels, keyboard navigation, focus outlines.
   - Ensure color contrast meets WCAG AA.
5. **Styling Consolidation**
   - Create/extend `src/index.css` with design tokens (colors, spacing, shadows).
   - Replace inline Tailwind classes with CSS variables where appropriate.
6. **SCORM 1.2 Compatibility**
   - Verify that any new assets or scripts are referenced in the SCORM manifest.
7. **Testing**
   - Write unit tests for new hooks and component rendering.
   - Add visual regression tests (e.g., using Storybook snapshots).
8. **Documentation**
   - Update `README.md` and create a `docs/admin_panel_cleanup.md` walkthrough.
9. **Git Workflow**
   - Commit after each atomic task with descriptive messages.

## Acceptance Criteria

- Admin panel UI matches the new premium design.
- No console warnings or errors.
- All new components pass unit tests (≥90% coverage).
- Accessibility audit passes with no violations.
- SCORM manifest includes any new resources.
