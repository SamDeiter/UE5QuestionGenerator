# Agent Guidelines

This document outlines the roles and responsibilities for AI agents working on this project.
This project uses the **Google Antigravity** platform to drive agentic development. This guide outlines the best practices for prompt engineering, model selection, and managing the Agent workflow within the Antigravity IDE.

## Core Principles

1. **User-Centric**: Always prioritize the user's request and experience.
2. **Code Quality**: Maintain high standards for code readability, performance, and robustness.
3. **Documentation**: Keep documentation up-to-date with code changes.
4. **Security**: Always consider security implications of changes.
5. **Performance**: Monitor and optimize bundle size and render performance.

## Agent Workflow & Mode Selection

Antigravity agents operate in different modes that should be selected based on the complexity of the task.

### ⚠️ Windows Orchestration (CRITICAL LAG PREVENTION)

**The user is on Windows. To prevent UI freezing, you must strictly adhere to this serialized workflow:**

1. **Single-Threaded Execution**: Never run multiple complex sub-agents in parallel.
2. **Atomic Steps**: Break requests into a numbered list. Execute Step 1, Verify, then Step 2.
3. **Phase Your Work**: For large features, explicitly ask the user: "I will tackle this in phases. Phase 1 is [Task]. Proceed?"

| Mode               | Task Type                                             | Best Practice                                              |
| :----------------- | :---------------------------------------------------- | :--------------------------------------------------------- |
| **Planning Mode**  | New features, complex bug fixes, architecture changes | Always create implementation plan first, get user approval |
| **Execution Mode** | Implementing approved plans                           | Follow plan, test as you go, commit frequently             |
| **Fast Mode**      | Simple edits, renames, quick fixes                    | Use for quick edits, skip planning artifacts               |

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
npm run deploy              # Deploy to GitHub Pages
firebase deploy --only functions  # Deploy Cloud Functions
```

Deploy scripts are located in `scripts/` directory.

## Key Files to Update

When making changes, remember to update:

- `AGENTS.md` - This file (root - global scope)
- `README.md` - Project overview
- `docs/project-context/ANCHOR_MANIFEST.md` - Key component list
- `docs/` - User and developer documentation

## Project Structure

```text
├── src/                 # React application source
│   ├── App.jsx          # Main application component
│   ├── components/      # UI components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services (Gemini, Firebase)
│   └── utils/           # Helper functions
├── functions/           # Firebase Cloud Functions
├── scripts/             # Build and deploy scripts
├── docs/                # Documentation
│   └── project-context/ # Architecture, licenses, tech stack
└── public/              # Static assets
```

## Current Priorities (as of Dec 2025)

1. **Toast Improvements** - Smart replacement, priority levels (✅ Completed)
2. **Critique Scoring** - Balanced evaluation prompts (✅ Completed)
3. **Code Organization** - Root directory cleanup (✅ Completed)
4. **Features** - Interactive tutorial, tagging system, analytics

## Communication

- Use `task_boundary` to track progress on complex tasks
- Use `notify_user` for requesting review or asking questions
- Keep user informed of progress and blockers

---

## Additional Project Context

Additional project context, architecture diagrams, and task logs are located in the `docs/project-context/` directory.

**Key files include:**

- `ANCHOR_MANIFEST.md` - Project structure reference
- `ARCHITECTURE.mermaid` - System architecture diagram
- `TECH_STACK.md` - Technology stack documentation
- `LICENSES.md` - Detailed licensing information
- `GEMINI.md` - AI model configuration guide
- Task tracking: `CURRENT_TASKS.md`, `TaskQueue.md`, `NEXT_SESSION.md`
