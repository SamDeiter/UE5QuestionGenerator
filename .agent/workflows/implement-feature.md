---
description: Full feature implementation workflow from spec through verification
---

# Implement Feature Workflow

Invoke with `/implement-feature` when you have an approved spec or implementation plan ready to execute.

## Prerequisites

- Approved `implementation_plan.md` or spec file
- User has reviewed and approved the approach

---

## Process

### Phase 1: Load Context

// turbo

1. Read `ANCHOR_MANIFEST.md` for project standards
2. Read the spec/implementation plan
3. Read `PROJECT_OVERVIEW.md` for current state

### Phase 2: Create Task Breakdown

Generate `task.md` in the brain folder with granular steps:

```markdown
# [Feature Name] Implementation

## Setup
- [ ] Create new files/directories
- [ ] Add dependencies if needed

## Core Implementation  
- [ ] [Specific task 1]
- [ ] [Specific task 2]
- [ ] ...

## Integration
- [ ] Wire up to existing code
- [ ] Update routes/navigation

## Polish
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile responsiveness

## Verification
- [ ] Manual testing
- [ ] Run existing tests
```

### Phase 3: Execute Atomically

For each task:

1. **Implement** — Make the change
2. **Verify** — Confirm it works (no console errors, correct behavior)
3. **Commit** — Atomic git commit with descriptive message

```bash
# After each logical unit of work
git add -A
git commit -m "feat([scope]): [what was done]"
```

### Phase 4: Verification

Before marking complete:

- [ ] All tasks in `task.md` checked off
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Manual testing in browser
- [ ] Mobile viewport tested (375px)
- [ ] Existing tests still pass

### Phase 5: Documentation

// turbo
Update `PROJECT_OVERVIEW.md` if:

- New routes/pages added
- New components created
- Feature status changed

---

## Output

Provide `walkthrough.md` summarizing:

- What was built
- Key files changed
- How to test the feature
- Any follow-up items identified
