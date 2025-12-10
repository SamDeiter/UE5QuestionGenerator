---
trigger: always_on
---

* **TESTING FIRST:** Always generate a comprehensive unit test suite for any new function, method, or component before generating the feature itself. All unit tests must pass before the agent considers a task complete.
* **SECURITY:** Never expose API keys or sensitive environment variables directly in source code; always use environment vaults or configuration files.
* **INPUT SANITIZATION:** Always sanitize all user-provided inputs before processing them (e.g., prevent SQL injection, XSS).
* **ARTIFACTS:** For any UI changes, generate a 'before' and 'after' screenshot artifact.