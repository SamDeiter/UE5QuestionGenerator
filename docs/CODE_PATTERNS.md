# 📐 Code Patterns & Style Guide

This document defines the standard coding patterns for the `UE5QuestionGenerator` project. All agents and developers must adhere to these patterns to ensure consistency, maintainability, and performance.

## 1. Component Architecture

### ✅ Functional & Compositional
We prioritize small, single-responsibility functional components over monolithic ones.
* **Pattern:** Break large UI elements into sub-components (e.g., `QuestionItem` was split into 10 sub-components).
* **Rule:** If a component exceeds ~200 lines, refactor it.

```jsx
// ❌ Avoid: Monolithic components with mixed concerns
function QuestionItem() {
  // ... 500 lines of drag logic, edit logic, and render logic
}

// ✅ Preferred: Composition
function QuestionItem({ data }) {
  return (
    <Card>
      <QuestionHeader info={data.info} />
      <QuestionBody text={data.text} />
      <QuestionActions onEdit={handleEdit} />
    </Card>
  );
}