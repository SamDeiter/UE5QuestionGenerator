🤖 Agent Guidelines: UE5 Question Generator (Single Source of Truth)This document outlines the specialized roles and responsibilities for AI agents working on this project. This system uses the Google Antigravity platform to drive agentic development and implement a Single Source of Truth (SSOT) for all project standards and processes.🎯 Core PrinciplesUser-Centric: Always prioritize the user's request and experience, focusing on intuitive workflows and minimal friction across all application modes (Creation, Review, Analytics). All design and architectural decisions must ultimately enhance the end-user's ability to generate and manage questions efficiently.Code Quality: Maintain high standards for code readability, performance, and robustness. This requires adhering to modern language standards (ES6+), implementing strong TypeScript/prop typing, and ensuring strict logical separation of concerns (DRY Principle). Poor quality code introduces mandatory technical debt that the Vision Architect Prime must address.Documentation: Keep documentation up-to-date with code changes. Comprehensive inline comments, clear function headers, and timely updates to design documents are mandatory. Documentation must serve as the primary source of truth for all architectural decisions and API contracts.Security: Always consider the security implications of changes, especially within Firebase Cloud Functions and all API service interactions. Agents must default to secure practices like input sanitization, parameterized queries, and least-privilege access, referencing the JavaSec-Guardian.md rule at every implementation step.Performance: Monitor and optimize bundle size and render performance to ensure optimal results. This includes minimizing network payloads, optimizing image and data loading strategies, and reducing unnecessary component re-renders to maintain a fast, professional-grade application experience, particularly in the data-heavy Review Mode.🛑 Non-Negotiable Human-in-the-Loop RequirementQuestions must NEVER be automatically vetted or submitted by the AI. This is a non-negotiable design principle tied to instructional integrity and project liability [cite: fullContent]:Review each question before acceptance: This ensures factual accuracy and deep domain relevance (UE5 scenarios) which the AI cannot guarantee autonomously.Manually verify the AI critique score: This acts as a secondary quality control measure on the AI's internal self-assessment capabilities.Explicitly approve or reject each question: This final sign-off is the only authorized transition from 'Draft' to 'Approved' status in the database.⚙️ Agent Workflow & Orchestration Protocol⚠️ A. Windows Orchestration (CRITICAL LAG PREVENTION)To prevent UI freezing on the Windows operating system, the agent must strictly adhere to this serialized workflow:Single-Threaded Execution: Never run multiple complex sub-agents (Workflows) in parallel. All delegation must be sequential to preserve system responsiveness.Atomic Steps: Break requests into a numbered list. Execute Step 1 fully, Verify the result, then proceed to Step 2. Failure to verify a step necessitates rollback to the beginning of that step.Phase Your Work: For prominent features (like major feature releases or complex refactors), explicitly ask the user: "I will tackle this in phases. Phase 1 is [Task]. Proceed?" to manage user expectations and context load.🧠 B. Memory & Context Protocol (Handoff Rule)To prevent "Context Bloat" and IDE lag, Agents must adhere to this strict "Summarize & Flush" workflow:Debug Filter Rule: When summarizing work, NEVER save full stack traces, massive error logs, or raw debug text to documentation. Focus only on the root cause and the final fix applied.Session Handoff: Before the user deletes a laggy chat thread, the agent MUST update docs/project-context/NEXT_SESSION.md with Decisions (high-level architectural choices), Status (current progress and blockers), and Next Steps (immediate actions for the next session).Resumption: When a user starts a fresh chat, the agent MUST ALWAYS read docs/project-context/NEXT_SESSION.md first to restore "Short Term Memory," minimizing the token usage required to recall context.📝 C. Documentation & Artifact ProtocolThe agent must enforce documentation and process integrity:Required File Updates: When making a code change or adding a feature, the agent MUST ensure corresponding updates are made to: AGENTS.md (if roles change), docs/project-context/NEXT_SESSION.md, README.md, and docs/project-context/ANCHOR_MANIFEST.md (component inventory).Git Protocol: The agent must commit to git frequently (after every major atomic step) and use descriptive, meaningful commit messages that link to the implemented task.📂 Project StructureThis section defines the repository layout for all agents, guiding all code modification and context searching:├── src/                 # React application source
│   ├── App.jsx          # Main application component, entry point
│   ├── components/      # UI components, presentation logic
│   ├── hooks/           # Custom React hooks, encapsulating reusable state management and logic (e.g., useQuestionManager).
│   ├── services/        # API service wrappers (Gemini, Firebase) handling external data fetching, authentication, and error translation.
│   └── utils/           # Generic, side-effect free helper functions (e.g., formatting, validation logic).
├── functions/           # Firebase Cloud Functions (server-side security and heavy lifting)
├── scripts/             # Build and deploy scripts (CI/CD pipeline steps)
├── docs/                # User and developer documentation
│   └── project-context/ # Architecture, licenses, tech stack, and agent brain
└── public/              # Static assets (images, favicon)
🔎 Agent Workflow ModesAntigravity agents operate in different modes selected based on task complexity:ModeTask TypeBest PracticePlanning ModeNew features, complex bug fixes, and architecture changesAlways create an implementation plan first, and get user approval to confirm alignment before coding begins.Execution ModeImplementing approved plansFollow plan precisely, test as you go, and commit frequently to ensure traceability.Fast ModeSimple edits, renames, quick fixesUse for quick edits that require minimal context switching, skipping planning artifacts to save time.🧩 Agent Personas and RolesAgent persona definitions are located in the .agent/ directory:Master OrchestratorOmni-Dev-Prime.md: Lead Architect & Engineering Manager - Routes the user request to the specialized personas based on trigger keywords, manages serialization, and enforces the Orchestration Protocol.Specialized PersonasContent-Validator-Prime.md: Content Quality & Validation Expert - Specializes in verifying the accuracy, instructional soundness, and formatting of all generated questions. Enforces pedagogical integrity and domain relevance (UE5 scenarios).React-Architect-Prime.md: React Architecture & Zero-Regression Refactoring Specialist - Focuses on high-level component composition, state architecture (Redux/Context), and complex front-end systems design.React-UIUX-Architect.md: Frontend Architecture & Product Design Specialist - Focuses on design system adherence, information hierarchy, and translating wireframes into functional components.Async-Architect-Prime.md: Concurrency Engineering & Performance Optimization Specialist - Focuses on implementing non-blocking I/O, multithreading logic, and optimizing database/API interaction latency.JavaSec-Guardian.md: Java & Web Application Security Expert - Enforces security compliance, input validation, secret management standards, and checks against potential injection vulnerabilities in the application logic.�🖥️ Hardware Parallelization Protocols

All projects run on a high-performance workstation. Agents MUST leverage these capabilities for maximum efficiency across all development workflows.

### Host System Specifications

| Component | Specification |
|-----------|---------------|
| **CPU** | AMD Ryzen Threadripper PRO 3995WX (64 Cores / 128 Threads) |
| **RAM** | 256 GB DDR4 |
| **OS** | Windows 11 Enterprise |
| **Available Memory** | ~200 GB typical |

### Agent Capacity Limits

| Agent Type | Max Concurrent | Notes |
|------------|----------------|-------|
| Browser-based subagents | 20-30 | Chrome instances are memory-heavy (~4-5GB each) |
| Headless Node.js workers | 80-100 | Use for batch processing, API calls |
| Python process workers | 80-100 | Use `ProcessPoolExecutor(max_workers=60)` |
| Android emulators | 4-6 | Each AVD uses ~4-8GB RAM |
| Pure API callers | 100+ | Network-bound, not CPU-bound |

### Stack-Specific Optimizations

#### A. JavaScript/TypeScript (React, Vite, Next.js, PWAs)

```powershell
# Parallel Jest/Vitest tests
npm test -- --maxWorkers=16

# High-memory Node builds
$env:NODE_OPTIONS="--max-old-space-size=16384"
npm run build

# Parallel ESLint
npx eslint . --cache --max-warnings=0
```

#### B. Android (Kotlin/Gradle)

```properties
# gradle.properties - maximize build parallelization
org.gradle.parallel=true
org.gradle.workers.max=32
org.gradle.jvmargs=-Xmx16g -XX:+UseParallelGC
org.gradle.caching=true
kotlin.incremental=true
```

```powershell
# Run multiple emulators
emulator -avd Pixel_6_API_34 &
emulator -avd Pixel_Tablet_API_34 &
```

#### C. Python (Desktop tools, scripts, automation)

```python
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

# CPU-bound tasks (data processing, ML inference)
with ProcessPoolExecutor(max_workers=60) as executor:
    results = list(executor.map(process_item, items))

# I/O-bound tasks (API calls, file ops)
with ThreadPoolExecutor(max_workers=100) as executor:
    results = list(executor.map(fetch_data, urls))
```

#### D. Multi-Project Development

```powershell
# Run multiple dev servers simultaneously (RAM permits this easily)
Start-Job -Name "Project1" { Set-Location "C:\path\to\react-app"; npm run dev }
Start-Job -Name "Project2" { Set-Location "C:\path\to\pwa"; npm run dev }
Start-Job -Name "Project3" { Set-Location "C:\path\to\python-tool"; python main.py }
Get-Job | Format-Table Name, State
```

#### E. E2E & Integration Testing

```javascript
// playwright.config.js / cypress.config.js
module.exports = {
  workers: 16,  // 16 parallel browser instances
  fullyParallel: true,
  retries: 2,
};
```

```powershell
# Run Espresso tests on multiple emulators
./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.numShards=4
```

### Performance Commands

```powershell
# Enable high-performance power plan
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c

# Monitor resource usage
Get-Counter '\Processor(_Total)\% Processor Time', '\Memory\Available MBytes' -SampleInterval 2

# Check all dev processes
Get-Process | Where-Object { $_.Name -match 'node|python|java|gradle|adb' } | 
  Sort-Object WorkingSet64 -Descending | 
  Format-Table Name, CPU, @{N='RAM(MB)';E={[math]::Round($_.WorkingSet64/1MB)}}

# Kill all Node processes (emergency cleanup)
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
```

### ⚠️ Parallelization Guardrails

1. **Never exceed 30 browser instances** - memory fragmentation causes instability
2. **Limit to 6 Android emulators** - GPU memory contention
3. **Serialize database writes** to the same document/row to avoid contention
4. **Rate limit API calls** - Gemini/Vertex/OpenAI have quotas regardless of local capacity
5. **Monitor disk I/O** - SSD is the bottleneck for large file operations
6. **Leave 20GB RAM headroom** - for OS, IDE, and browser tabs

---

�🛠️ Tools & CommandsCategoryCommandDescriptionDevelopmentnpm run devStart dev server on localhost:5173 for local development and testing.npm run buildBuild the optimized production bundle for deployment.npm run previewPreview the production build locally before deployment.npm testRun the full suite of unit and integration tests.Deploymentnpm run deployDeploy the static application to GitHub Pages (or equivalent hosting).firebase deploy --only functionsDeploy only the Firebase Cloud Functions logic (used for quick server-side updates).Deploy scripts are located in the scripts/ directory.
