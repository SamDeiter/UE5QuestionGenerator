# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
