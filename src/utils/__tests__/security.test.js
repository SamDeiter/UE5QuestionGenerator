import { describe, it, expect } from "vitest";
import { sanitizeCSVField } from "../security";

describe("sanitizeCSVField (CSV / Sheets formula injection guard)", () => {
  it("passes plain text through unchanged", () => {
    expect(sanitizeCSVField("hello world")).toBe("hello world");
    expect(sanitizeCSVField("UE5 rendering pipeline")).toBe(
      "UE5 rendering pipeline"
    );
  });

  it("returns empty string for null/undefined/empty input", () => {
    expect(sanitizeCSVField(null)).toBe("");
    expect(sanitizeCSVField(undefined)).toBe("");
    expect(sanitizeCSVField("")).toBe("");
  });

  it("coerces non-string input via String()", () => {
    expect(sanitizeCSVField(42)).toBe("42");
    expect(sanitizeCSVField(true)).toBe("true");
  });

  it("prefixes a leading `=` with a single quote (HYPERLINK injection)", () => {
    expect(sanitizeCSVField('=HYPERLINK("//evil.example","click")')).toBe(
      '\'=HYPERLINK("//evil.example","click")'
    );
  });

  it("prefixes leading `+`, `-`, `@` with a single quote", () => {
    expect(sanitizeCSVField("+1234567")).toBe("'+1234567");
    expect(sanitizeCSVField("-cmd|/c calc")).toBe("'-cmd|/c calc");
    expect(sanitizeCSVField("@SUM(1+1)")).toBe("'@SUM(1+1)");
  });

  it("prefixes leading tab or CR (Excel re-evaluates these)", () => {
    expect(sanitizeCSVField("\t=SUM(A1)")).toBe("'\t=SUM(A1)");
    expect(sanitizeCSVField("\r=SUM(A1)")).toBe("'\r=SUM(A1)");
  });

  it("treats leading whitespace before a trigger char as injection too", () => {
    expect(sanitizeCSVField("   =SUM(1+1)")).toBe("'   =SUM(1+1)");
  });

  it("does not touch values where the trigger char is mid-string", () => {
    expect(sanitizeCSVField("price = 100")).toBe("price = 100");
    expect(sanitizeCSVField("a@b.com")).toBe("a@b.com");
  });
});
