# 🧪 Test Coverage and TDD Policy Guardrails

**Purpose:** Enforces minimum quality and Test-Driven Development (TDD) principles across the codebase.

## ⛔ Prohibited Actions

1.  **NO Code Without Tests:** The agent is forbidden from finalizing or merging any code that does not have corresponding unit and integration tests.
2.  **NO Test Skipping:** Test functions must not include directives to skip or ignore tests for common functionality.

## ✅ Required Standards (Passive Enforcement)

1.  **Coverage Threshold:** All new or refactored files must meet or exceed a minimum **80% code coverage** threshold.
2.  **TDD Mandate:** When generating a new feature, the agent MUST first create the failure test case before writing the implementation code.
3.  **Test Case Variety:** Tests MUST cover positive cases, boundary conditions, and negative/failure scenarios.