import { describe, it, expect } from "vitest";
import { validateDisplayName } from "../nameValidation";

// Mirror of the internal NAME_LIMITS constants in nameValidation.js. Kept here
// so the length-boundary tests still reference real values without requiring
// the module to re-export them.
const NAME_LIMITS = { MIN_LENGTH: 2, MAX_LENGTH: 50 };

describe("validateDisplayName", () => {
  describe("valid names", () => {
    it("accepts simple names", () => {
      expect(validateDisplayName("Sam").valid).toBe(true);
      expect(validateDisplayName("Sam Deiter").valid).toBe(true);
      expect(validateDisplayName("John Smith").valid).toBe(true);
    });

    it("accepts names with hyphens", () => {
      expect(validateDisplayName("Mary-Jane").valid).toBe(true);
      expect(validateDisplayName("Jean-Pierre Dupont").valid).toBe(true);
    });

    it("accepts names with apostrophes", () => {
      expect(validateDisplayName("O'Brien").valid).toBe(true);
      expect(validateDisplayName("D'Angelo").valid).toBe(true);
    });

    it("accepts international characters (Unicode)", () => {
      expect(validateDisplayName("José García").valid).toBe(true);
      expect(validateDisplayName("François Müller").valid).toBe(true);
      expect(validateDisplayName("Björk").valid).toBe(true);
      expect(validateDisplayName("田中太郎").valid).toBe(true);
      expect(validateDisplayName("김철수").valid).toBe(true);
    });

    it("returns sanitized name", () => {
      const result = validateDisplayName("  Sam  Deiter  ");
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("Sam Deiter");
    });
  });

  describe("invalid names - starts with special character or number", () => {
    it("rejects names starting with numbers", () => {
      const result = validateDisplayName("123Sam");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Name must start with a letter");
    });

    it("rejects names starting with special characters", () => {
      expect(validateDisplayName("@User").valid).toBe(false);
      expect(validateDisplayName("#TagPerson").valid).toBe(false);
      expect(validateDisplayName("$Money").valid).toBe(false);
      expect(validateDisplayName("-Dash").valid).toBe(false);
      expect(validateDisplayName(".Period").valid).toBe(false);
      expect(validateDisplayName("'Apostrophe").valid).toBe(false);
    });

    it("rejects names starting with spaces", () => {
      // After trim, if it's empty or starts incorrectly
      const result = validateDisplayName("   ");
      expect(result.valid).toBe(false);
    });
  });

  describe("invalid names - profanity filter", () => {
    it("rejects names containing profanity", () => {
      const result = validateDisplayName("John Fuck");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Name contains inappropriate language");
    });

    it("does not false-positive on partial matches", () => {
      // "assault" contains "ass" but is a legitimate word
      // Our filter uses whole-word matching
      expect(validateDisplayName("Cassandra").valid).toBe(true);
      expect(validateDisplayName("Dick Cheney").valid).toBe(false); // "Dick" is in list
    });
  });

  describe("invalid names - length limits", () => {
    it("rejects names too short", () => {
      const result = validateDisplayName("A");
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        `Name must be at least ${NAME_LIMITS.MIN_LENGTH} characters`
      );
    });

    it("rejects names too long", () => {
      const longName = "A".repeat(NAME_LIMITS.MAX_LENGTH + 1);
      const result = validateDisplayName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toBe(
        `Name cannot exceed ${NAME_LIMITS.MAX_LENGTH} characters`
      );
    });
  });

  describe("invalid names - special character rules", () => {
    it("rejects consecutive special characters", () => {
      expect(validateDisplayName("Mary--Jane").valid).toBe(false);
      expect(validateDisplayName("O''Brien").valid).toBe(false);
    });

    it("rejects names ending with special characters", () => {
      expect(validateDisplayName("Sam-").valid).toBe(false);
      expect(validateDisplayName("Sam.").valid).toBe(false);
      expect(validateDisplayName("Sam'").valid).toBe(false);
    });

    it("rejects disallowed characters", () => {
      expect(validateDisplayName("Sam@Deiter").valid).toBe(false);
      expect(validateDisplayName("Sam#123").valid).toBe(false);
      expect(validateDisplayName("Sam$Money").valid).toBe(false);
      expect(validateDisplayName("Sam!").valid).toBe(false);
    });
  });

  describe("spam pattern detection", () => {
    it("rejects common spam patterns", () => {
      expect(validateDisplayName("test123").valid).toBe(false);
      expect(validateDisplayName("user999").valid).toBe(false);
      expect(validateDisplayName("admin").valid).toBe(false);
      expect(validateDisplayName("guest42").valid).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles null and undefined", () => {
      expect(validateDisplayName(null).valid).toBe(false);
      expect(validateDisplayName(undefined).valid).toBe(false);
    });

    it("handles empty string", () => {
      expect(validateDisplayName("").valid).toBe(false);
    });

    it("handles non-string input", () => {
      // Should convert to string first
      const result = validateDisplayName(12345);
      expect(result.valid).toBe(false); // Starts with number
    });
  });
});
