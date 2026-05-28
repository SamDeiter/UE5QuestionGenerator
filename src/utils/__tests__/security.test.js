import { describe, it, expect } from "vitest";
import {
  sanitizeCSVField,
  sanitizeImportedField,
  sanitizeImportedUrl,
} from "../security";

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

describe("sanitizeImportedField (CSV import boundary)", () => {
  it("returns empty string for null/undefined", () => {
    expect(sanitizeImportedField(null)).toBe("");
    expect(sanitizeImportedField(undefined)).toBe("");
  });

  it("strips HTML tags from imported content", () => {
    expect(sanitizeImportedField("<p>hello</p>")).toBe("hello");
    expect(sanitizeImportedField("<b>bold</b> and <i>italic</i>")).toBe(
      "bold and italic"
    );
  });

  it("strips script tags (preserves textContent as inert text)", () => {
    const malicious = "explanation <script>alert(1)</script>";
    const result = sanitizeImportedField(malicious);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("</script");
  });

  it("collapses whitespace including embedded \\r\\n", () => {
    expect(sanitizeImportedField("foo\r\nbar\n  baz")).toBe("foo bar baz");
  });

  it("caps length when maxLength is provided", () => {
    const long = "a".repeat(2500);
    const result = sanitizeImportedField(long, { maxLength: 2000 });
    expect(result.length).toBe(2000);
  });

  it("re-applies formula-injection guard by default", () => {
    expect(sanitizeImportedField('=HYPERLINK("//evil","x")')).toBe(
      '\'=HYPERLINK("//evil","x")'
    );
  });

  it("can disable the formula guard if caller asks", () => {
    expect(
      sanitizeImportedField('=HYPERLINK("//evil","x")', {
        applyCsvGuard: false,
      })
    ).toBe('=HYPERLINK("//evil","x")');
  });

  it("collapses whitespace BEFORE the formula guard so '   =SUM' is still flagged", () => {
    // After whitespace collapse the field becomes "=SUM(1+1)" with the
    // leading space gone, and the guard prefixes a single quote.
    expect(sanitizeImportedField("   =SUM(1+1)")).toBe("'=SUM(1+1)");
  });
});

describe("sanitizeImportedUrl", () => {
  it("returns empty string for null/undefined", () => {
    expect(sanitizeImportedUrl(null)).toBe("");
    expect(sanitizeImportedUrl(undefined)).toBe("");
  });

  it("returns the URL when http(s)", () => {
    expect(sanitizeImportedUrl("https://dev.epicgames.com/x")).toBe(
      "https://dev.epicgames.com/x"
    );
  });

  it("strips javascript: scheme from imported URLs", () => {
    // eslint-disable-next-line sonarjs/code-eval
    const xss = "javascript:alert(1)";
    expect(sanitizeImportedUrl(xss)).toBe("");
  });

  it("strips data: URIs", () => {
    expect(
      sanitizeImportedUrl("data:text/html,<script>alert(1)</script>")
    ).toBe("");
  });

  it("strips file: scheme", () => {
    expect(sanitizeImportedUrl("file:///etc/passwd")).toBe("");
  });

  it("strips unparseable garbage", () => {
    expect(sanitizeImportedUrl("not a url")).toBe("");
  });
});
