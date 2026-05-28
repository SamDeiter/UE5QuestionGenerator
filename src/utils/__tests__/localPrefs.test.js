/**
 * localPrefs - Tests for localStorage wrapper utilities
 * Uses jsdom environment for localStorage mocking
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { setLocalPref, getLocalPref } from "../localPrefs";

describe("localPrefs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("setLocalPref", () => {
    it("stores string value", () => {
      setLocalPref("test-key", "test-value");
      expect(localStorage.getItem("test-key")).toBe('"test-value"');
    });

    it("stores object value as JSON", () => {
      setLocalPref("test-obj", { foo: "bar" });
      const stored = localStorage.getItem("test-obj");
      expect(JSON.parse(stored)).toEqual({ foo: "bar" });
    });

    it("stores array value", () => {
      setLocalPref("test-arr", [1, 2, 3]);
      const stored = localStorage.getItem("test-arr");
      expect(JSON.parse(stored)).toEqual([1, 2, 3]);
    });

    it("stores null value", () => {
      setLocalPref("test-null", null);
      expect(localStorage.getItem("test-null")).toBe("null");
    });
  });

  describe("getLocalPref", () => {
    it("retrieves stored string", () => {
      localStorage.setItem("test-key", '"test-value"');
      expect(getLocalPref("test-key")).toBe("test-value");
    });

    it("retrieves stored object", () => {
      localStorage.setItem("test-obj", '{"foo":"bar"}');
      expect(getLocalPref("test-obj")).toEqual({ foo: "bar" });
    });

    it("returns null for missing key", () => {
      expect(getLocalPref("nonexistent")).toBeNull();
    });

    it("returns null for invalid JSON", () => {
      localStorage.setItem("invalid", "not-valid-json");
      expect(getLocalPref("invalid")).toBeNull();
    });
  });

  describe("roundtrip", () => {
    it("stores and retrieves config object", () => {
      const config = {
        apiKey: "test-key",
        discipline: "Blueprint",
        settings: { autoSave: true },
      };
      setLocalPref("config", config);
      expect(getLocalPref("config")).toEqual(config);
    });

    it("handles complex nested objects", () => {
      const data = {
        users: [
          { name: "Alice", age: 30 },
          { name: "Bob", age: 25 },
        ],
        metadata: { version: 1 },
      };
      setLocalPref("complex", data);
      expect(getLocalPref("complex")).toEqual(data);
    });
  });
});
