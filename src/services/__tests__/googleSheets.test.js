// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  assertAppsScriptUrl,
  fetchQuestionsFromSheets,
  saveQuestionsToSheets,
  clearQuestionsFromSheets,
} from "../googleSheets";

const VALID_URL =
  "https://script.google.com/macros/s/AKfycbyTESTDEPLOYMENTID/exec";

describe("Google Sheets Service", () => {
  let appendChildSpy;
  let removeChildSpy;
  let createElementSpy;

  beforeEach(() => {
    appendChildSpy = vi.spyOn(document.body, "appendChild");
    removeChildSpy = vi.spyOn(document.body, "removeChild");
    createElementSpy = vi.spyOn(document, "createElement");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any global callbacks created
    Object.keys(window).forEach((key) => {
      if (key.startsWith("jsonp_callback_")) {
        delete window[key];
      }
    });
  });

  describe("fetchQuestionsFromSheets", () => {
    it("should resolve with data on success", async () => {
      const mockData = {
        status: "Success",
        data: [{ id: 1, question: "Test" }],
      };

      // Mock script element
      const scriptMock = { src: "", onerror: null };
      createElementSpy.mockReturnValue(scriptMock);

      // Mock appendChild to simulate JSONP response
      appendChildSpy.mockImplementation((element) => {
        if (element === scriptMock) {
          // Find the callback name in the src
          const match = scriptMock.src.match(/callback=([^&]+)/);
          if (match && window[match[1]]) {
            window[match[1]](mockData);
          }
        }
        return element;
      });

      // Mock removeChild to do nothing (or verify it's called)
      removeChildSpy.mockImplementation(() => {});

      const result = await fetchQuestionsFromSheets(VALID_URL);
      expect(result).toEqual(mockData.data);
      expect(scriptMock.src).toContain("action=read");
    });

    it("should reject on error response", async () => {
      const mockData = { status: "Error", message: "Failed" };

      const scriptMock = { src: "", onerror: null };
      createElementSpy.mockReturnValue(scriptMock);

      appendChildSpy.mockImplementation((element) => {
        if (element === scriptMock) {
          const match = scriptMock.src.match(/callback=([^&]+)/);
          if (match && window[match[1]]) {
            window[match[1]](mockData);
          }
        }
        return element;
      });

      removeChildSpy.mockImplementation(() => {});

      await expect(fetchQuestionsFromSheets(VALID_URL)).rejects.toThrow(
        "Failed"
      );
    });

    it("should reject on script load error", async () => {
      const scriptMock = { src: "", onerror: null };
      createElementSpy.mockReturnValue(scriptMock);

      appendChildSpy.mockImplementation((element) => {
        if (element === scriptMock && scriptMock.onerror) {
          scriptMock.onerror();
        }
        return element;
      });

      removeChildSpy.mockImplementation(() => {});

      await expect(fetchQuestionsFromSheets(VALID_URL)).rejects.toThrow(
        "Connection failed"
      );
    });
  });

  describe("saveQuestionsToSheets", () => {
    it("should submit a form with correct data", async () => {
      const formMock = {
        method: "",
        action: "",
        target: "",
        appendChild: vi.fn(),
        submit: vi.fn(),
      };
      const inputMock = { type: "", name: "", value: "" };

      createElementSpy.mockImplementation((tagName) => {
        if (tagName === "form") return formMock;
        if (tagName === "input") return inputMock;
        return {};
      });

      appendChildSpy.mockImplementation(() => {});
      removeChildSpy.mockImplementation(() => {});

      const questions = [
        {
          uniqueId: "123",
          discipline: "Art",
          type: "MC",
          difficulty: "Easy",
          question: "Q?",
          options: { A: "1", B: "2" },
          correct: "A",
          language: "English",
        },
      ];

      await saveQuestionsToSheets(VALID_URL, questions);

      expect(formMock.method).toBe("POST");
      expect(formMock.action).toBe(VALID_URL);
      expect(formMock.target).toBe("SheetsSaving");
      expect(inputMock.name).toBe("data");

      const payload = JSON.parse(inputMock.value);
      expect(payload.questions[0].ID).toBe("1");
      expect(payload.questions[0].Discipline).toBe("Art");
      expect(formMock.submit).toHaveBeenCalled();
    });

    it("prefixes a single quote to formula-injection payload fields", async () => {
      const formMock = {
        method: "",
        action: "",
        target: "",
        appendChild: vi.fn(),
        submit: vi.fn(),
      };
      const inputMock = { type: "", name: "", value: "" };
      createElementSpy.mockImplementation((tagName) => {
        if (tagName === "form") return formMock;
        if (tagName === "input") return inputMock;
        return {};
      });
      appendChildSpy.mockImplementation(() => {});
      removeChildSpy.mockImplementation(() => {});

      const questions = [
        {
          uniqueId: "evil-1",
          discipline: '=HYPERLINK("//evil.example","click")',
          type: "MC",
          difficulty: "Easy",
          question: "+1+1+cmd|/c calc",
          options: { A: "@SUM(1+1)", B: "B" },
          correct: "A",
          language: "English",
        },
      ];

      await saveQuestionsToSheets(VALID_URL, questions);

      const payload = JSON.parse(inputMock.value);
      const q = payload.questions[0];
      expect(q.Discipline.startsWith("'=HYPERLINK")).toBe(true);
      expect(q.Question.startsWith("'+1+1")).toBe(true);
      expect(q.OptionA.startsWith("'@SUM")).toBe(true);
    });
  });

  describe("assertAppsScriptUrl", () => {
    it("accepts a well-formed Apps Script URL", () => {
      const out = assertAppsScriptUrl(VALID_URL);
      expect(out).toBe(VALID_URL);
    });

    it.each([
      ["missing", ""],
      ["null", null],
      ["non-string", 42],
    ])("rejects %s input", (_label, input) => {
      expect(() => assertAppsScriptUrl(input)).toThrow(/not configured/);
    });

    it("rejects http:// (insecure scheme)", () => {
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      const insecure = "http://script.google.com/macros/s/AKfycbyID/exec";
      expect(() => assertAppsScriptUrl(insecure)).toThrow(/https/);
    });

    it("rejects javascript: scheme", () => {
      // eslint-disable-next-line sonarjs/code-eval
      const xss = "javascript:alert(1)";
      expect(() => assertAppsScriptUrl(xss)).toThrow();
    });

    it("rejects an attacker-controlled host that contains the substring", () => {
      expect(() =>
        assertAppsScriptUrl(
          "https://evil.example/script.google.com/macros/s/x/exec"
        )
      ).toThrow(/script\.google\.com/);
    });

    it("rejects the legitimate host with a wrong path", () => {
      expect(() =>
        assertAppsScriptUrl(
          "https://script.google.com/something-else?id=AKfycbyID"
        )
      ).toThrow(/macros\/s/);
    });

    it("rejects URL with extra path segments after /exec", () => {
      expect(() =>
        assertAppsScriptUrl(
          "https://script.google.com/macros/s/AKfycbyID/exec/dev"
        )
      ).toThrow(/macros\/s/);
    });
  });

  describe("clearQuestionsFromSheets", () => {
    it("should submit a clear action form", async () => {
      const formMock = {
        method: "",
        action: "",
        target: "",
        appendChild: vi.fn(),
        submit: vi.fn(),
      };
      const inputMock = { type: "", name: "", value: "" };

      createElementSpy.mockImplementation((tagName) => {
        if (tagName === "form") return formMock;
        if (tagName === "input") return inputMock;
        return {};
      });

      appendChildSpy.mockImplementation(() => {});
      removeChildSpy.mockImplementation(() => {});

      await clearQuestionsFromSheets(VALID_URL);

      expect(formMock.method).toBe("POST");
      // Check that action parameter is appended to URL
      expect(formMock.action).toContain("action=clear");
      expect(formMock.submit).toHaveBeenCalled();
    });

    it("alerts and returns without submitting when the URL is rejected", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      const formMock = {
        method: "",
        action: "",
        target: "",
        appendChild: vi.fn(),
        submit: vi.fn(),
      };
      createElementSpy.mockImplementation(() => formMock);
      appendChildSpy.mockImplementation(() => {});
      removeChildSpy.mockImplementation(() => {});

      await clearQuestionsFromSheets("https://evil.example/macros/s/x/exec");

      expect(alertSpy).toHaveBeenCalled();
      expect(formMock.submit).not.toHaveBeenCalled();
    });
  });
});
