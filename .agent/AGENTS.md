# 🤖 Agent Guidelines (Single Source of Truth)

This document outlines the specialized roles and responsibilities for AI agents working on Sam's projects. This system uses the **Google Antigravity** platform to drive agentic development and implement a Single Source of Truth (SSOT) for all project standards and processes.

---

## 🎯 Core Principles

| Principle         | Description                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User-Centric**  | Always prioritize the user's request and experience, focusing on intuitive workflows and minimal friction.                                                         |
| **Code Quality**  | Maintain high standards for readability, performance, and robustness. Adhere to modern standards (ES6+, Kotlin best practices), strong typing, and DRY principles. |
| **Documentation** | Keep documentation up-to-date with code changes. Comprehensive inline comments and timely updates to design documents are mandatory.                               |
| **Security**      | Default to secure practices: input sanitization, parameterized queries, least-privilege access, and secret management via environment variables.                   |
| **Performance**   | Optimize bundle size, render performance, and API latency. Minimize unnecessary re-renders and network payloads.                                                   |

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

To prevent UI freezing, serialize **browser sub-agent delegation only** — code-level parallelism (`ThreadPoolExecutor`, `asyncio`, etc.) is always encouraged.

1. **Sub-Agent Delegation** - Run browser sub-agents sequentially (each Chrome instance uses ~4-5GB). For code-level work, maximize parallelism per §Hardware Parallelization.
2. **Atomic Steps** - Break requests into a numbered list. Execute Step 1 fully, verify, then proceed to Step 2.
3. **Phase Your Work** - For major features, explicitly ask: "I will tackle this in phases. Phase 1 is [Task]. Proceed?"

### 🧠 B. Memory & Context Protocol

Antigravity uses a **Knowledge Items (KI)** system for persistent context across conversations:

1. **Debug Filter Rule** - NEVER save full stack traces or massive error logs. Focus only on root cause and final fix.
2. **Knowledge Items** - Antigravity automatically distills conversation context into KIs stored in `~/.gemini/antigravity/knowledge/`. These persist across sessions and are available to all future conversations.
3. **Conversation Logs** - Full conversation history is available in `~/.gemini/antigravity/brain/<conversation-id>/`. Read these when KIs lack detail.
4. **Fallback** - For legacy projects, `NEXT_SESSION.md` can still be used as a manual handoff mechanism.

### 📝 C. Documentation & Artifact Protocol

- **Required File Updates**: When making changes, update `AGENTS.md`, `README.md`, and `ANCHOR_MANIFEST.md` as appropriate.
- **Git Protocol**: Commit frequently (after every major atomic step) with descriptive commit messages.
- **Pre-Push Security Scan**: Run secret scan before every `git push` (see user rules).

---

## 📂 Project Structure

```text
├── src/                 # Application source code
│   ├── App.jsx          # Main application component
│   ├── components/      # UI components, presentation logic
│   ├── hooks/           # Custom hooks for state management
│   ├── services/        # API wrappers (Gemini, Firebase, etc.)
│   └── utils/           # Pure helper functions
├── functions/           # Cloud Functions (Firebase)
├── scripts/             # Build, deploy, and data pipeline scripts
├── docs/                # User and developer documentation
└── public/              # Static assets
```

---

## 🗂️ Active Projects Registry

| Project                                | Tech Stack                                                    | Firebase Project ID  | GitHub Repo                                                                                             |
| -------------------------------------- | ------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| **UE5 Learning Path System**           | React + Vite, Firebase Cloud Functions, Firestore, Gemini API | `ue5-learning-paths` | [Unreal-Learning-Path-Tagging-System](https://github.com/SamDeiter/Unreal-Learning-Path-Tagging-System) |
| **UE5 Question Generator**             | React, Firebase, Gemini API                                   | —                    | [UE5QuestionGenerator](https://github.com/SamDeiter/UE5QuestionGenerator)                               |
| **KitCheck Android**                   | Kotlin, Jetpack Compose, Room DB, Firebase                    | —                    | Private                                                                                                 |
| **Family Household Manager (Shelfie)** | React + Vite, Firebase, Gemini API                            | —                    | Private                                                                                                 |
| **Electrician Toolbox PWA**            | React + Vite, PWA                                             | —                    | Private                                                                                                 |

> [!TIP]
> When running scripts that connect to Firebase (uploads, Firestore queries), always verify the correct `GCLOUD_PROJECT` or check `.env` for `VITE_FIREBASE_PROJECT_ID`.

---

## 🔎 Agent Workflow Modes

| Mode               | Task Type                                        | Best Practice                                                      |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------ |
| **Planning Mode**  | New features, complex bugs, architecture changes | Create implementation plan first, get user approval before coding. |
| **Execution Mode** | Implementing approved plans                      | Follow plan precisely, test as you go, commit frequently.          |
| **Fast Mode**      | Simple edits, renames, quick fixes               | Skip planning artifacts, execute immediately.                      |

---

## 🧩 Agent Model

Antigravity operates as a **unified agent** — a single senior engineer with full-stack capabilities. The previous multi-persona model (Omni-Dev-Prime, React-Architect-Prime, etc.) has been replaced.

### Domain Expertise

The unified agent covers all specialties:

| Domain          | Capabilities                                                             |
| --------------- | ------------------------------------------------------------------------ |
| **Frontend**    | React architecture, component composition, design systems, accessibility |
| **Backend**     | Cloud Functions, Firebase, API design, database schema                   |
| **Security**    | Input validation, secret management, injection prevention, OWASP         |
| **Performance** | Bundle optimization, render performance, concurrency engineering         |
| **Content**     | Quality validation, instructional soundness, accuracy verification       |
| **DevOps**      | CI/CD, deployment, monitoring, infrastructure                            |

### Extensibility: Skills & Workflows

Capabilities are extended via two mechanisms:

- **Skills** (`~/.gemini/antigravity/skills/`): Instruction sets for specialized tasks (e.g., `code_review`, `security_audit`, `debug_issue`). The agent reads `SKILL.md` before executing.
- **Workflows** (`.agents/workflows/`): Step-by-step procedures for repeatable tasks (e.g., `/doc-maintenance`). Triggered via slash commands.

---

## 🚀 Antigravity-Specific Workflows

### Workspace Architecture

Antigravity provides a **unified workspace** with integrated capabilities:

| Capability      | Description                                                                      |
| --------------- | -------------------------------------------------------------------------------- |
| **Editor**      | Full code editing with inline AI assistance                                      |
| **Terminal**    | Direct shell access, background command execution                                |
| **Browser**     | Integrated Chromium for testing UI, recording sessions                           |
| **MCP Servers** | Firebase (Firestore CRUD, Cloud Functions, Auth) and GitHub (repos, PRs, issues) |
| **Task View**   | Structured progress tracking with `task_boundary` calls                          |
| **Artifacts**   | `task.md`, `implementation_plan.md`, `walkthrough.md` for structured work        |

### Three-Phase Agent Workflow (Antigravity Protocol)

All agents must follow this strictly verifiable workflow for complex features:

#### **Phase A: Planning & Artifacts** 📋

**Before writing any code**, agents MUST generate:

1. **Task List** (`task.md`): Granular breakdown of the mission
   - Example: "Build Privacy.com API bridge for virtual card generation"
2. **Implementation Plan** (`implementation_plan.md`): Technical specification
   - Which files will be changed and why
   - Database schema modifications
   - API integration details
   - Security considerations

**Human Approval Required:**

- Antigravity pauses execution
- User reviews artifacts for security flaws, architectural issues
- User comments on plan; agent adjusts accordingly
- **No code is written until explicit approval**

#### **Phase B: Execution & Atomic Commits** ⚙️

Once approved, agents enter **Execution Mode**:

1. **Atomic Steps**: Execute one task at a time
   - Complete database migration → Commit to Git
   - Implement API endpoint → Run tests → Commit
2. **Tool Access**:
   - Direct Terminal access (run build commands, migrations)
   - Integrated Browser (test live functionality)
3. **Continuous Verification**:
   - Run tests after each significant change
   - Validate against project `ANCHOR_MANIFEST.md` standards

#### **Phase C: Verification (Verifiable Deliverables)** ✅

Agents don't just report "done" — they provide **proof**:

1. **Walkthrough** (`walkthrough.md`): Summary of changes
2. **Browser Recordings**: Video of live functionality (e.g., scraper working)
3. **Screenshots**: Visual proof of UI updates
4. **Test Results**: Pass/fail status of automated tests
5. **Performance Metrics**: Response times, memory usage

### Single Source of Truth (SSOT) Architecture

To prevent "Context Bloat", agents maintain **three core anchors**:

#### **1. ANCHOR_MANIFEST.md**

**Rigid, non-negotiable standards** for each project:

- Database: RLS policies, migration protocols, naming conventions
- UI: Tailwind standards, component patterns, accessibility requirements
- Security: Environment variables, input sanitization, rate limiting
- API: Error handling, external integration patterns

**Location:** `<project-root>/.agent/ANCHOR_MANIFEST.md`

#### **2. Knowledge Items (KIs)**

**Automatically distilled patterns** from past conversations:

- Each KI has `metadata.json` (summary, timestamps, references) and `artifacts/` (docs, implementation details)
- KIs are searchable and automatically surfaced at conversation start
- Covers: architecture decisions, troubleshooting patterns, implementation guides, API integration patterns

**Location:** `C:\Users\Sam Deiter\.gemini\antigravity\knowledge\`

> [!NOTE]
> KIs replace the old `NEXT_SESSION.md` handoff mechanism. Context now persists automatically across conversations.

### Model Context Protocol (MCP) Integration

Antigravity connects to external services via MCP servers:

| Server                  | Capabilities                                                                   |
| ----------------------- | ------------------------------------------------------------------------------ |
| **firebase-mcp-server** | Firestore CRUD, security rules, Cloud Functions logs, project management, Auth |
| **github-mcp-server**   | Repository management, PRs, issues, code search, file operations               |

**Security:**

1. **Schema Visibility Only** for databases — agent sees structure, not customer PII
2. **Authenticated via signed-in accounts** — uses `firebase login` and GitHub token
3. **Scoped permissions** — each MCP server has defined tool boundaries

### Critical Human-in-the-Loop Checkpoints

**Non-negotiable approval requirements:**

| Action                             | Requires Human Approval            |
| ---------------------------------- | ---------------------------------- |
| Push to production                 | ✅ Manual approval required        |
| Execute real payments/transactions | ✅ User confirms action            |
| Modify database schema             | ✅ Review `implementation_plan.md` |
| Access production data             | ✅ Session-limited permission      |
| Delete user data                   | ✅ Explicit confirmation           |

### Project-Specific Protocols

Each project may have its own Antigravity protocol document:

- **Family Household Manager**: `.agent/ANTIGRAVITY_PROTOCOL.md`
- **UE5 Question Generator**: `docs/agents/` (this folder)
- **KitCheck Android**: `docs/AGENTS.md`

**Rule:** Always check for project-specific protocols before starting work.

---

## 🖥️ Hardware Parallelization Protocols

All projects run on a high-performance workstation. Agents **MUST** leverage these capabilities for maximum efficiency.

### Host System Specifications

| Component            | Specification                                              |
| -------------------- | ---------------------------------------------------------- |
| **CPU**              | AMD Ryzen Threadripper PRO 3995WX (64 Cores / 128 Threads) |
| **RAM**              | 256 GB DDR4                                                |
| **OS**               | Windows 11 Enterprise                                      |
| **Available Memory** | ~200 GB typical                                            |

### Agent Capacity Limits

| Agent Type               | Max Concurrent | Notes                                 |
| ------------------------ | -------------- | ------------------------------------- |
| Browser-based subagents  | 20-30          | Chrome instances ~4-5GB each          |
| Headless Node.js workers | 80-100         | Batch processing, API calls           |
| Python process workers   | 80-100         | `ProcessPoolExecutor(max_workers=60)` |
| Android emulators        | 4-6            | Each AVD uses ~4-8GB RAM              |
| Pure API callers         | 100+           | Network-bound, not CPU-bound          |

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
  workers: 16, // 16 parallel browser instances
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

### 🔁 Default to Parallel Execution (MANDATORY)

**All batch operations MUST use parallel execution by default.** Serial loops are unacceptable when the workstation has 64 cores and 256 GB RAM. This applies to:

- **API embedding calls** → `ThreadPoolExecutor(max_workers=10-20)`
- **File processing loops** → `ProcessPoolExecutor` for CPU-bound, `ThreadPoolExecutor` for I/O-bound
- **Data transformation pipelines** → Use `concurrent.futures` or `asyncio`
- **Build/test/lint tasks** → Maximize `--workers` / `--maxWorkers` flags

**Rule of thumb:** If you're writing a `for` loop that makes network calls or processes files, convert it to parallel execution. The only exceptions are operations that must be strictly ordered (e.g., database migrations, sequential API calls with dependencies).

---

## 🛠️ Tools & Commands

### Development

| Command                   | Description                                |
| ------------------------- | ------------------------------------------ |
| `npm run dev`             | Start dev server (localhost:5173 for Vite) |
| `npm run build`           | Build optimized production bundle          |
| `npm run preview`         | Preview production build locally           |
| `npm test`                | Run unit and integration tests             |
| `./gradlew assembleDebug` | Build Android debug APK                    |
| `python main.py`          | Run Python application                     |

### Deployment

| Command                            | Description                                |
| ---------------------------------- | ------------------------------------------ |
| `npm run deploy`                   | Deploy to GitHub Pages or hosting provider |
| `firebase deploy --only functions` | Deploy Firebase Cloud Functions only       |
| `./gradlew publishReleaseBundle`   | Publish Android App Bundle to Play Store   |

> Deploy scripts are located in the `scripts/` directory.

---

## 🧪 Testing Standards

### Testing Tiers

| Tier            | Scope                                          | When Required                                    | Tools                   |
| --------------- | ---------------------------------------------- | ------------------------------------------------ | ----------------------- |
| **Unit**        | Individual functions, utilities, pure logic    | All new utility/service functions                | Vitest, Jest, JUnit     |
| **Integration** | API endpoints, Firebase rules, Cloud Functions | Any Cloud Function change, Firestore rule change | Firebase Emulator Suite |
| **E2E**         | Full user flows, UI interactions               | Major feature additions, critical path changes   | Playwright, Espresso    |
| **Regression**  | Verify existing features still work            | Before any production deploy                     | Automated test suite    |

### Minimum Standards

- **Critical paths** (auth, payment, data mutation): Must have E2E coverage
- **Cloud Functions**: Must have integration tests with emulator
- **AI-generated content**: Must have validation tests for hallucination guardrails
- **New utilities**: Must have unit tests with edge cases
- **Bug fixes**: Must include a regression test that would have caught the bug

### Test Execution

```powershell
# Run all tests with parallelism
npm test -- --maxWorkers=16

# Run with coverage report
npm test -- --coverage --maxWorkers=16

# Firebase emulator integration tests
firebase emulators:exec "npm test"
```

---

## 🛡️ Error Handling Standards

### API & Network Errors

All external API calls (Gemini, Vertex AI, Firebase) must implement:

1. **Exponential Backoff** — Start at 1s, double each retry, max 5 retries
2. **Rate Limit Detection** — Check for HTTP 429 and respect `Retry-After` headers
3. **Graceful Degradation** — Fallback to cached/default data when APIs are unavailable
4. **Timeout Limits** — Max 30s for API calls, 120s for batch operations

### Standard Pattern

```javascript
async function callWithRetry(fn, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      if (error.status === 429 || error.status >= 500) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw error; // Don't retry client errors (4xx)
      }
    }
  }
}
```

### Cloud Function Error Responses

All Cloud Functions must return structured errors:

```javascript
// Standard error response format
throw new functions.https.HttpsError(
  "resource-exhausted", // gRPC code
  "Rate limit exceeded", // User-facing message
  { retryAfter: 60 } // Optional details
);
```

### Logging

- **INFO**: Normal operations, request/response summaries
- **WARNING**: Rate limits hit, retries triggered, fallbacks activated
- **ERROR**: Unrecoverable failures, data integrity issues
- **Never log**: API keys, user PII, full request/response bodies in production
