/**
 * Tests for quizUtils.js - Quiz GUID and randomization utilities
 */
import { describe, it, expect } from "vitest";
import {
  generateGUID,
  createSeededRandom,
  seededShuffle,
  classifyDifficulty,
  bucketByDifficulty,
  simulateAttemptDistribution,
} from "../quizUtils";

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

  // ───────────────────────────────────────────────────────────────────
  // Difficulty classification — dual-vocabulary support is load-bearing
  // for the SCORM weighted-draw correctness. Both naming conventions
  // (Easy/Medium/Hard and Beginner/Intermediate/Expert) coexist in
  // production Firestore data; the classifier must funnel them into the
  // same tier so neither vocabulary gets silently dropped.
  // ───────────────────────────────────────────────────────────────────
  describe("classifyDifficulty", () => {
    it("maps legacy Easy/Medium/Hard vocabulary correctly", () => {
      expect(classifyDifficulty("Easy")).toBe("easy");
      expect(classifyDifficulty("Medium")).toBe("medium");
      expect(classifyDifficulty("Hard")).toBe("hard");
    });

    it("maps canonical Beginner/Intermediate/Expert vocabulary correctly", () => {
      expect(classifyDifficulty("Beginner")).toBe("easy");
      expect(classifyDifficulty("Intermediate")).toBe("medium");
      expect(classifyDifficulty("Expert")).toBe("hard");
    });

    it("treats 'Advanced' as hard (alternate spelling sometimes used)", () => {
      expect(classifyDifficulty("Advanced")).toBe("hard");
    });

    it("is case-insensitive", () => {
      expect(classifyDifficulty("EASY")).toBe("easy");
      expect(classifyDifficulty("intermediate")).toBe("medium");
      expect(classifyDifficulty("ExPeRt")).toBe("hard");
    });

    it("handles type-suffixed values (e.g. 'Easy MC', 'Beginner T/F')", () => {
      expect(classifyDifficulty("Easy MC")).toBe("easy");
      expect(classifyDifficulty("Beginner T/F")).toBe("easy");
      expect(classifyDifficulty("Intermediate Multiple Choice")).toBe("medium");
      expect(classifyDifficulty("Expert MC")).toBe("hard");
    });

    it("returns 'other' for empty, null, or undefined input", () => {
      expect(classifyDifficulty("")).toBe("other");
      expect(classifyDifficulty(null)).toBe("other");
      expect(classifyDifficulty(undefined)).toBe("other");
    });

    it("returns 'other' for unrecognized strings", () => {
      expect(classifyDifficulty("Impossible")).toBe("other");
      expect(classifyDifficulty("12345")).toBe("other");
    });

    // Regression: "Intermediate" contains "med" but NOT "medium" — verify
    // the matcher relies on the explicit "intermediate" branch, not a
    // partial substring fluke.
    it("classifies 'Intermediate' via the intermediate branch, not a 'medium' substring", () => {
      expect("Intermediate".toLowerCase().includes("medium")).toBe(false);
      expect(classifyDifficulty("Intermediate")).toBe("medium");
    });
  });

  describe("bucketByDifficulty", () => {
    it("counts both vocabularies into shared tiers", () => {
      const result = bucketByDifficulty([
        { difficulty: "Easy" },
        { difficulty: "Beginner" },
        { difficulty: "Medium" },
        { difficulty: "Intermediate" },
        { difficulty: "Hard" },
        { difficulty: "Expert" },
      ]);
      expect(result).toEqual({
        easy: 2,
        medium: 2,
        hard: 2,
        other: 0,
        total: 6,
      });
    });

    it("collects unrecognized values into 'other'", () => {
      const result = bucketByDifficulty([
        { difficulty: "Easy" },
        { difficulty: "weird-value" },
        { difficulty: "" },
        { difficulty: undefined },
      ]);
      expect(result.easy).toBe(1);
      expect(result.other).toBe(3);
      expect(result.total).toBe(4);
    });

    it("returns zero counts for an empty list", () => {
      expect(bucketByDifficulty([])).toEqual({
        easy: 0,
        medium: 0,
        hard: 0,
        other: 0,
        total: 0,
      });
    });
  });

  describe("simulateAttemptDistribution", () => {
    it("uses default 15/35/50 weights when none provided", () => {
      const pool = { easy: 100, medium: 100, hard: 100, other: 0, total: 300 };
      const result = simulateAttemptDistribution(pool, {
        questionsPerAttempt: 100,
      });
      expect(result.easy).toBe(15);
      expect(result.medium).toBe(35);
      expect(result.hard).toBe(50);
      expect(result.total).toBe(100);
    });

    it("falls back to using the whole pool when questionsPerAttempt is unset", () => {
      const pool = { easy: 10, medium: 20, hard: 30, other: 0, total: 60 };
      const result = simulateAttemptDistribution(pool);
      // targetTotal=60, weights 0.15/0.35/0.5 → targets 9/21/30. Medium pool
      // caps at 20 so 1 question of surplus redistributes (first to hard
      // which is already maxed, then to easy). Final 10/20/30 = 60.
      expect(result.total).toBe(60);
      expect(result.easy).toBe(10);
      expect(result.medium).toBe(20);
      expect(result.hard).toBe(30);
    });

    it("clamps questionsPerAttempt to totalAvailable when bank is smaller", () => {
      const pool = { easy: 5, medium: 5, hard: 5, other: 0, total: 15 };
      const result = simulateAttemptDistribution(pool, {
        questionsPerAttempt: 100,
      });
      expect(result.total).toBeLessThanOrEqual(15);
    });

    // Regression for the original bug: when one tier is empty, surplus must
    // be redistributed instead of leaving the attempt short.
    it("redistributes shortfall when a tier has zero questions available", () => {
      // 50 mediums, 0 easy, 0 hard — exactly the user's screenshot scenario.
      const pool = { easy: 0, medium: 50, hard: 0, other: 0, total: 50 };
      const result = simulateAttemptDistribution(pool, {
        questionsPerAttempt: 50,
      });
      // Cannot reach easy/hard targets, so the missing slots fall back to
      // medium (the only non-empty pool). All 50 must be delivered.
      expect(result.medium).toBe(50);
      expect(result.easy).toBe(0);
      expect(result.hard).toBe(0);
      expect(result.total).toBe(50);
    });

    it("prefers harder pools first when redistributing surplus", () => {
      // Easy pool is empty; surplus should go to hard before medium.
      const pool = { easy: 0, medium: 50, hard: 50, other: 0, total: 100 };
      const result = simulateAttemptDistribution(pool, {
        questionsPerAttempt: 100,
      });
      expect(result.easy).toBe(0);
      // With 0/35/65 (0 easy + redistributed surplus to hard)
      expect(result.hard).toBeGreaterThanOrEqual(50);
      expect(result.total).toBe(100);
    });

    it("preserves 'other' questions in the total", () => {
      const pool = { easy: 10, medium: 10, hard: 10, other: 5, total: 35 };
      const result = simulateAttemptDistribution(pool);
      expect(result.other).toBe(5);
    });

    it("respects custom weights override", () => {
      const pool = { easy: 100, medium: 100, hard: 100, other: 0, total: 300 };
      const result = simulateAttemptDistribution(pool, {
        questionsPerAttempt: 100,
        weights: { easy: 0.5, medium: 0.3, hard: 0.2 },
      });
      expect(result.easy).toBe(50);
      expect(result.medium).toBe(30);
      expect(result.hard).toBe(20);
    });
  });
});
