/**
 * User Repository Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../firebaseQueries", () => ({
  saveCustomTags: vi.fn(),
  getCustomTags: vi.fn(),
}));

import * as firebaseQueries from "../../firebaseQueries";
import { users } from "../userRepository";

describe("userRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCustomTags", () => {
    it("is bound to firebaseQueries.getCustomTags", () => {
      expect(users.getCustomTags).toBe(firebaseQueries.getCustomTags);
    });
  });

  describe("saveCustomTags", () => {
    it("is bound to firebaseQueries.saveCustomTags", () => {
      expect(users.saveCustomTags).toBe(firebaseQueries.saveCustomTags);
    });
  });

  describe("addCustomTag", () => {
    it("adds tag to existing discipline", async () => {
      firebaseQueries.getCustomTags.mockResolvedValue({
        Blueprint: ["Events"],
      });
      firebaseQueries.saveCustomTags.mockResolvedValue();

      await users.addCustomTag("Blueprint", "Functions");

      expect(firebaseQueries.saveCustomTags).toHaveBeenCalledWith({
        Blueprint: ["Events", "Functions"],
      });
    });

    it("creates new discipline array if not exists", async () => {
      firebaseQueries.getCustomTags.mockResolvedValue({});
      firebaseQueries.saveCustomTags.mockResolvedValue();

      await users.addCustomTag("Animation", "StateMachine");

      expect(firebaseQueries.saveCustomTags).toHaveBeenCalledWith({
        Animation: ["StateMachine"],
      });
    });

    it("does not add duplicate tag", async () => {
      firebaseQueries.getCustomTags.mockResolvedValue({
        Blueprint: ["Events"],
      });

      await users.addCustomTag("Blueprint", "Events");

      expect(firebaseQueries.saveCustomTags).not.toHaveBeenCalled();
    });
  });

  describe("removeCustomTag", () => {
    it("removes tag from discipline", async () => {
      firebaseQueries.getCustomTags.mockResolvedValue({
        Blueprint: ["Events", "Functions"],
      });
      firebaseQueries.saveCustomTags.mockResolvedValue();

      await users.removeCustomTag("Blueprint", "Events");

      expect(firebaseQueries.saveCustomTags).toHaveBeenCalledWith({
        Blueprint: ["Functions"],
      });
    });
  });
});
