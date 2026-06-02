/**
 * useQuestionDetailHydration — Tier 3b lazy detail-field fill.
 *
 * These tests pin the behaviors that make the compact-index flip safe:
 *   • keyed on the DOC ID (q.id), so a translation variant pulls its OWN
 *     per-language source (not the English doc's),
 *   • merges ONLY the missing detail fields (never clobbers in-memory state),
 *   • a complete no-op when USE_INDEX is false,
 *   • skips questions that already carry every detail field, and dedups.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mutable flag so we can exercise both the on- and off-index paths. The hook
// reads the live binding inside its effect, so the getter is re-evaluated.
let mockUseIndex = true;
const getFullQuestionDoc = vi.fn();

vi.mock("../../services/firebase", () => ({
  get USE_INDEX() {
    return mockUseIndex;
  },
  getFullQuestionDoc: (...args) => getFullQuestionDoc(...args),
}));

vi.mock("../../utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { useQuestionDetailHydration } from "../useQuestionDetailHydration";

// A full doc carrying all 5 detail fields the index omits.
const fullDoc = (id, over = {}) => ({
  id,
  uniqueId: id.split("_")[0],
  question: "Q",
  options: { A: "a", B: "b" },
  correct: "A",
  sourceExcerpt: `excerpt-${id}`,
  sourceUrl: `https://docs/${id}`,
  explanation: `why-${id}`,
  groundingSources: [{ url: "g" }],
  editHistory: [{ at: 1 }],
  ...over,
});

// An index doc: same as full minus the 5 omitted fields.
const indexDoc = (id, over = {}) => {
  const q = fullDoc(id, over);
  delete q.sourceExcerpt;
  delete q.sourceUrl;
  delete q.explanation;
  delete q.groundingSources;
  delete q.editHistory;
  return q;
};

describe("useQuestionDetailHydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIndex = true;
  });

  it("fetches by DOC ID and merges only the missing detail fields", async () => {
    const q = indexDoc("uid-1");
    getFullQuestionDoc.mockResolvedValue(fullDoc("uid-1"));
    const merge = vi.fn();

    renderHook(() => useQuestionDetailHydration([q], merge));

    await waitFor(() => expect(merge).toHaveBeenCalledTimes(1));
    // Keyed on q.id, NOT q.uniqueId (here they're equal, but the call site
    // must pass the doc id).
    expect(getFullQuestionDoc).toHaveBeenCalledWith("uid-1");
    const [id, patch] = merge.mock.calls[0];
    expect(id).toBe("uid-1");
    expect(patch).toEqual({
      sourceExcerpt: "excerpt-uid-1",
      sourceUrl: "https://docs/uid-1",
      explanation: "why-uid-1",
      groundingSources: [{ url: "g" }],
      editHistory: [{ at: 1 }],
    });
  });

  it("keys a translation variant on its `{uniqueId}_{lang}` doc id", async () => {
    const variant = indexDoc("uid-1_Korean", { language: "Korean" });
    getFullQuestionDoc.mockResolvedValue(
      fullDoc("uid-1_Korean", { language: "Korean" })
    );
    const merge = vi.fn();

    renderHook(() => useQuestionDetailHydration(variant, merge));

    await waitFor(() => expect(merge).toHaveBeenCalledTimes(1));
    // Must request the variant's own doc — not the bare English uniqueId.
    expect(getFullQuestionDoc).toHaveBeenCalledWith("uid-1_Korean");
    expect(getFullQuestionDoc).not.toHaveBeenCalledWith("uid-1");
    expect(merge.mock.calls[0][1].sourceExcerpt).toBe("excerpt-uid-1_Korean");
  });

  it("does NOT overwrite a detail field already present in memory", async () => {
    // Locally-edited excerpt must survive — only the genuinely-absent fields
    // get filled.
    const q = indexDoc("uid-2");
    q.sourceExcerpt = "user-edited";
    getFullQuestionDoc.mockResolvedValue(fullDoc("uid-2"));
    const merge = vi.fn();

    renderHook(() => useQuestionDetailHydration([q], merge));

    await waitFor(() => expect(merge).toHaveBeenCalledTimes(1));
    const patch = merge.mock.calls[0][1];
    expect(patch).not.toHaveProperty("sourceExcerpt");
    expect(patch.sourceUrl).toBe("https://docs/uid-2");
  });

  it("is a no-op when USE_INDEX is false", async () => {
    mockUseIndex = false;
    const q = indexDoc("uid-3");
    const merge = vi.fn();

    renderHook(() => useQuestionDetailHydration([q], merge));

    await new Promise((r) => setTimeout(r, 20));
    expect(getFullQuestionDoc).not.toHaveBeenCalled();
    expect(merge).not.toHaveBeenCalled();
  });

  it("skips questions that already carry every detail field", async () => {
    const q = fullDoc("uid-4"); // complete already
    const merge = vi.fn();

    renderHook(() => useQuestionDetailHydration([q], merge));

    await new Promise((r) => setTimeout(r, 20));
    expect(getFullQuestionDoc).not.toHaveBeenCalled();
    expect(merge).not.toHaveBeenCalled();
  });

  it("requests each doc id only once across re-renders", async () => {
    const q = indexDoc("uid-5");
    getFullQuestionDoc.mockResolvedValue(fullDoc("uid-5"));
    const merge = vi.fn();

    const { rerender } = renderHook(
      ({ list }) => useQuestionDetailHydration(list, merge),
      { initialProps: { list: [q] } }
    );
    await waitFor(() => expect(merge).toHaveBeenCalledTimes(1));

    // Re-render with a new array identity but the same doc id.
    rerender({ list: [{ ...q }] });
    await new Promise((r) => setTimeout(r, 20));
    expect(getFullQuestionDoc).toHaveBeenCalledTimes(1);
  });
});
