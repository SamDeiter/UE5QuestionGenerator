# Agent Guidelines

This document outlines the roles and responsibilities for AI agents working on this project.
This project uses the **Google Antigravity** platform to drive agentic development. This guide outlines the best practices for prompt engineering, model selection, and managing the Agent workflow within the Antigravity IDE.

## Core Principles

1. **User-Centric**: Always prioritize the user's request and experience.
2. **Code Quality**: Maintain high standards for code readability, performance, and robustness.
3. **Documentation**: Keep documentation up-to-date with code changes.
4. **Security**: Always consider security implications of changes.
5. **Performance**: Monitor and optimize bundle size and render performance.

## Workflows

## 2. Agent Workflow & Mode Selection

Antigravity agents operate in different modes that should be selected based on the complexity of the task.

### ⚠️ Windows Orchestration (CRITICAL LAG PREVENTION)

**The user is on Windows. To prevent UI freezing, you must strictly adhere to this serialized workflow:**

1.  **Single-Threaded Execution**: Never run multiple complex sub-agents in parallel.
2.  **Atomic Steps**: Break requests into a numbered list. Execute Step 1, Verify, then Step 2.
3.  **Phase Your Work**: For large features, explicitly ask the user: "I will tackle this in phases. Phase 1 is [Task]. Proceed?"

| Mode              | Task Type                              | Best Practice                   |
| :---------------- | :------------------------------------- | :------------------------------ |
| **Planning Mode** | **New Features, Complex Bug Fixes...** | **Always use Planning Mode**... |
| **Fast Mode**     | **Simple, Localized Tasks...**         | Use for quick edits...          |

### Planning Phase

- Before implementing complex features, create an implementation plan
- Use artifacts in `.gemini/antigravity/brain/<conversation-id>/` for planning documents
- Get user approval before starting major work

### Execution Phase

- Follow the plan, testing as you go
- Use Python for file edits (user preference)
- Commit to git frequently
- Run `npm run dev` to test changes locally

### Verification Phase

- Verify changes with tests or manual checks
- Check browser console for errors
- Test on localhost before deployment

## Tools & Commands

### Development

```bash
npm run dev      # Start dev server on localhost:5173
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run tests
```

### Deployment

```bash
npm run deploy   # Deploy to GitHub Pages
```

## Key Files to Update

When making changes, remember to update:

- `AGENTS.md` - This file
- `ANCHOR_MANIFEST.md` - Key component list
- `docs/` - User and developer documentation
- `README.md` - Project overview

## Current Priorities (as of Dec 2024)

1. **Security** - Implement Firebase Auth, update Firestore rules
2. **Performance** - Refactor App.jsx and QuestionItem.jsx
3. **Features** - Interactive tutorial, tagging system, analytics
4. **UX** - Source validation, deletion feedback

See `master_plan.md` in artifacts for detailed roadmap.

## Communication

- Use `task_boundary` to track progress on complex tasks
- Use `notify_user` for requesting review or asking questions
- Keep user informed of progress and blockers
