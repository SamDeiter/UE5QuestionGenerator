# Engineering Journal

Running log of what was worked on, why, and what was left for next time.
Newest entries on top. Less formal than [CHANGELOG.md](../CHANGELOG.md)
(which is per-release and structured); this is a narrative engineering
log for future-me / future contributors to understand the *why* behind
decisions when the commit messages alone aren't enough.

**Format per entry:**

- `## YYYY-MM-DD — Short title`
- **Focus:** one-line summary of what the session was about
- **Shipped:** PR numbers + brief recap
- **Decisions:** non-obvious calls made and why
- **Deferred:** what was scoped out and why
- **Watch:** runtime checks to do later (quality, perf, etc.)

---

## 2026-06-10 — Fix PWA Reload button

**Focus:** "A new version is available" banner's Reload button wasn't reloading the page.

**Root cause:** `_updateSW(true)` from vite-plugin-pwa fire-and-forgets SKIP_WAITING and returns immediately. Workbox-window's internal `controlling` reload only fires when `event.isUpdate === true`, which is false after a hard-refresh (`navigator.serviceWorker.controller` is null at registration time). The explicit `controllerchange` listener was the only safety net, but it had no fallback if the event was missed.

**Shipped:**

- `UpdateAvailableBanner.handleReload`: bypass `_updateSW` entirely; use `navigator.serviceWorker.getRegistration()` to post SKIP_WAITING directly to `reg.waiting`; keep `controllerchange` as primary reload trigger; add guarded 3s fallback that reloads *only if `reg.waiting` is gone* (new SW activated) — this guard is what prevents the infinite-banner loop vs. the old blind 3s timeout
- Deployed to live site

**Decisions:**

- Removed `_updateSW(true)` call entirely — it adds nothing when we post SKIP_WAITING directly. The SW's workbox-build template always includes the `{type: 'SKIP_WAITING'}` message listener when `skipWaiting: false`.
- The guarded fallback (`if (!r?.waiting) reload`) is safe from the infinite loop: if SKIP_WAITING propagated and the new SW activated, `waiting` is gone → reload. If SKIP_WAITING failed and `waiting` is still set → skip reload, no loop.

---

## 2026-06-10 — Test view access for reviewers

**Focus:** Expose the Test nav tab to users with `role === "reviewer"`.

**Shipped:**

- Threaded `userRole` from `AuthenticatedApp` → `MainLayout` → `AppNavigation` + `ViewRouter` → `TestView`
- `AppNavigation`: added `reviewerAllowed: true` to Test nav item; filter now passes `adminOnly` items for reviewers when `reviewerAllowed` is set
- `ViewRouter`: `APP_MODES.TEST` renders for `isAdmin || userRole === "reviewer"`
- `TestView`: guard updated from `!isAdmin` to `!isAdmin && userRole !== "reviewer"`
- Deployed to live site

---

## 2026-06-10 — Invite cleanup + URL migration + user account triage

**Focus:** Fix stale GitHub Pages URLs throughout the codebase, triage reviewer access issues, and add invite cleanup tooling.

**Shipped:**

- Updated all hardcoded `samdeiter.github.io/UE5QuestionGenerator` URLs to `ue5-question-generator.web.app` across 7 files (createInvite.js, package.json, smoke-test.js, README.md, docs/README.md, docs/REVIEWER_GUIDE.md, functions/migrations/unifiedAccessMigration.js)
- Deleted 52 unused (never-redeemed) invite documents from Firestore; 14 used invites kept as history
- New `cleanupInvites` Cloud Function (admin-only) — deletes invites with `currentUses === 0`
- "Clean Up Unused" button added to Admin Panel → Invite Management
- Deployed functions; confirmed working

**Decisions:**

- Keep invites where `currentUses > 0` as historical record (registeredUsers already stores the inviteCode, but the invite doc has the full usedBy audit trail)
- Cleanup rule is `currentUses === 0` only — doesn't matter if the invite was expired or revoked, if nobody used it it's junk

**User account notes (2026-06-10):**

- Greg Berridge (`gregberr77@gmail.com`) — already registered, role=reviewer, claims correct. Original error was caused by old GitHub Pages URL not preserving his session. Fix: send him `https://ue5-question-generator.web.app/` directly.
- Laura Johnston (`laura.johnston@epicgames.com`) — role=admin in both Firestore and Auth claims. UI showed reviewer because her JWT was stale. Fix: sign out and back in.

---

## 2026-06-10 — First Firebase Hosting deploy since April 28

**Focus:** Diagnose persistent PWA update-banner loop; root cause was that the live site had never been re-deployed after the April 28 initial commit — all subsequent fixes (PWA, security, Firestore migration, language, IDB) were unreleased.

**Shipped:**

- `npm run deploy` — Firebase Hosting updated to current HEAD (v2.5.1)
- Firestore rules re-confirmed up-to-date (no change needed)

**Decisions:**

- Deployed all 6 weeks of accumulated commits at once rather than cherry-picking; the Firestore migration was already complete on the data side so no data-path risk.
- Live site was running April 28 code (first-ever SW install) while the repo had three subsequent PWA fix commits. Every reload showed the banner because the old SW had a 3 s timeout that reloaded before `skipWaiting()` propagated, leaving the new SW stuck in "waiting" indefinitely.

**Watch:**

- Users will see the banner once more on their next visit (old SW detects new build). After clicking Reload it should stay gone.
- USE_INDEX still disabled; re-enable once ~19,580 docs confirmed indexed in Firebase console.

---

## 2026-05-26 — Phase 6 refactors + Gemini migration + translation tab rebuild

**Focus:** Close out three concurrent threads — the god-function
refactor backlog from the codebase audit, the Gemini 2.5 deprecation
deadline (shutdown 2026-10-16), and a translation-tab UX rebuild that
was running in parallel. Plus a one-shot Firestore cleanup of 1,276
stale-field-bearing translation docs.

**Shipped (chronological):**

- **Phase 6 god-function refactors** (PRs #35–#43, plus #44):
  - `#35` foundation — extracted `toMillis()` to
    `src/utils/firestoreHelpers.js` (dedup between `firebaseQueries.js`
    and `useExport.js`); deleted unused `src/contexts/ModalProvider.jsx`
    stub
  - `#36` MessageContext — `useToast` wrapped in context, killed
    `showMessage` prop drill across 15+ components (60+ JSX prop passes
    removed)
  - `#37` ModalContext — consolidated 14 modal visibility booleans
    previously scattered across `useModalState` (7), `useCompliance`
    (3), and `useAppConfig` (4). Deleted `useModalState.js` and
    `useCompliance.js` entirely. Side effects preserved verbatim
    (`window.openDangerZone`, compliance localStorage check, data-menu
    click-outside)
  - `#38` useExport split — 659-line hook → thin facade composing
    `useExportFormatting` (CSV/JSON/MD + bulk export),
    `useSheetsBridge` (Sheets dual-write + re-import),
    `useFirestoreSync` (three-tier cache → incremental → full sync)
  - `#39` useQuestionGenerator split — `handleAutoCritique`,
    `handleExplain`, `handleVariate` moved into the existing
    `useQuestionCritique`. `useGeneration.js` reorders construction so
    critique is built first and `handleAutoCritique` is passed into
    the generator
  - `#40` firebaseStats extracted — `getCategoryStatsAggregated`,
    `getUserTokenUsageAggregated`, `getQuestionStats` moved out of
    the 1058-line `firebaseQueries.js`. Pure server-side aggregations
    with zero cache coupling. Re-exported for API parity
  - `#42` QuestionItem hooks — `useQuestionVerification` (verify/
    reject/flag/doc-link callbacks) and `useCritiqueChangeDetection`
    (refs + effect that auto-opens improvement modal). Detection hook
    exposes `markSeen()` so the apply path can pre-sync the cursor and
    avoid the modal re-opening against a just-applied rewrite.
    QuestionItem 740→~580 lines
  - `#43` QuizConfigForm — 7-field Quiz Settings card pulled out of
    TestView into a pure presentational subcomponent
  - `#44` prettier whitespace fix — one-line repair unblocking GitHub
    Pages deploy after a prettier `--check` failure surfaced on main
- **Gemini 2.5 → 3.x migration** (PR #47):
  - `DEFAULT_MODEL` `gemini-2.5-flash` → `gemini-3.5-flash` —
    used by generation, critique, explain, variate, tag inference
  - `TRANSLATION_MODEL` `gemini-2.5-flash-lite` →
    `gemini-3.1-flash-lite` — high-volume translation path
  - Admin "Most Capable" picker `gemini-2.5-pro` →
    `gemini-3.1-pro-preview`
  - Token-counter default fallbacks flipped to `gemini-3.5-flash`;
    the 2.5-series `PRICING` and `TOKEN_LIMITS` rows were intentionally
    kept so historical analytics on pre-migration generations still
    resolves
- **Translation tab UX rebuild** (PRs #41, #45, #46) — non-English
  tabs in `QuestionItem` now mirror the English accepted-state layout
  rather than rendering an out-of-place critique workflow:
  - `ReviewProgressBar` gets a translation-only branch (amber
    "Machine Translated — Mark verified" → green
    "Translation verified by X — Clear verification"). Bilingual
    sign-off is independent of the English critique state
  - Header chip on translation variants surfaces a
    "MACHINE TRANSLATED" / "TRANSLATION VERIFIED" indicator
  - Re-Critique and REJECT actions are language-gated to English
    (those are source-content concepts; rejecting a translation
    doesn't make sense)
  - `SourceContextCard` resolves the English variant from
    `availableVariants` and routes `sourceUrl` /
    `sourceExcerpt` / `humanVerified*` through it — the verification
    badge is now *live from English*, not frozen at translation time
  - Flag toggle next to the Source Context header swaps in the
    translated excerpt as a reading aid. In review mode the
    translated excerpt is editable inline with author attribution
    (`sourceExcerpt`, `sourceExcerptEditedBy`,
    `sourceExcerptEditedAt` on the translation variant doc)
- **One-shot Firestore cleanup** (PR #45 + run on 2026-05-26):
  `scripts/cleanup_translation_critique_fields.js` nulled the
  inherited `critiqueScore` / `critique` / `suggestedRewrite` /
  `improvedScore` / `critiqueAttempts` / `improvementsApplied` fields
  on **1,276** non-English variant docs (Chinese 1075, Spanish 188,
  Japanese 11, Korean 2). Each touched doc has
  `_cleanedStaleCritiqueFieldsAt` for audit. Translations created
  since PR #41 don't inherit these fields, so re-running the script
  should now be a no-op
- **Documentation** (PR #48): CHANGELOG Unreleased section rewritten
  to capture the above

Tests stable at 974 passing throughout. Lint baseline drifted 7→11
warnings — the 4 new ones are expected (`react-refresh/only-export-components`
on the two new context files + `react-hooks/exhaustive-deps` on the
context-driven `useAppConfig` effects), not regressions.

**Decisions:**

- **Sequential PRs, not parallel.** Each refactor PR is independently
  mergeable. Chose this over a single big-bang PR or wave-based
  parallelism to keep each diff under ~400 lines for fast review and
  to make any single revert surgical. Cost: ~10 hours wall-clock for
  Phase 6. Benefit: zero rebase pain, every step revertible. Hit one
  conflict during the session (PR #27 needed a rebase after #28
  landed); resolved in <5 min.
- **Quality-vs-cost split on Gemini.** Generation produces the work
  product, so it gets `gemini-3.5-flash` (~5× more expensive per
  input token vs 2.5-flash). Translation is high-volume pattern
  matching, so it gets `gemini-3.1-flash-lite` (which is actually
  *cheaper* than the 2.5-flash-lite it replaces). Net spend is
  bounded; the user-facing quality bar is held where it matters. The
  bet is that the quality bump is noticeable — see Watch.
- **firebaseQueries split scoped down to stats only.** The plan
  called for a three-way `firebaseCache` / `firebaseRead` /
  `firebaseStats` split, but the in-memory `_questionsCache` state
  is tightly coupled to `getAllQuestionsFromFirestore`, and the file
  has zero dedicated test coverage. Pulling cache and read apart
  without tests is the kind of "silent regression" risk that ruins a
  Friday. Stats is the safe win; the rest waits for characterization
  tests.
- **QuestionFilter not extracted from TestView.** Plan called for both
  QuizConfigForm and QuestionFilter; only Config landed. Filter needs
  5 pieces of state + 3 callbacks plumbed through, admin-only view, no
  smoke tests. Risk/value didn't justify the time this round.
- **Translation tabs use English source of truth, not frozen
  snapshot.** When a question is verified or re-edited in English,
  every translation variant immediately reflects the new source URL /
  excerpt / verification status. Trade-off: translations can't
  "preserve" the old English source they were translated from. Won
  out because the alternative (frozen snapshots) creates stale
  source-link audits the moment English content updates.
- **Global model setup: `opusplan`.** Switched
  `~/.claude/settings.json` from `opus[1m]` to `opusplan` — Opus
  during plan mode, Sonnet during execution. Recipe documented in
  `~/.claude/CLAUDE.md` so every future Claude Code session inherits
  the cost-optimization without re-explaining. Behavior spec also
  says: flag any execution task that *genuinely* needs Opus-level
  reasoning before digging in, don't soldier through with Sonnet.

**Deferred (real follow-ups, not blocked):**

1. **firebaseQueries cache/read split** —
   [src/services/firebaseQueries.js](../src/services/firebaseQueries.js)
   is still ~900 lines. Write characterization tests for the
   read/cache layer first, then split.
2. **TestView QuestionFilter extraction** — pair with a smoke test for
   TestView when it comes back (no test coverage today).
3. **`firebase-admin` missing from `package.json`** — running
   `scripts/cleanup_translation_critique_fields.js` on 2026-05-26
   needed `npm install --no-save firebase-admin` because the package
   wasn't in the lockfile. Either add it as a `devDependency` (so
   future maintenance scripts run cleanly out of the box) or document
   the `--no-save` step inline at the top of
   `scripts/backfill_human_verified.js` and the new cleanup script.
   Tiny scope.
4. **Maintenance-script auth pattern divergence** — the memory note
   recommends initializing with the `GOOGLE_APPLICATION_CREDENTIALS`
   env var, but the actual scripts (`backfill_human_verified.js`,
   `cleanup_translation_critique_fields.js`) hardcode
   `config/serviceAccountKey.json`. Pick a single convention and align
   both — the env-var path is more portable and avoids leaving a
   gitignored key file sitting around between runs.

**Watch:**

- **Gemini 3.5-flash output quality.** Generation is now ~5× input
  cost vs 2.5-flash on the bet that quality improves. If several real
  generation batches feel indistinguishable from 2.5-flash output,
  consider downgrading `DEFAULT_MODEL` to `gemini-3.1-flash-lite`
  (translation already lives there). Don't react to a single batch —
  wait for clear signal across multiple disciplines before flipping.

---

## Earlier — Codebase audit + cleanup (multiple sessions)

**Focus:** Full-codebase audit covering dead code, god functions,
hardcoded values, and security/PII review. Output was a set of
small-PR cleanups plus the Phase 6 refactor plan that landed on
2026-05-26.

**Shipped (highlights, per CHANGELOG Unreleased "Pre-Phase-6" sections):**

- 🔒 **PII removed from client bundle** — hardcoded `EMAIL_TO_NAME_MAP`
  (12 real employee emails) deleted from `normalizeReviewerName.js`;
  map is now runtime-injectable (`setReviewerNameMap`).
- 🔒 **Bootstrap-admin allowlist consolidated** — two duplicated
  emails-as-allowlist checks across four Cloud Functions collapsed to
  `functions/utils/bootstrapAdmin.js`.
- 🔄 **Gemini constants centralized** — all hardcoded model literals
  and 6 hardcoded endpoint URLs routed through
  `AI_CONFIG.DEFAULT_MODEL` / `TRANSLATION_MODEL` /
  `buildGeminiEndpoint()`. Set the stage for the 2.5→3.x flip that
  landed 2026-05-26.
- 📝 **Stale Gemini 1.5/2.0 doc references purged** from
  `functions/README.md`, `docs/reference/TECH_STACK.md`, and a few
  scripts.
- 🧹 **Phase 1-3 dead code (PR #25)** — 20 orphan files deleted plus
  8 dead exports trimmed.
- 🧹 **Phase 4 dead code** — 44 additional unused named exports
  removed across 20 files in `src/services/`, `src/utils/`,
  `src/components/`. Test count: 1072 → 972 (drop matches deleted
  test cases exactly).

**Outcome:** The Phase 6 plan was written during this audit; that work
ran on 2026-05-26.
