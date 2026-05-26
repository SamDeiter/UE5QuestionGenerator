/**
 * tagTaxonomy - Tests for tag management utilities
 * Pure functions, no React dependencies
 */
import { describe, it, expect } from "vitest";
import {
  normalizeTag,
  getMergedTags,
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
});
