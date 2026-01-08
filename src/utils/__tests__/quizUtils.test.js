/**
 * Tests for quizUtils.js - Quiz GUID and randomization utilities
 */
import { describe, it, expect } from "vitest";
import { generateGUID, createSeededRandom, seededShuffle } from "../quizUtils";

describe("quizUtils", () => {
  describe("generateGUID", () => {
    it("should generate a valid UUID v4 format", () => {
      const guid = generateGUID();
      // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(guid).toMatch(uuidRegex);
    });

    it("should generate unique GUIDs on each call", () => {
      const guids = new Set();
      for (let i = 0; i < 100; i++) {
        guids.add(generateGUID());
      }
      expect(guids.size).toBe(100);
    });

    it("should have the version 4 marker in position 13", () => {
      const guid = generateGUID();
      expect(guid.charAt(14)).toBe("4");
    });

    it("should have correct variant marker (8, 9, a, or b) in position 19", () => {
      const guid = generateGUID();
      expect(["8", "9", "a", "b"]).toContain(guid.charAt(19).toLowerCase());
    });

    it("should be 36 characters long", () => {
      const guid = generateGUID();
      expect(guid.length).toBe(36);
    });
  });

  describe("createSeededRandom", () => {
    it("should return a function", () => {
      const random = createSeededRandom("test-seed");
      expect(typeof random).toBe("function");
    });

    it("should return values between 0 and 1", () => {
      const random = createSeededRandom("test-seed");
      for (let i = 0; i < 100; i++) {
        const value = random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it("should produce the same sequence for the same seed", () => {
      const random1 = createSeededRandom("my-seed");
      const random2 = createSeededRandom("my-seed");

      const sequence1 = Array.from({ length: 10 }, () => random1());
      const sequence2 = Array.from({ length: 10 }, () => random2());

      expect(sequence1).toEqual(sequence2);
    });

    it("should produce different sequences for different seeds", () => {
      const random1 = createSeededRandom("seed-a");
      const random2 = createSeededRandom("seed-b");

      const sequence1 = Array.from({ length: 5 }, () => random1());
      const sequence2 = Array.from({ length: 5 }, () => random2());

      expect(sequence1).not.toEqual(sequence2);
    });
  });

  describe("seededShuffle", () => {
    it("should return an array of the same length", () => {
      const original = [1, 2, 3, 4, 5];
      const random = createSeededRandom("shuffle-test");
      const shuffled = seededShuffle(original, random);
      expect(shuffled.length).toBe(original.length);
    });

    it("should contain all original elements", () => {
      const original = ["a", "b", "c", "d", "e"];
      const random = createSeededRandom("shuffle-test");
      const shuffled = seededShuffle(original, random);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it("should not modify the original array", () => {
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];
      const random = createSeededRandom("shuffle-test");
      seededShuffle(original, random);
      expect(original).toEqual(originalCopy);
    });

    it("should produce consistent shuffles with same seed", () => {
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const random1 = createSeededRandom("consistent-shuffle");
      const shuffled1 = seededShuffle(original, random1);

      const random2 = createSeededRandom("consistent-shuffle");
      const shuffled2 = seededShuffle(original, random2);

      expect(shuffled1).toEqual(shuffled2);
    });

    it("should handle empty array", () => {
      const random = createSeededRandom("empty-test");
      const result = seededShuffle([], random);
      expect(result).toEqual([]);
    });

    it("should handle single element array", () => {
      const random = createSeededRandom("single-test");
      const result = seededShuffle([42], random);
      expect(result).toEqual([42]);
    });
  });
});
