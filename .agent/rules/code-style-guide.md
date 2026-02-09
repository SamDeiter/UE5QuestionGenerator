---
trigger: always_on
---

# Universal Code Style Guide

## General Principles
* Follow the **DRY** principle — Don't Repeat Yourself. If logic is duplicated, extract to a shared helper.
* Functions should be focused and concise. If a function exceeds 50 lines, consider refactoring.
* Use **descriptive naming** — variables, functions, and classes should communicate intent (`isValid` not `v`, `getUserById` not `get`).
* Comments should explain **WHY**, not **WHAT**. The code itself should be readable enough to convey WHAT.

## Error Handling
* Always handle errors gracefully — no silent failures.
* Assume all external APIs, database calls, and file operations can fail.
* Log errors with enough context to debug without reproducing.

## Security (Non-Negotiable)
* **NEVER** hardcode secrets, API keys, or credentials in source files.
* Always use environment variables (`.env`) for sensitive configuration.
* Before ANY `git push`, scan for leaked secrets.
* Input validation is mandatory for all user-facing inputs.

## Language-Specific
* **JavaScript/TypeScript**: Use ES6+ syntax, `const`/`let` over `var`, async/await over raw promises.
* **Python**: Follow PEP 8, include docstrings for all public functions, use type hints.
* **Kotlin**: Follow Kotlin coding conventions, prefer `val` over `var`, use coroutines for async.

## Git Hygiene
* Commit frequently with descriptive messages using conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`).
* No `console.log` or debug prints in production code.
* No commented-out code blocks — delete unused code (git has history).
