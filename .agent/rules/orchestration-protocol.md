---
trigger: always_on
---

# Orchestration & Execution Protocol

**Purpose:** Defines the non-negotiable process for task execution on Windows 11, preventing UI lag and ensuring quality.

## ⚠️ Windows Lag Prevention

1. **Single-Threaded Execution** — Never run multiple complex sub-agents in parallel. Delegation must be sequential.
2. **Atomic Steps** — Break requests into a numbered list. Execute Step 1 fully, verify, then proceed to Step 2.
3. **Phase Your Work** — For major features, explicitly ask: "I will tackle this in phases. Phase 1 is [Task]. Proceed?"

## ⛔ Prohibited Actions

1. **NO Direct Code to Production** — Never bypass a mandated review step or security check.
2. **NO Undocumented Decisions** — All major architectural or code decisions MUST be documented.
3. **NO Root Folder Deletion** — Never delete the root folder of any project or directory structure.

## ✅ Required Standards

1. **Planning First** — For non-trivial tasks (multiple files, new features, complex refactoring), generate an implementation plan and get user approval before writing code.
2. **Artifact Generation** — Tasks resulting in code must conclude with a summary confirming all checks passed.
3. **Frequent Git Commits** — Commit after every major atomic step. Back up to git as often as possible.

## 🧠 Context Management

1. **Debug Filter Rule** — NEVER save full stack traces or massive error logs. Focus only on root cause and final fix.
2. **Session Handoff** — Before ending a session, update `NEXT_SESSION.md` (if it exists) with Decisions, Status, and Next Steps.
3. **Resumption** — When starting a fresh chat, read `AGENTS.md` and `NEXT_SESSION.md` first to restore context.
