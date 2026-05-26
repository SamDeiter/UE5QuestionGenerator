# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Codebase audit + cleanup pass — no user-visible behavior changes. Each line
below is on its own branch and can be reviewed/merged independently. After
the audit completed, Phase 1-3 was already merged via PR #25.

### 🔒 Security

- **Reviewer PII removed from client bundle** — `src/utils/normalizeReviewerName.js`
  previously shipped a hardcoded `EMAIL_TO_NAME_MAP` with 12 real employee
  emails + display names baked into every browser bundle. The data is gone;
  the map is now runtime-injectable via `setReviewerNameMap()`. When unset
  (default), `normalizeReviewerName` falls back to its existing
  email-local-part derivation. Branch: `chore/remove-pii-from-reviewer-name-map`.
- **Bootstrap-admin allowlist consolidated.** The same two-email "always-admin"
  check (`samdeiter@gmail.com` / `samdeiter@epicgames.com`) was duplicated
  inline in `functions/invites/createInvite.js`, `revokeInvite.js`, and the
  two `unifiedAccessMigration.js` callables. Now one shared helper at
  `functions/utils/bootstrapAdmin.js` — single edit to add/remove an email or
  migrate to Firebase functions config. Branch: `chore/extract-bootstrap-admin-allowlist`.

### 🔄 Changed

- **Gemini model + endpoint constants centralized for the 2026-10-16 cutover.**
  All hardcoded `"gemini-2.5-flash"` / `"gemini-2.5-flash-lite"` literals and
  the 6 hardcoded `generativelanguage.googleapis.com/v1beta/models/...` URLs
  across `src/` now route through `AI_CONFIG.DEFAULT_MODEL`,
  `AI_CONFIG.TRANSLATION_MODEL`, and the new `buildGeminiEndpoint()` helper
  in `src/utils/constants.js`. `tokenCounter.js` PRICING + TOKEN_LIMITS gained
  rows for `gemini-3.5-flash`, `gemini-3.1-flash-lite`, and `gemini-3.1-pro-preview`
  with accurate 2026 pricing. Zero behavior change — flipping the constant
  value migrates everything in one edit. The 2.5 series shuts down 2026-10-16
  per [ai.google.dev/gemini-api/docs/deprecations](https://ai.google.dev/gemini-api/docs/deprecations).
  Branch: `chore/gemini-migration-infrastructure`.

### 📝 Documentation

- **Stale `gemini-1.5/2.0` references purged** from `functions/README.md`,
  `docs/reference/TECH_STACK.md`, `scripts/examples/gemini_client_with_usage.py`,
  and `public/logos/README.txt`. Replaced with the actual current model chain
  and a pointer to the deprecations page. Branch: `chore/cleanup-stale-gemini-doc-refs`.

### 🧹 Chore (dead code)

- **Phase 1-3 (already merged via PR #25)** — 20 orphan files deleted
  (test-only modules, an abandoned `src/services/firestore/` refactor, etc.)
  plus 8 dead exports trimmed.
- **Phase 4 batches 1-5 (`chore/dead-code-cleanup-phase-4`)** — 44 additional
  unused named exports removed across 20 files in `src/services/`,
  `src/utils/`, and `src/components/` (e.g., `getCachedQuestion`,
  `validateAnswersBatch`, `clearAnalytics`, `compareAnalyses`,
  `DIFFICULTY_WEIGHTS`, `LoadingSpinner` named export, `StatusIndicator`,
  etc.). Internal-only helpers that are referenced within their own file
  but otherwise unused were left exported when they had test coverage;
  truly orphan exports were deleted along with the corresponding tests.
  Lint: 0 errors, 7 warnings (matches baseline). Test count: 1072 → 972,
  drop matches deleted test cases exactly.

### 📌 Open items (intentionally deferred)

- **Gemini replacement model decision** — pick `gemini-3.5-flash` (5× / 3.6×
  cost) vs `gemini-3.1-flash-lite` (cheaper than current 2.5-flash) vs stay
  on 2.5 until closer to Oct 16. Infrastructure is wired; flipping is a
  one-line edit in `src/utils/constants.js`.
- **God-function refactors** — `AuthenticatedApp` (47 props), `GlobalModals`
  (45 props), `useExport` (641 lines), `QuestionItem` (626), `TestView` (586),
  etc. Tracked separately; multi-day scope.

## [2.5.0] - 2026-05-26

### 🐛 Fixed

- **SCORM weighted draw silently excluded 40% of the question bank.** The classifier in both the export modal and the SCORM runtime template (`game.js`) only matched legacy `Easy/Medium/Hard` substrings. Questions stored with the canonical `Beginner/Intermediate/Expert` vocabulary (~7,790 docs at time of fix) fell into a hidden "other" bucket and never appeared in attempt draws. Same bug also affected the in-app quiz preview.
- **Misleading caption in `ScormExportModal`.** The static text *"Quiz will select 20 of each difficulty (60 total) randomly per user"* did not reflect actual behavior — the SCORM template uses a weighted distribution (15% Easy / 35% Medium / 50% Hard) on the available pool. Replaced with a computed preview that recomputes per-attempt counts as the user changes settings, plus an amber warning when a tier is empty.
- **`scorm/converter.js` default difficulty** changed from legacy `"Medium"` to canonical `"Intermediate"`.

### ✨ Added

- **`questionsPerAttempt` control in `ScormExportModal`.** Single-discipline export now exposes the same per-attempt subset control that the batch modal already had. Defaults to 60.
- **`classifyDifficulty`, `bucketByDifficulty`, `simulateAttemptDistribution` helpers** in [src/utils/quizUtils.js](src/utils/quizUtils.js). Dual-vocabulary classifier accepts both `Easy/Medium/Hard` and `Beginner/Intermediate/Expert` (plus suffixed values like `"Easy MC"`). 18 new unit tests covering both vocabularies, surplus redistribution, empties, and the original-bug regression scenario.
- **Diagnostic script** [scripts/inspect_difficulty_values.py](scripts/inspect_difficulty_values.py) — scans Firestore and reports every distinct `difficulty` value with classifier output.
- **Migration script** [scripts/migrate_difficulty_to_canonical.py](scripts/migrate_difficulty_to_canonical.py) — dry-run by default; normalizes legacy `Easy/Medium/Hard` to canonical `Beginner/Intermediate/Expert` with `legacyDifficulty` + `migratedFromLegacyDifficultyAt` audit fields for rollback.

### 🔄 Changed

- **Firestore difficulty data migrated to canonical vocabulary.** 11,790 docs migrated (Easy→Beginner 3190, Medium→Intermediate 4630, Hard→Expert 3970). All 19,580 question docs now use `Beginner/Intermediate/Expert`. Every migrated doc retains `legacyDifficulty` for rollback. After migration, exact-match Firestore queries in [firebaseQueries.js](src/services/firebaseQueries.js) (which look for canonical values) find every relevant doc instead of silently missing ~60% of legacy entries.
- **Mock question generator** ([mockQuestionGenerator.js](src/utils/mockQuestionGenerator.js)) now emits canonical `Beginner/Intermediate/Expert` to match what the app actually writes to Firestore.

## [2.4.0] - 2026-01-28

### 🔒 Security

- **AuthManager Singleton**: Centralized authentication lifecycle management using `onIdTokenChanged` for real-time token and claim monitoring
- **Race Condition Fixes**: Eliminated "Ghost Admin" and "Ghost Reviewer" vulnerabilities through `isCancelled` checks and proper cleanup
- **Token Refresh UX**: Enhanced user messaging for session issues with auto-sign-out on critical failures
- **Email Verification**: New email/password signups now require email verification (HIGH 8)
- **Claims Reactivity**: Added `getClaims()` and `refreshClaims()` methods for real-time permission updates (MEDIUM 13)
- **Cleanup Bus**: Automatic Firestore listener and concurrent editing agent cleanup on logout/account switch (MEDIUM 14)
- **Write Probe Hardening**: Registration revoked on `permission-denied` errors to prevent unauthorized access

### Added

- `src/services/AuthManager.js` - Centralized auth singleton service
- `src/hooks/useAuthCleanup.js` - Hook for cleanup lifecycle registration
- `src/testUtils/authHarness.js` - Test utility for simulating auth edge cases
- `src/services/__tests__/AuthManager.test.js` - 23 unit tests for AuthManager
- `src/hooks/__tests__/useAuth.integration.test.js` - 9 integration tests
- `src/services/__tests__/firestore.rules.test.js` - Firestore rules test infrastructure
- `npm run test:rules` script for running Firestore rules tests with emulator

### Changed

- `src/main.jsx` - AuthManager initialization at app startup
- `src/App.jsx` - Agent cleanup registration and enhanced token refresh handling
- `src/hooks/useAuth.js` - Critical security fixes for race conditions
- `src/services/firebaseAuth.js` - Added email verification for signups
- `src/components/InviteSignUp.jsx` - Updated for new signup flow with verification
- `functions/users/setupInitialAdmin.js` - Added transaction + idempotency check

### Fixed

- Ghost Admin state when admin status checked during logout
- Ghost Reviewer access when write probe fails but registration not revoked
- Stale listener data after logout/account switch
- Concurrent editing agents not resetting on logout

### Removed

- Unused `GoogleIcon` component from InviteSignUp
- Stray temp files from root (eslint_errors*.txt,*.py debugging scripts)
- Legacy temp files from scripts/archive

### Maintenance

- Updated husky to v9 format (removed deprecation warnings)
- Improved .gitignore patterns for dev artifacts
- Test count: 891 passing | 15 skipped (emulator-only)

---

## [2.3.32] - 2026-01-27

### Fixed

- SCORM exporter test updated for new `{{TITLE}}` placeholder system
- ESLint audit completed with all critical errors and warnings fixed

---

## [2.3.31] - 2026-01-26

### Changed

- LMS export overhauled based on known-working template
- SCORM manifest hardening for strict platform compatibility

---

## [2.3.0] - 2026-01-20

### Added

- Firebase hardening patterns
- Identity resilience for external accounts
- Write probe validation on login

### Security

- Server-side admin detection
- Transactional writes for critical operations
- Proactive token refresh

---

## [2.2.0] - 2026-01-16

### Added

- Concurrent editing system with real-time locks
- Reviewer analytics dashboard
- SCORM 1.2 export functionality

### Changed

- Refactored authentication flow
- Improved offline queue handling

---

## [2.1.0] - 2026-01-10

### Added

- Multi-language translation support
- Quality critique with AI scoring
- Tag generation system

---

## [2.0.0] - 2026-01-01

### Added

- Firebase backend integration
- Cloud Functions for secure AI operations
- Role-based access control (Admin/Reviewer)
- Invite-only registration system

### Changed

- Migration from localStorage to Firestore
- All AI calls routed through Cloud Functions

---

## [1.0.0] - 2025-12-01

### Added

- Initial release
- AI-powered question generation with Gemini
- Multiple choice and True/False question types
- Local storage persistence
- Basic SCORM export

---

[2.4.0]: https://github.com/SamDeiter/UE5QuestionGenerator/compare/v2.3.32...v2.4.0
[2.3.32]: https://github.com/SamDeiter/UE5QuestionGenerator/compare/v2.3.31...v2.3.32
[2.3.31]: https://github.com/SamDeiter/UE5QuestionGenerator/compare/v2.3.0...v2.3.31
[2.3.0]: https://github.com/SamDeiter/UE5QuestionGenerator/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/SamDeiter/UE5QuestionGenerator/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/SamDeiter/UE5QuestionGenerator/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/SamDeiter/UE5QuestionGenerator/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/SamDeiter/UE5QuestionGenerator/releases/tag/v1.0.0
