---
trigger: always_on
---

# 🧠 Orchestration and Delegation Protocol

**Purpose:** Defines the non-negotiable process for task execution, ensuring that all specialized rules and workflows are appropriately engaged before declaring a task complete.

## ⛔ Prohibited Actions

1. **NO Direct Code to Production:** The agent must never bypass a mandated review step or security check.
2. **NO Undocumented Decisions:** All major architectural or code decisions MUST be documented and justified in the final output artifact.

## ✅ Required Standards (Passive Enforcement)

1. **Mandatory Delegation:** Every implementation plan MUST include specific steps that delegate review to the following Rule-Agents before completion:
    * **Security Review:** Must invoke the constraints defined in [javasec-guardrails.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/rules/javasec-guardrails.md:0:0-0:0) and [testing-security-policy.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/rules/testing-security-policy.md:0:0-0:0).
    * **Quality Review:** Must invoke the constraints defined in [test-coverage-policy.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/rules/test-coverage-policy.md:0:0-0:0) and [code-style-guide.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/rules/code-style-guide.md:0:0-0:0).
    * **Accessibility Review:** Must invoke the constraints defined in [a11y-standards.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/rules/a11y-standards.md:0:0-0:0).
2. **Artifact Generation:** All tasks resulting in code must conclude by generating a Summary Artifact that confirms all passive rules were successfully applied and checked.

## 🎯 Specialized Prime Delegation

The following delegation rules define when to engage specialized Prime agents:

| Task Type | Delegate To | File |
|-----------|-------------|------|
| **Feature Initiation** (New Code) | Feature Implementer Prime | [workflows/Feature-Implementer-Prime.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/workflows/Feature-Implementer-Prime.md:0:0-0:0) |
| **Strategic Planning** (Future Work/Tech Debt) | Vision Architect Prime | [workflows/Vision-Architect-Prime.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/workflows/Vision-Architect-Prime.md:0:0-0:0) |
| **Deployment & Release** (Final Gate) | Deployment Relay Prime | [workflows/Deployment-Relay-Prime.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/workflows/Deployment-Relay-Prime.md:0:0-0:0) |
| **React UI/UX** (Frontend Components) | React UIUX Architect | [React-UIUX-Architect.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/React-UIUX-Architect.md:0:0-0:0) |
| **Async/Concurrency** (Background Tasks) | Async Architect Prime | [Async-Architect-Prime.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/Async-Architect-Prime.md:0:0-0:0) |
| **Full-Stack Implementation** | Omni Dev Prime | [Omni-Dev-Prime.md](cci:7://file:///c:/Users/Sam%20Deiter/Documents/GitHub/UE5QuestionGenerator/.agent/Omni-Dev-Prime.md:0:0-0:0) |
