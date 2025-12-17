# Plan: Enhance Test Creation Tool & Fix ContextToolbar

## Objective

Fix the reported "500 Internal Server Error" (likely a render crash) in `ContextToolbar.jsx`, enable the toolbar for the new "Test Mode", and ensure the `TestView` mock data generation and filtering work correctly.

## Diagnosis

1. **ContextToolbar Crash:** `ContextToolbar.jsx` does not handle `mode="test"`. While it returns an empty div, unexpected prop configurations from `MainLayout` when in this mode might be causing issues.
2. **TestView Filters:** The discipline filter in `TestView` relies on `approvedQuestions`. If no questions exist, the dropdown is empty. We need to ensure it populates correctly, especially when Mock Data is generated.
3. **Mock Data:** `TestView` has mock data logic, but we need to verify it integrates with the filter logic.

## Tasks

### 1. Fix & Enhance `ContextToolbar.jsx`

- Add `renderTestToolbar` function to handle `mode === "test"`.
- Display a "Test Configuration" title in the toolbar when in Test Mode.
- Add a default catch-all render to prevent null/empty rendering issues.

### 2. Update `TestView.jsx`

- **Mock Data:** Ensure `generateMockData` is called and the questions are added to `approvedQuestions` correctly (logic seems mostly there, but we will double check).
- **Filters:** Ensure the "Discipline" dropdown includes disciplines from Mock Data.
- **Structure:** Ensure the internal "Filter Card" works in tandem with the mock data.

### 3. Verification

- The user will need to verify the fix by running the app.

## Implementation Details

### ContextToolbar.jsx

```javascript
  const renderTestToolbar = () => (
    <div className="flex justify-between items-center w-full">
       <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
         Test Configuration
       </span>
    </div>
  );
```

### TestView.jsx

- Check passing of `config` prop.
- Ensure mock questions have valid `discipline` fields that populate the dropdown.
