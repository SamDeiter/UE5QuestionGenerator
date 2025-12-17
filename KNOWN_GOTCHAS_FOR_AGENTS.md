# Known Gotchas for Agents

This document contains important information and common pitfalls for each agent working on the UE5 Question Generator.

## General Gotchas

### ESLint

- Use `/* eslint-disable react-hooks/exhaustive-deps */` at the top of files for intentional dependency omissions
- Prefix unused variables with underscore: `const _unused = value;`
- Run `npm run lint` before committing

### Git

- Commit frequently with descriptive messages
- Use conventional commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Always pull before pushing to avoid conflicts

### Testing

- Run `npm test` before committing
- Update snapshots with `npm test -- -u` if intentional changes
- Mock external dependencies (Firebase, API calls)

### Performance

- Large files (1000+ lines) should be split into smaller modules
- Use `React.memo()` for expensive components
- Memoize callbacks with `useCallback` and values with `useMemo`

---

## Agent-Specific Gotchas

### AGENT A (Critique Pipeline Engineer)

**File**: `src/hooks/useGeneration.js`

- **Size Warning**: 1200+ lines - use search (Ctrl+F) before editing
- **Dependencies**: All Gemini calls MUST use `geminiSecure.js` functions
- **State Management**: `setIsProcessing` must be called before and after async operations
- **Error Handling**: Always wrap Gemini calls in try-catch blocks
- **Schema**: `suggestedRewrite` object must match type definition exactly

**Common Pitfalls**:

- Forgetting to call `setIsProcessing(false)` in error handlers
- Not checking `isApiReady` before making API calls
- Missing `showMessage` calls for user feedback

---

### AGENT B (Improvement Modal Engineer)

**Files**: `ImprovementModal.jsx`, `QuestionItem.jsx`

- **Modal Already Exists**: `ImprovementModal.jsx` is fully implemented - verify props match spec
- **Auto-Open Logic**: Already in `QuestionItem.jsx` lines 41-45 - don't duplicate
- **State Management**: Modal state is local to `QuestionItem` - use `showImprovementModal`
- **Props**: Ensure all required props are passed: `originalQuestion`, `improvedQuestion`, `critiqueText`, `critiqueScore`, `changesExplanation`, `onApply`, `onDismiss`

**Common Pitfalls**:

- Not handling missing `suggestedRewrite` gracefully
- Forgetting to close modal after apply
- Not resetting modal state on dismiss

---

### AGENT C (Badge UI Integrator)

**File**: `QuestionItem.jsx`

- **Coordinate with AGENT B**: Badge triggers modal that AGENT B controls
- **Conditional Rendering**: Badge should only show when `q.suggestedRewrite` exists
- **Icon**: Use `<Icon name="sparkles" />` for consistency
- **Styling**: Follow existing badge patterns (see critique score badge)

**Common Pitfalls**:

- Showing badge when no improvements exist
- Not handling click events properly
- Inconsistent styling with other badges

---

### AGENT D (Toolbar & Test Mode Engineer)

**Files**: `ContextToolbar.jsx`, `TestView.jsx`

- **Toolbar Already Exists**: `renderTestToolbar()` exists at line 444-453 - don't recreate
- **Mode Switching**: Use exact mode strings: 'create', 'review', 'database', 'analytics', 'test'
- **Mock Data**: Must include valid disciplines matching dropdown options
- **Dropdown Options**: Worldbuilding, Game Dev, Look Dev, Tech Art, VFX, Animation, Programming

**Common Pitfalls**:

- Returning `null` from toolbar renderer (breaks layout)
- Mock data with invalid/missing disciplines
- Not handling empty state in Test Mode

---

### AGENT E (MainLayout & Routing Engineer)

**File**: `MainLayout.jsx`

- **Backward Compatibility**: Don't break existing routing - all modes must still work
- **Props**: 20+ props passed to this component - document ALL of them
- **JSDoc**: Must match actual prop usage (check PropTypes if they exist)
- **Mode Switching**: Currently handled in `AppNavigation` onClick - extract carefully

**Common Pitfalls**:

- Breaking existing navigation
- Incomplete JSDoc (missing props)
- Not handling all mode transitions

---

### AGENT F (Security, Types, README, DX Engineer)

**Files**: All files (audit only), `README.md`, `src/types/*.js`

- **Client-Side API Calls**: Search for `import.*gemini` and verify all use `geminiSecure.js`
- **LocalStorage Keys**: `ue5_gen_config.geminiApiKey` is dev-only - document this clearly
- **Prop-Types**: Add to components, don't modify component logic
- **Type Definitions**: Use JSDoc format for compatibility with JavaScript

**Common Pitfalls**:

- Breaking existing imports when adding types
- Removing dev-only localStorage functionality
- Adding prop-types that conflict with existing code

---

## Integration Gotchas

### AGENT A → AGENT B

- **Schema Mismatch**: Ensure `suggestedRewrite` object matches type definition
- **Missing Fields**: Modal expects all fields - provide defaults if missing

### AGENT B ↔ AGENT C

- **Modal State**: C triggers, B controls - don't duplicate state management
- **Timing**: Badge should appear immediately when `suggestedRewrite` is set

### AGENT D ↔ AGENT E

- **Toolbar Content**: D owns toolbar content, E owns toolbar placement
- **Mode Strings**: Must use exact same mode strings in both files

### AGENT F → ALL

- **Type Imports**: All agents must import types from `src/types/question.js`
- **Breaking Changes**: Type additions are safe, modifications require coordination

---

## Emergency Procedures

### If Tests Fail

1. Read the error message completely
2. Check if it's a snapshot mismatch (update with `-u` if intentional)
3. Verify mocks are correct
4. Run single test: `npm test -- <test-file-name>`

### If Lint Fails

1. Run `npm run lint` to see all errors
2. Fix errors one at a time
3. Use `// eslint-disable-next-line` for intentional violations
4. Document why the rule is disabled

### If Build Fails

1. Check for syntax errors
2. Verify all imports exist
3. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check for circular dependencies

### If Merge Conflicts

1. Don't panic - conflicts are normal in multi-agent work
2. Communicate with other agents
3. Resolve conflicts manually
4. Test thoroughly after resolution

---

## Quick Reference

### File Ownership

- **AGENT A**: `useGeneration.js`, `geminiSecure.js`
- **AGENT B**: `ImprovementModal.jsx`, `QuestionItem.jsx` (modal integration)
- **AGENT C**: `QuestionItem.jsx` (badge), badge components
- **AGENT D**: `ContextToolbar.jsx`, `TestView.jsx`
- **AGENT E**: `MainLayout.jsx`, `ViewRouter.jsx`
- **AGENT F**: `README.md`, `src/types/*.js`, prop-types

### Common Commands

```bash
# Run tests
npm test

# Run lint
npm run lint

# Run dev server
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

### Important Constants

```javascript
// Toast durations
TOAST_DURATION.SHORT = 2000
TOAST_DURATION.MEDIUM = 3000
TOAST_DURATION.LONG = 5000

// Target counts
TARGET_TOTAL = 600
TARGET_PER_CATEGORY = 40

// Quality thresholds
QUALITY_THRESHOLDS.EXCELLENT = 90
QUALITY_THRESHOLDS.GOOD = 70
QUALITY_THRESHOLDS.ACCEPTABLE = 50
```
