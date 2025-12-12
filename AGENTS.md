Agent Guidelines

This document outlines the roles and responsibilities for AI agents working on this project.
This project uses the Google Antigravity platform to drive agentic development. This guide outlines the best practices for prompt engineering, model selection, and managing the Agent workflow within the Antigravity IDE.

Core Principles

User-Centric: Always prioritize the user's request and experience.

Code Quality: Maintain high standards for code readability, performance, and robustness.

Documentation: Keep documentation up-to-date with code changes.

Security: Always consider the security implications of changes.

Performance: Monitor and optimize bundle size and render performance to ensure optimal results.

[!CAUTION]

🛑 HUMAN-IN-THE-LOOP REQUIREMENT

Questions must NEVER be automatically vetted or submitted by AI. A human must always:

Review each question before acceptance

Manually verify the AI critique score

Explicitly approve or reject each question

This is a non-negotiable design principle. Do NOT implement any feature that bypasses human review.

Agent Workflow & Mode Selection

Antigravity agents operate in different modes that should be selected based on the complexity of the task.

⚠️ Windows Orchestration (CRITICAL LAG PREVENTION)

The user is on Windows. To prevent UI freezing, you must strictly adhere to this serialized workflow:

Single-Threaded Execution: Never run multiple complex sub-agents in parallel.

Atomic Steps: Break requests into a numbered list. Execute Step 1, Verify, then Step 2.

Phase Your Work: For prominent features, explicitly ask the user: "I will tackle this in phases. Phase 1 is [Task]. Proceed?"

Mode

Task Type

Best Practice

Planning Mode

New features, complex bug fixes, and architecture changes

Always create an implementation plan first, and get user approval

Execution Mode

Implementing approved plans

Follow plan, test as you go, commit frequently

Fast Mode

Simple edits, renames, quick fixes

Use for quick edits, skip planning artifacts

Planning Phase

Before implementing complex features, create an implementation plan

Use artifacts in .gemini/antigravity/brain/<conversation-id>/ for planning documents

Get user approval before starting major work

Execution Phase

Follow the plan, testing as you go

Use Python for file edits (user preference)

Commit to git frequently

Run npm run dev to test changes locally

Verification Phase

Verify changes with tests or manual checks

Check the browser console for errors

Test on localhost before deployment

🧠 Memory & Context Protocol (Anti-Lag)

To prevent "Context Bloat" and IDE lag, Agents must adhere to this strict "Summarize & Flush" workflow:

The "Debug Filter" Rule: When summarizing work, NEVER save full stack traces, massive error logs, or raw debug text to documentation.

Bad: Pasting 50 lines of a Java stack trace.

Good: "Fixed NullPointerException  UserService caused by a missing optional check."

Session Handoff: Before the user deletes a laggy chat thread, you must update docs/project-context/NEXT_SESSION.md it with:

Decisions: High-level architectural choices made in this session.

Status: What is currently broken versus what is working.

Next Steps: Immediate actions for the next fresh chat window.

Resumption: When a user starts a fresh chat, ALWAYS read docs/project-context/NEXT_SESSION.md First to restore "Short Term Memory" without the RAM cost of the full chat history.

Tools & Commands

Development

npm run dev      # Start dev server on localhost:5173
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run tests

Deployment

npm run deploy              # Deploy to GitHub Pages
firebase deploy --only functions  # Deploy Cloud Functions

Deploy scripts are located in scripts/ directory.

Maintenance & Memory

# Agent Prompt to run before deleting chat

"Update NEXT_SESSION.md with our latest progress, filter out debug logs, and prepare for a context flush."

Key Files to Update

When making changes, remember to update:

AGENTS.md - This file (root - global scope)

docs/project-context/NEXT_SESSION.md - CRITICAL: Update this before clearing chat history to preserve knowledge.

README.md - Project overview

docs/project-context/ANCHOR_MANIFEST.md - Key component list

docs/ - User and developer documentation

Project Structure

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

Current Priorities (as of Dec 2025)

Toast Improvements - Smart replacement, priority levels (✅ Completed)

Critique Scoring - Balanced evaluation prompts (✅ Completed)

Code Organization - Root directory cleanup (✅ Completed)

Features - Interactive tutorial, tagging system, analytics

Communication

Use task_boundary to track progress on complex tasks

Use notify_user for requesting review or asking questions

Keep the user informed of progress and blockers

Additional Project Context

Additional project context, architecture diagrams, and task logs are located in the docs/project-context/ directory.

Key files include:

ANCHOR_MANIFEST.md - Project structure reference

ARCHITECTURE.mermaid - System architecture diagram

TECH_STACK.md - Technology stack documentation

LICENSES.md - Detailed licensing information

GEMINI.md - AI model configuration guide

Task tracking: CURRENT_TASKS.md, TaskQueue.md, NEXT_SESSION.md

Agent Personas

Agent persona definitions are located in the .agent/ directory:

Master Orchestrator

Omni-Dev-Prime.md - Lead Architect & Engineering Manager - Routes to specialized personas based on trigger keywords

Specialized Personas

React-Architect-Prime.md - React Architecture & Zero-Regression Refactoring Specialist

React-UIUX-Architect.md - Frontend Architecture & Product Design Specialist

Async-Architect-Prime.md - Concurrency Engineering & Performance Optimization Specialist

JavaSec-Guardian.md - Java & Web Application Security Expert
