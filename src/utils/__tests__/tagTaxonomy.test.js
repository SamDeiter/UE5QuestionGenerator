/**
 * tagTaxonomy - Tests for tag management utilities
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import {
  normalizeTag,
  validateTags,
  getMergedTags,
  getAllTags,
  TAGS_BY_DISCIPLINE,
} from "../tagTaxonomy";

describe("tagTaxonomy", () => {
  describe("TAGS_BY_DISCIPLINE", () => {
    it("has tags for multiple disciplines", () => {
      expect(Object.keys(TAGS_BY_DISCIPLINE).length).toBeGreaterThan(5);
    });

    it("each discipline has tags", () => {
      Object.values(TAGS_BY_DISCIPLINE).forEach((tags) => {
        expect(tags.length).toBeGreaterThan(0);
      });
    });

    it("all tags start with #", () => {
      Object.values(TAGS_BY_DISCIPLINE)
        .flat()
        .forEach((tag) => {
          expect(tag.startsWith("#")).toBe(true);
        });
    });
  });

  describe("normalizeTag", () => {
    it("adds # prefix if missing", () => {
      expect(normalizeTag("Blueprint")).toBe("#Blueprint");
    });

    it("keeps # prefix if present", () => {
      expect(normalizeTag("#Blueprint")).toBe("#Blueprint");
    });

    it("resolves aliases", () => {
      expect(normalizeTag("#VSM")).toBe("#VirtualShadowMaps");
      expect(normalizeTag("#GAS")).toBe("#GameplayAbilitySystem");
      expect(normalizeTag("#BP")).toBe("#Blueprint");
    });

    it("returns original if no alias", () => {
      expect(normalizeTag("#Nanite")).toBe("#Nanite");
    });
  });

  describe("validateTags", () => {
    it("validates tags against discipline", () => {
      const result = validateTags(["#Nanite", "#InvalidTag"], "Tech Art");
      expect(result.valid).toContain("#Nanite");
      expect(result.invalid).toContain("#InvalidTag");
    });

    it("returns normalized versions", () => {
      const result = validateTags(["VSM"], "Look Dev");
      expect(result.normalized).toContain("#VirtualShadowMaps");
    });

    it("allows cross-discipline tags", () => {
      // A tag valid in one discipline should be allowed in another
      const result = validateTags(["#Niagara"], "Tech Art");
      // #Niagara is in VFX, should still be valid
      expect(result.valid).toContain("#Niagara");
    });

    it("handles empty input", () => {
      const result = validateTags([], "Tech Art");
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });
  });

  describe("getMergedTags", () => {
    it("returns predefined tags for discipline", () => {
      const tags = getMergedTags("Tech Art");
      expect(tags).toContain("#Nanite");
    });

    it("merges custom tags", () => {
      const customTags = { "Tech Art": ["#CustomTag"] };
      const tags = getMergedTags("Tech Art", customTags);
      expect(tags).toContain("#CustomTag");
      expect(tags).toContain("#Nanite");
    });

    it("removes duplicates", () => {
      const customTags = { "Tech Art": ["#Nanite"] };
      const tags = getMergedTags("Tech Art", customTags);
      const naniteCount = tags.filter((t) => t === "#Nanite").length;
      expect(naniteCount).toBe(1);
    });

    it("returns empty array for unknown discipline", () => {
      const tags = getMergedTags("Unknown Discipline");
      expect(tags).toEqual([]);
    });
  });

  describe("getAllTags", () => {
    it("returns all unique tags", () => {
      const allTags = getAllTags();
      expect(allTags.length).toBeGreaterThan(50);
    });

    it("returns unique tags (no duplicates)", () => {
      const allTags = getAllTags();
      const unique = new Set(allTags);
      expect(unique.size).toBe(allTags.length);
    });

    it("all tags start with #", () => {
      getAllTags().forEach((tag) => {
        expect(tag.startsWith("#")).toBe(true);
      });
    });
  });
});
