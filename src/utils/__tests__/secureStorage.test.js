/**
 * secureStorage - Tests for localStorage wrapper utilities
 * Uses jsdom environment for localStorage mocking
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setSecureItem, getSecureItem } from "../secureStorage";

describe("secureStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("setSecureItem", () => {
    it("stores string value", () => {
      setSecureItem("test-key", "test-value");
      expect(localStorage.getItem("test-key")).toBe('"test-value"');
    });

    it("stores object value as JSON", () => {
      setSecureItem("test-obj", { foo: "bar" });
      const stored = localStorage.getItem("test-obj");
      expect(JSON.parse(stored)).toEqual({ foo: "bar" });
    });

    it("stores array value", () => {
      setSecureItem("test-arr", [1, 2, 3]);
      const stored = localStorage.getItem("test-arr");
      expect(JSON.parse(stored)).toEqual([1, 2, 3]);
    });

    it("stores null value", () => {
      setSecureItem("test-null", null);
      expect(localStorage.getItem("test-null")).toBe("null");
    });
  });

  describe("getSecureItem", () => {
    it("retrieves stored string", () => {
      localStorage.setItem("test-key", '"test-value"');
      expect(getSecureItem("test-key")).toBe("test-value");
    });

    it("retrieves stored object", () => {
      localStorage.setItem("test-obj", '{"foo":"bar"}');
      expect(getSecureItem("test-obj")).toEqual({ foo: "bar" });
    });

    it("returns null for missing key", () => {
      expect(getSecureItem("nonexistent")).toBeNull();
    });

    it("returns null for invalid JSON", () => {
      localStorage.setItem("invalid", "not-valid-json");
      expect(getSecureItem("invalid")).toBeNull();
    });
  });

  describe("roundtrip", () => {
    it("stores and retrieves config object", () => {
      const config = {
        apiKey: "test-key",
        discipline: "Blueprint",
        settings: { autoSave: true },
      };
      setSecureItem("config", config);
      expect(getSecureItem("config")).toEqual(config);
    });

    it("handles complex nested objects", () => {
      const data = {
        users: [
          { name: "Alice", age: 30 },
          { name: "Bob", age: 25 },
        ],
        metadata: { version: 1 },
      };
      setSecureItem("complex", data);
      expect(getSecureItem("complex")).toEqual(data);
    });
  });
});
