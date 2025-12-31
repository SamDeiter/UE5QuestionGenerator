# 🤖 Agent Guidelines (Single Source of Truth)

This document outlines the specialized roles and responsibilities for AI agents working on Sam's projects. This system uses the **Google Antigravity** platform to drive agentic development and implement a Single Source of Truth (SSOT) for all project standards and processes.

---

## 🎯 Core Principles

| Principle | Description |
|-----------|-------------|
| **User-Centric** | Always prioritize the user's request and experience, focusing on intuitive workflows and minimal friction. |
| **Code Quality** | Maintain high standards for readability, performance, and robustness. Adhere to modern standards (ES6+, Kotlin best practices), strong typing, and DRY principles. |
| **Documentation** | Keep documentation up-to-date with code changes. Comprehensive inline comments and timely updates to design documents are mandatory. |
| **Security** | Default to secure practices: input sanitization, parameterized queries, least-privilege access, and secret management via environment variables. |
| **Performance** | Optimize bundle size, render performance, and API latency. Minimize unnecessary re-renders and network payloads. |

---

## 🛑 Non-Negotiable Human-in-the-Loop Requirement

> [!CAUTION]
> Content must **NEVER** be automatically vetted or submitted by the AI. This is non-negotiable for instructional integrity.

- **Review each item before acceptance** - ensures factual accuracy and domain relevance
- **Manually verify AI critique scores** - secondary quality control on AI self-assessment
- **Explicitly approve or reject** - only authorized transition from 'Draft' to 'Approved' status

---

## ⚙️ Agent Workflow & Orchestration Protocol

### ⚠️ A. Windows Orchestration (Critical Lag Prevention)

To prevent UI freezing on Windows, agents must strictly adhere to this serialized workflow:

1. **Single-Threaded Execution** - Never run multiple complex sub-agents in parallel. Delegation must be sequential.
2. **Atomic Steps** - Break requests into a numbered list. Execute Step 1 fully, verify, then proceed to Step 2.
3. **Phase Your Work** - For major features, explicitly ask: "I will tackle this in phases. Phase 1 is [Task]. Proceed?"

### 🧠 B. Memory & Context Protocol (Handoff Rule)

To prevent "Context Bloat" and IDE lag:

1. **Debug Filter Rule** - NEVER save full stack traces or massive error logs. Focus only on root cause and final fix.
2. **Session Handoff** - Before deleting a laggy thread, update `docs/project-context/NEXT_SESSION.md` with Decisions, Status, and Next Steps.
3. **Resumption** - When starting a fresh chat, ALWAYS read `NEXT_SESSION.md` first to restore context.

### 📝 C. Documentation & Artifact Protocol

- **Required File Updates**: When making changes, update `AGENTS.md`, `NEXT_SESSION.md`, `README.md`, and `ANCHOR_MANIFEST.md` as appropriate.
- **Git Protocol**: Commit frequently (after every major atomic step) with descriptive commit messages.

---

## 📂 Project Structure

```
├── src/                 # Application source code
│   ├── App.jsx          # Main application component
│   ├── components/      # UI components, presentation logic
│   ├── hooks/           # Custom hooks for state management
│   ├── services/        # API wrappers (Gemini, Firebase, etc.)
│   └── utils/           # Pure helper functions
├── functions/           # Cloud Functions (Firebase, AWS Lambda, etc.)
├── scripts/             # Build and deploy scripts
├── docs/                # User and developer documentation
│   └── project-context/ # Architecture, licenses, agent brain
└── public/              # Static assets
```

---

## 🔎 Agent Workflow Modes

| Mode | Task Type | Best Practice |
|------|-----------|---------------|
| **Planning Mode** | New features, complex bugs, architecture changes | Create implementation plan first, get user approval before coding. |
| **Execution Mode** | Implementing approved plans | Follow plan precisely, test as you go, commit frequently. |
| **Fast Mode** | Simple edits, renames, quick fixes | Skip planning artifacts, execute immediately. |

---

## 🧩 Agent Personas and Roles

Agent persona definitions are located in the `.agent/` directory:

### Master Orchestrator

- **Omni-Dev-Prime.md** - Lead Architect & Engineering Manager. Routes requests to specialized personas and enforces the Orchestration Protocol.

### Specialized Personas

| Persona | Specialty |
|---------|-----------|
| **Content-Validator-Prime.md** | Content Quality & Validation. Verifies accuracy and instructional soundness. |
| **React-Architect-Prime.md** | React Architecture & Zero-Regression Refactoring. Component composition and state architecture. |
| **React-UIUX-Architect.md** | Frontend Architecture & Product Design. Design system adherence and wireframe translation. |
| **Async-Architect-Prime.md** | Concurrency Engineering & Performance. Non-blocking I/O and latency optimization. |
| **JavaSec-Guardian.md** | Security Expert. Input validation, secret management, injection prevention. |

---

## 🖥️ Hardware Parallelization Protocols

All projects run on a high-performance workstation. Agents **MUST** leverage these capabilities for maximum efficiency.

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
| Browser-based subagents | 20-30 | Chrome instances ~4-5GB each |
| Headless Node.js workers | 80-100 | Batch processing, API calls |
| Python process workers | 80-100 | `ProcessPoolExecutor(max_workers=60)` |
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
# Run multiple emulators simultaneously
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
# Run multiple dev servers simultaneously
Start-Job -Name "ReactApp" { Set-Location "C:\path\to\react-app"; npm run dev }
Start-Job -Name "PWA" { Set-Location "C:\path\to\pwa"; npm run dev }
Start-Job -Name "PythonTool" { Set-Location "C:\path\to\python-tool"; python main.py }
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

## 🛠️ Tools & Commands

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (localhost:5173 for Vite) |
| `npm run build` | Build optimized production bundle |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit and integration tests |
| `./gradlew assembleDebug` | Build Android debug APK |
| `python main.py` | Run Python application |

### Deployment

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy to GitHub Pages or hosting provider |
| `firebase deploy --only functions` | Deploy Firebase Cloud Functions only |
| `./gradlew publishReleaseBundle` | Publish Android App Bundle to Play Store |

> Deploy scripts are located in the `scripts/` directory.
