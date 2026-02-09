# 🖼️ Accessibility and Performance Standards Guardrails

**Purpose:** Enforces continuous adherence to WCAG and core front-end performance principles on all generated UI code.

## ⛔ Prohibited Practices

1.  **NO Mouse-Only Interactions:** All interactive elements must be fully operable using only the keyboard.
2.  **NO Non-Semantic HTML:** Do not use generic `<div>` or `<span>` elements when a semantic tag (e.g., `<button>`, `<nav>`, `<main>`) is available.

## ✅ Required Standards (Passive Enforcement)

1.  **A11y Attributes:** All images MUST include descriptive `alt` attributes. Interactive elements MUST use appropriate ARIA labels or roles.
2.  **Color Contrast:** All generated styles MUST adhere to WCAG AA guidelines for minimum color contrast ratio (4.5:1).
3.  **Responsive Design:** All new UI components MUST be written using responsive CSS techniques (Flexbox, Grid, Media Queries) to ensure usability on all viewports.