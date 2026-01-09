import { describe, it, expect } from "vitest";
import { validateURL } from "../urlValidator";

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
