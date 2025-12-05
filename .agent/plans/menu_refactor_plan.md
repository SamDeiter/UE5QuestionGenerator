# Implementation Plan - Navigation & Menu Refactor

The goal is to reorganize the main application menu to improve usability, reduce visual clutter, and separate "Navigation" (where am I?) from "Tools" (what can I do here?).

## 1. Current Issues
- **Mixed Concerns**: Navigation modes (Create/Review), Data actions (Load/Export), and View filters (Pending/Accepted) are all crammed into a single horizontal bar.
- **Context Confusion**: Filters like "Pending" or "Accepted" are visible even when they might not be relevant (e.g., in Create mode before generation).
- **Visual Overload**: The user is presented with 10+ buttons of equal visual weight.

## 2. Proposed Design

We will split the single menu into two distinct logical areas:

### A. Primary Navigation (Tabs)
A clear, high-level tab system to switch between the main application modes. This establishes "Where am I?".
- **Location**: Top of the main content area (below the global header).
- **Items**:
  1. **Create** (Generator)
  2. **Review** (Inbox/Triage)
  3. **Database** (Repository)
  4. **Analytics** (Dashboard)

### B. Contextual Toolbar
A secondary bar that changes contents based on the active Tab. This establishes "What can I do?".

#### Context: Create Mode
- **Left**: Generation Status / "Ready" indicator.
- **Right**: Data Menu (Export/Load).

#### Context: Review Mode
- **Left**: Filter Chips (Pending [Default], All, Accepted, Rejected).
- **Center**: "My Questions" Toggle.
- **Right**: Search Bar.

#### Context: Database Mode
- **Left**: Data Sync Actions (Load from Sheets/Firestore).
- **Center**: Sort Dropdown (Newest, Language, etc.).
- **Right**: Search Bar.

## 3. Component Architecture

### New Components
1. **`AppNavigation.jsx`**
   - Renders the main tabs (Create, Review, Database, Analytics).
   - Handles `appMode` switching.
   - Visually distinct (e.g., Tab style vs Button style).

2. **`ContextToolbar.jsx`**
   - Accepts `appMode` and all necessary props (filters, search handlers, counts).
   - Renders the appropriate set of tools for the current mode.
   - Moves the "Data" dropdown and "Search" inputs here.

## 4. Implementation Steps

### Step 1: Extract & Refactor Navigation
- Create `src/components/AppNavigation.jsx`.
- Move the "Create", "Review", "DB View", "Analytics" buttons from `App.jsx` to this new component.
- Style them as a segmented control or tab list.

### Step 2: Create Contextual Toolbar
- Create `src/components/ContextToolbar.jsx`.
- Move the Filter buttons (Pending, All, etc.), Search bar, and Data Menu from `App.jsx` to this component.
- Implement conditional rendering based on `appMode`.

### Step 3: Integrate into App.jsx
- Replace the existing long toolbar `<div>` in `App.jsx` with:
  ```jsx
  <div className="flex flex-col border-b border-slate-800 bg-slate-900">
      <AppNavigation activeMode={appMode} onNavigate={handleModeSelect} counts={{ pending: pendingCount }} />
      <ContextToolbar mode={appMode} ...props />
  </div>
  ```

### Step 4: Cleanup
- Remove the old menu code from `App.jsx`.
- Ensure `DatabaseView` doesn't double-render controls that are now in the toolbar (e.g., Sort controls might need to be lifted up or coordinated).

## 5. User Review Required
- Does this two-level separation (Tabs vs Toolbar) align with your mental model?
- Are there specific controls you want available globally (always visible) regardless of the mode?
