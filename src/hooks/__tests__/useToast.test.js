import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast } from "../useToast";

describe("useToast", () => {
  describe("addToast", () => {
    it("should add a new toast", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast("Test message");
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe("Test message");
    });

    it("should not add duplicate messages", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast("Same message");
        result.current.addToast("Same message");
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it("should limit toasts to 3 maximum", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast("Message 1");
        result.current.addToast("Message 2");
        result.current.addToast("Message 3");
        result.current.addToast("Message 4");
      });

      expect(result.current.toasts).toHaveLength(3);
    });

    it("should replace matching pattern messages instead of stacking", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast("Score: 50/100");
      });

      const firstToastId = result.current.toasts[0].id;

      act(() => {
        result.current.addToast("Score: 75/100");
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe("Score: 75/100");
      expect(result.current.toasts[0].id).toBe(firstToastId); // Same toast, updated
    });

    it("should update existing toast with custom id", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast("Initial", { id: "custom-id" });
      });

      act(() => {
        result.current.addToast("Updated", { id: "custom-id" });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe("Updated");
    });
  });

  describe("removeToast", () => {
    it("should remove toast by id", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast("Test", { id: "remove-me" });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.removeToast("remove-me");
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe("updateProgress", () => {
    it("should update progress on existing toast", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast("Uploading", {
          id: "progress-toast",
          type: "progress",
          progress: 0,
        });
      });

      act(() => {
        result.current.updateProgress("progress-toast", 50, "Uploading 50%");
      });

      expect(result.current.toasts[0].progress).toBe(50);
      expect(result.current.toasts[0].message).toBe("Uploading 50%");
    });
  });

  describe("completeProgress", () => {
    it("should set progress to 100 and mark as success", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.addToast("Uploading", {
          id: "complete-toast",
          type: "progress",
          progress: 50,
        });
      });

      act(() => {
        result.current.completeProgress("complete-toast", "Upload complete!");
      });

      expect(result.current.toasts[0].progress).toBe(100);
      expect(result.current.toasts[0].type).toBe("success");
      expect(result.current.toasts[0].message).toBe("Upload complete!");
      expect(result.current.toasts[0].sticky).toBe(false);
    });
  });

  describe("showMessage (legacy API)", () => {
    it("should add toast with string type", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showMessage("Hello", "success");
      });

      expect(result.current.toasts[0].type).toBe("success");
    });

    it("should treat number as duration (backward compat)", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showMessage("Hello", 5000);
      });

      expect(result.current.toasts[0].duration).toBe(5000);
      expect(result.current.toasts[0].type).toBe("info");
    });

    it("should auto-detect error priority from message content", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showMessage("❌ Failed to save");
      });

      expect(result.current.toasts[0].type).toBe("error");
      expect(result.current.toasts[0].priority).toBe("high");
    });

    it("should auto-detect warning type from message content", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showMessage("⚠️ Connection unstable");
      });

      expect(result.current.toasts[0].type).toBe("warning");
    });

    it("should auto-detect success type from message content", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showMessage("✓ Saved successfully");
      });

      expect(result.current.toasts[0].type).toBe("success");
    });

    it("should auto-detect low priority for loading messages", () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showMessage("Loading...");
      });

      expect(result.current.toasts[0].priority).toBe("low");
    });
  });

  describe("pattern matching for replaceable messages", () => {
    const patterns = [
      { pattern: "Score: 85/100", description: "score updates" },
      { pattern: "Critiquing 5 questions", description: "critique progress" },
      {
        pattern: "Translating to Chinese (3/10)",
        description: "translation progress",
      },
      { pattern: "Generated 25 questions", description: "generation counts" },
      { pattern: "Processing 50 items", description: "processing progress" },
      { pattern: "Loading data", description: "loading states" },
      { pattern: "Saving changes", description: "saving states" },
      { pattern: "5 of 10 completed", description: "X of Y progress" },
    ];

    patterns.forEach(({ pattern, description }) => {
      it(`should replace ${description}: "${pattern}"`, () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.addToast(pattern);
        });

        const firstId = result.current.toasts[0].id;

        // Add a similar pattern message
        act(() => {
          result.current.addToast(pattern.replace(/\d+/, "99"));
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].id).toBe(firstId);
      });
    });
  });
});
