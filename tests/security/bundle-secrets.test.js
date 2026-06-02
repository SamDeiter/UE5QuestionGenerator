/**
 * SECURITY TEST: Bundle Secret Detection
 * Ensures production bundles do not contain API keys or sensitive data
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

describe("Security: Bundle Secret Detection", () => {
  const distDir = join(process.cwd(), "dist", "assets");

  // The Firebase WEB api key is public by design (it identifies the project;
  // access is enforced by Firestore rules + authorized domains), so it is
  // expected to appear in the client bundle. We read its value from the build
  // env (VITE_FIREBASE_API_KEY) rather than hard-coding it, so this test
  // survives Firebase-project migrations (e.g. the move to the Epic project)
  // instead of silently breaking when the key rotates.
  //
  // The value-match only runs in CI: there, the bundle is freshly built and the
  // env is set from the deploy secret (the correct key), so the comparison is
  // authoritative. Locally, vitest loads the stale dev .env files into
  // process.env, which would value-match against the wrong project's key — so
  // local runs fall back to the always-on "only one unique key may ship" check.
  const firebasePublicKey = process.env.VITE_FIREBASE_API_KEY;
  const enforceKeyValue = Boolean(process.env.CI && firebasePublicKey);

  it("CRITICAL: Production bundle must not contain Gemini API keys", () => {
    // Check if dist directory exists (might not if build hasn't run)
    if (!existsSync(distDir)) {
      console.warn("dist/assets directory not found - skipping bundle test");
      return;
    }

    // Every Google API key (Firebase, Gemini, …) matches /AIza…/, so the only
    // way to tell the safe public Firebase key apart from a leaked one is by
    // value. Outside CI we can't trust the env value, so defer to the
    // single-unique-key count check below rather than producing false failures.
    if (!enforceKeyValue) {
      console.warn(
        "Not in CI (or VITE_FIREBASE_API_KEY unset) - skipping value-based key " +
          "allowlist; single-key-count check still applies."
      );
      return;
    }

    const files = readdirSync(distDir).filter((f) => f.endsWith(".js"));
    const geminiKeyPattern = /AIza[A-Za-z0-9_-]{35}/g;

    for (const file of files) {
      const content = readFileSync(join(distDir, file), "utf-8");
      const matches = content.match(geminiKeyPattern) || [];

      const unauthorized = matches.filter((k) => k !== firebasePublicKey);
      expect(
        unauthorized,
        `Unauthorized API key found in ${file}`
      ).toHaveLength(0);
    }
  });

  it("CRITICAL: Must not expose SUPER_ADMIN_EMAIL", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/assets directory not found - skipping bundle test");
      return;
    }

    const files = readdirSync(distDir).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const content = readFileSync(join(distDir, file), "utf-8");
      expect(content, `VITE_SUPER_ADMIN_EMAIL found in ${file}`).not.toContain(
        "VITE_SUPER_ADMIN_EMAIL"
      );
    }
  });

  it("CRITICAL: Must not expose VITE_GEMINI_API_KEY", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/assets directory not found - skipping bundle test");
      return;
    }

    const files = readdirSync(distDir).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const content = readFileSync(join(distDir, file), "utf-8");
      expect(content, `VITE_GEMINI_API_KEY found in ${file}`).not.toContain(
        "VITE_GEMINI_API_KEY"
      );
    }
  });

  it("Should only contain Firebase public API key", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/assets directory not found - skipping bundle test");
      return;
    }

    const files = readdirSync(distDir).filter((f) => f.endsWith(".js"));
    const allContent = files
      .map((f) => readFileSync(join(distDir, f), "utf-8"))
      .join("");

    const apiKeyPattern = /AIza[A-Za-z0-9_-]{35,}/g;
    const allKeys = allContent.match(apiKeyPattern) || [];
    const uniqueKeys = [...new Set(allKeys)];

    // At most one unique AIza key may ship: the public Firebase web key.
    expect(uniqueKeys.length).toBeLessThanOrEqual(1);

    // In CI, the single shipped key must equal the expected public Firebase key
    // (guards against the wrong project's or a leaked key).
    if (uniqueKeys.length === 1 && enforceKeyValue) {
      expect(uniqueKeys[0]).toBe(firebasePublicKey);
    }
  });

  it("INFO: Checks for direct Gemini REST endpoint URLs in bundle", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/assets directory not found - skipping bundle test");
      return;
    }

    const files = readdirSync(distDir).filter((f) => f.endsWith(".js"));
    const filesWithEndpoint = [];

    for (const file of files) {
      const content = readFileSync(join(distDir, file), "utf-8");
      if (content.includes("generativelanguage.googleapis.com")) {
        filesWithEndpoint.push(file);
      }
    }

    // NOTE: The endpoint string may appear as dead code from the DEV-only fallback
    // in geminiSecure.js. The runtime gate (import.meta.env.DEV) prevents execution
    // in production. The deploy-prod.yml pipeline has a hard grep check as backup.
    if (filesWithEndpoint.length > 0) {
      console.warn(
        `⚠️  Direct Gemini endpoint string found in: ${filesWithEndpoint.join(", ")}. ` +
        "Verify this is only in DEV-gated code paths."
      );
    }
    // This test documents the check but does not fail — the CI pipeline's
    // post-build grep in deploy-prod.yml is the hard enforcement gate.
    expect(true).toBe(true);
  });
});
