content = '''# 🧠 Orchestration and Delegation Protocol

**Purpose:** Defines the non-negotiable process for task execution, ensuring that all specialized rules and workflows are appropriately engaged before declaring a task complete.

## ⛔ Prohibited Actions

1.  **NO Direct Code to Production:** The agent must never bypass a mandated review step or security check.
2.  **NO Undocumented Decisions:** All major architectural or code decisions MUST be documented and justified in the final output artifact.

## ✅ Required Standards (Passive Enforcement)

1.  **Mandatory Delegation:** Every implementation plan MUST include specific steps that delegate review to the following Rule-Agents before completion:
    * **Security Review:** Must invoke the constraints defined in `javasec-guardrails.md` and `testing-security-policy.md`.
    * **Quality Review:** Must invoke the constraints defined in `test-coverage-policy.md` and `code-style-guide.md`.
    * **Accessibility Review:** Must invoke the constraints defined in `a11y-standards.md`.
2.  **Artifact Generation:** All tasks resulting in code must conclude by generating a Summary Artifact that confirms all passive rules were successfully applied and checked.

## 🎯 Specialized Prime Delegation

The following delegation rules define when to engage specialized Prime agents:

| Task Type | Delegate To | File |
|-----------|-------------|------|
| **Feature Initiation** (New Code) | Feature Implementer Prime | `workflows/Feature-Implementer-Prime.md` |
| **Strategic Planning** (Future Work/Tech Debt) | Vision Architect Prime | `workflows/Vision-Architect-Prime.md` |
| **Deployment & Release** (Final Gate) | Deployment Relay Prime | `workflows/Deployment-Relay-Prime.md` |
| **React UI/UX** (Frontend Components) | React UIUX Architect | `React-UIUX-Architect.md` |
| **Async/Concurrency** (Background Tasks) | Async Architect Prime | `Async-Architect-Prime.md` |
| **Full-Stack Implementation** | Omni Dev Prime | `Omni-Dev-Prime.md` |
'''

with open('.agent/rules/orchestration-protocol.md', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated orchestration-protocol.md successfully!')
