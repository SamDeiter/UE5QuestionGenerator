/**
 * SECURITY TEST: Bundle Secret Detection
 * Ensures production bundles do not contain API keys or sensitive data
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

describe("Security: Bundle Secret Detection", () => {
  const distDir = join(process.cwd(), "dist", "assets");

  it("CRITICAL: Production bundle must not contain Gemini API keys", () => {
    // Check if dist directory exists (might not if build hasn't run)
    if (!existsSync(distDir)) {
      console.warn("dist/assets directory not found - skipping bundle test");
      return;
    }

    const files = readdirSync(distDir).filter((f) => f.endsWith(".js"));
    const geminiKeyPattern = /AIza[A-Za-z0-9_-]{35}/g;
    const allowedKeys = [
      "AIzaSyDHtXGk_e5ntXOqTBAr5whLnVU8LaWsqOQ", // Firebase public key (SAFE - from .env.production)
    ];

    for (const file of files) {
      const content = readFileSync(join(distDir, file), "utf-8");
      const matches = content.match(geminiKeyPattern) || [];

      const unauthorized = matches.filter((k) => !allowedKeys.includes(k));
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

    // Should have exactly 1 unique key: the Firebase public key
    expect(uniqueKeys.length).toBeLessThanOrEqual(1);

    if (uniqueKeys.length === 1) {
      expect(uniqueKeys[0]).toBe("AIzaSyDHtXGk_e5ntXOqTBAr5whLnVU8LaWsqOQ");
    }
  });

  it("CRITICAL: Must not contain direct Gemini REST endpoint URLs", () => {
    if (!existsSync(distDir)) {
      console.warn("dist/assets directory not found - skipping bundle test");
      return;
    }

    const files = readdirSync(distDir).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const content = readFileSync(join(distDir, file), "utf-8");
      // Direct Gemini API calls should go through Cloud Functions, not client-side
      expect(
        content,
        `Direct Gemini endpoint found in ${file} — AI calls must go through Cloud Functions`
      ).not.toContain("generativelanguage.googleapis.com");
    }
  });
});
