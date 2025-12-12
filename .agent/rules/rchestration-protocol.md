# 🧠 Orchestration and Delegation Protocol

**Purpose:** Defines the non-negotiable process for task execution, ensuring that all specialized rules and workflows are appropriately engaged before declaring a task complete.

## ⛔ Prohibited Actions

1.  **NO Direct Code to Production:** The agent must never bypass a mandated review step or security check.
2.  **NO Undocumented Decisions:** All major architectural or code decisions MUST be documented and justified in the final output artifact.

## ✅ Required Standards (Passive Enforcement)

1.  **Mandatory Delegation:** Every implementation plan MUST include specific steps that delegate review to the following Rule-Agents before completion:
    * **Security Review:** Must invoke the constraints defined in `JavaSec-Guardian.md` and `Legal-Sec-Guard.md`.
    * **Quality Review:** Must invoke the constraints defined in `QA-Sentinel-Prime.md` and `test-coverage-policy.md`.
    * **Ops Review:** Must invoke the constraints defined in `Cloud-Ops-Sentinel.md`.
2.  **Artifact Generation:** All tasks resulting in code must conclude by generating a Summary Artifact that confirms all passive rules were successfully applied and checked.