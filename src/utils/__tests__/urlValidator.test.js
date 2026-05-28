import { describe, it, expect } from "vitest";
import { validateURL, assertHttpUrl, isEpicLink } from "../urlValidator";

describe("URL Validator", () => {
  it("should validate base documentation URL", () => {
    const validURL =
      "https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-for-beginners";
    const result = validateURL(validURL);
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBe(100);
  });

  it("should reject non-Epic Games URLs", () => {
    const invalidURL = "https://google.com";
    const result = validateURL(invalidURL);
    expect(result.isValid).toBe(false);
    expect(result.warning).toBe("Not an Epic Games documentation URL");
  });

  it("should reject too generic URLs", () => {
    const genericURL =
      "https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine";
    const result = validateURL(genericURL);
    expect(result.isValid).toBe(false);
    expect(result.warning).toContain("Invalid URL pattern");
  });

  it("should warn about missing -in-unreal-engine suffix on valid-looking slugs", () => {
    const missingSuffix =
      "https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-features";
    const result = validateURL(missingSuffix);
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBe(60);
    expect(result.warning).toContain("-in-unreal-engine");
  });

  it("should reject double hyphens", () => {
    const doubleHyphen =
      "https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite--visuals";
    const result = validateURL(doubleHyphen);
    expect(result.isValid).toBe(false);
    expect(result.warning).toBe("URL has double hyphens");
  });

  it("should reject empty URLs", () => {
    const result = validateURL("");
    expect(result.isValid).toBe(false);
    expect(result.warning).toBe("Missing documentation URL");
  });
});

describe("assertHttpUrl", () => {
  it("accepts https URLs", () => {
    expect(assertHttpUrl("https://example.com/x")).toBe(
      "https://example.com/x"
    );
  });

  it("accepts http URLs", () => {
    expect(assertHttpUrl("http://example.com")).toBe("http://example.com");
  });

  it("rejects javascript: scheme", () => {
    // eslint-disable-next-line sonarjs/code-eval
    const xss = "javascript:alert(1)";
    expect(assertHttpUrl(xss)).toBeNull();
  });

  it("rejects data: URIs", () => {
    expect(
      assertHttpUrl("data:text/html,<script>alert(1)</script>")
    ).toBeNull();
  });

  it("rejects file: scheme", () => {
    expect(assertHttpUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects vbscript: scheme", () => {
    expect(assertHttpUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects unparseable URLs", () => {
    expect(assertHttpUrl("not a url")).toBeNull();
    expect(assertHttpUrl("://broken")).toBeNull();
  });

  it("rejects empty, null, and non-string input", () => {
    expect(assertHttpUrl("")).toBeNull();
    expect(assertHttpUrl(null)).toBeNull();
    expect(assertHttpUrl(undefined)).toBeNull();
    expect(assertHttpUrl(42)).toBeNull();
  });

  it("trims whitespace before parsing", () => {
    expect(assertHttpUrl("  https://example.com  ")).toBe(
      "https://example.com"
    );
  });
});

describe("isEpicLink", () => {
  it("accepts exact epicgames.com host", () => {
    expect(isEpicLink("https://epicgames.com/foo")).toBe(true);
  });

  it("accepts epicgames.com sub-domains", () => {
    expect(isEpicLink("https://dev.epicgames.com/documentation")).toBe(true);
    expect(isEpicLink("https://www.epicgames.com")).toBe(true);
  });

  it("accepts unrealengine.com and sub-domains", () => {
    expect(isEpicLink("https://unrealengine.com")).toBe(true);
    expect(isEpicLink("https://docs.unrealengine.com/path")).toBe(true);
  });

  // PHISHING DEFENSE: previous substring check passed
  // "https://evil.com/epicgames.com" — now hostname is checked.
  it("rejects phishing URLs that put epicgames.com in the path", () => {
    expect(isEpicLink("https://evil.com/epicgames.com")).toBe(false);
    expect(isEpicLink("https://evil.com?host=epicgames.com")).toBe(false);
  });

  it("rejects phishing URLs that put epicgames.com as a sub-string of the host", () => {
    expect(isEpicLink("https://epicgames.com.evil.com")).toBe(false);
    expect(isEpicLink("https://fakeepicgames.com")).toBe(false);
  });

  it("rejects http:// (forces https)", () => {
    // eslint-disable-next-line sonarjs/no-clear-text-protocols
    const insecure = "http://epicgames.com";
    expect(isEpicLink(insecure)).toBe(false);
  });

  it("rejects unparseable and empty input", () => {
    expect(isEpicLink("")).toBe(false);
    expect(isEpicLink(null)).toBe(false);
    expect(isEpicLink("not a url")).toBe(false);
  });
});
