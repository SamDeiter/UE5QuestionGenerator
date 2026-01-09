import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuestionGenerator } from "../useQuestionGenerator";
import * as geminiSecure from "../../../services/geminiSecure";
import * as analyticsStore from "../../../utils/analyticsStore";
import * as quotaEnforcement from "../../../utils/quotaEnforcement";
import * as generationUtils from "../../../utils/generationUtils";
import {
  GENERATION_LIMITS,
  QUALITY_THRESHOLDS,
} from "../../../utils/constants";

// Mock dependencies
vi.mock("../../../services/geminiSecure");
vi.mock("../../../utils/analyticsStore");
vi.mock("../../../utils/quotaEnforcement");
vi.mock("../../../utils/generationUtils");
vi.mock("../../../utils/parserUtils", () => ({
  parseQuestions: vi.fn(),
  convertMCtoTF: vi.fn(),
}));
vi.mock("../../../utils/tokenCounter", () => ({
  analyzeRequest: vi.fn(() => ({
    input: { total: 100 },
    cost: { estimated: 0.01 },
  })),
  estimateTokens: vi.fn(() => 50),
}));
vi.mock("../../../services/promptBuilder", () => ({
  constructSystemPrompt: vi.fn(() => "System Prompt"),
}));
vi.mock("../../../utils/questionValidator", () => ({
  validateQuestion: vi.fn(() => ({ isCriticalFailure: false })),
}));

// Mock logger to avoid console noise
vi.mock("../../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("useQuestionGenerator", () => {
  let mockProps;
  let mockParserUtils;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked modules to setup return values
    mockParserUtils = await import("../../../utils/parserUtils");

    mockProps = {
      config: {
        discipline: "Tech Art",
        difficulty: "Beginner",
        batchSize: 5,
        type: "Multiple Choice",
        language: "English",
        creatorName: "TestCreator",
        apiKey: "test-key",
      },
      effectiveApiKey: "test-key",
      isApiReady: true,
      isTargetMet: false,
      allQuestionsMap: new Map(),
      showMessage: vi.fn(),
      setStatus: vi.fn(),
      setShowNameModal: vi.fn(),
      setShowApiError: vi.fn(),
      setShowHistory: vi.fn(),
      getFileContext: vi.fn(() => []),
      checkAndStoreQuestions: vi.fn((qs) => Promise.resolve(qs)), // Identity
      addQuestionsToState: vi.fn(),
      updateQuestionInState: vi.fn(),
      setIsProcessing: vi.fn(),
    };

    // Default mock implementations
    analyticsStore.logGeneration.mockReturnValue("gen-123");
    quotaEnforcement.validateGeneration.mockReturnValue({
      // Default allow
      allowed: true,
      maxAllowed: 5,
      reason: "Allowed",
    });
    generationUtils.calculateCoverageGaps.mockReturnValue({
      zeroTags: [],
      lowTags: [],
    });
    generationUtils.enrichGeneratedQuestions.mockImplementation(
      (questions) => questions
    );
    generationUtils.filterForbiddenSources.mockImplementation(
      (questions) => questions
    );
    generationUtils.verifyAndProcessQuestions.mockImplementation(
      (questions) => questions
    );

    mockParserUtils.parseQuestions.mockReturnValue([
      { question: "Q1", options: { A: "1", B: "2" }, correct: "A" },
    ]);

    geminiSecure.generateContentSecure.mockResolvedValue("Mock API Response");
  });

  it("should initialize with isGenerating false", () => {
    const { result } = renderHook(() => useQuestionGenerator(mockProps));
    expect(result.current.isGenerating).toBe(false);
  });

  it("should warn if creatorName is missing", async () => {
    mockProps.config.creatorName = "";
    const { result } = renderHook(() => useQuestionGenerator(mockProps));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(mockProps.showMessage).toHaveBeenCalledWith(
      expect.stringContaining("enter your Creator Name"),
      expect.any(Number)
    );
    expect(mockProps.setShowNameModal).toHaveBeenCalledWith(true);
    expect(geminiSecure.generateContentSecure).not.toHaveBeenCalled();
  });

  it("should warn if API key is missing/not ready", async () => {
    mockProps.isApiReady = false;
    const { result } = renderHook(() => useQuestionGenerator(mockProps));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(mockProps.showMessage).toHaveBeenCalledWith(
      expect.stringContaining("API key is required"),
      expect.any(Number)
    );
    expect(mockProps.setShowApiError).toHaveBeenCalledWith(true);
    expect(geminiSecure.generateContentSecure).not.toHaveBeenCalled();
  });

  it("should block generation if isTargetMet is true", async () => {
    mockProps.isTargetMet = true;
    const { result } = renderHook(() => useQuestionGenerator(mockProps));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(mockProps.showMessage).toHaveBeenCalledWith(
      expect.stringContaining("Quota met"),
      expect.any(Number)
    );
    expect(geminiSecure.generateContentSecure).not.toHaveBeenCalled();
  });

  it("should block generation if quotaEnforcement returns not allowed", async () => {
    quotaEnforcement.validateGeneration.mockReturnValue({
      allowed: false,
      reason: "Detailed quota reason",
    });

    const { result } = renderHook(() => useQuestionGenerator(mockProps));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(mockProps.showMessage).toHaveBeenCalledWith(
      "Detailed quota reason",
      expect.any(Number)
    );
    expect(geminiSecure.generateContentSecure).not.toHaveBeenCalled();
  });

  it("should reduce batch size if quota warning exists", async () => {
    quotaEnforcement.validateGeneration.mockReturnValue({
      allowed: true,
      warning: true,
      maxAllowed: 2, // Less than config 5
      reason: "Partial quota",
    });

    const { result } = renderHook(() => useQuestionGenerator(mockProps));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(mockProps.showMessage).toHaveBeenCalledWith(
      expect.stringContaining("Batch size reduced to 2"),
      expect.any(Number)
    );
    // Should still proceed
    expect(geminiSecure.generateContentSecure).toHaveBeenCalled();
  });

  it("should handle successful generation flow", async () => {
    const { result } = renderHook(() => useQuestionGenerator(mockProps));

    await act(async () => {
      await result.current.handleGenerate();
    });

    // setIsGenerating is internal state, so we can't check mockProps.setIsGenerating
    expect(mockProps.setStatus).toHaveBeenCalledWith("Drafting Scenarios...");
    expect(geminiSecure.generateContentSecure).toHaveBeenCalled();
    expect(mockProps.addQuestionsToState).toHaveBeenCalled();
    expect(analyticsStore.logGeneration).toHaveBeenCalled();
  });

  it("should handle parsing failure (no questions returned)", async () => {
    mockParserUtils.parseQuestions.mockReturnValue([]); // Empty

    const { result } = renderHook(() => useQuestionGenerator(mockProps));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(mockProps.showMessage).toHaveBeenCalledWith(
      expect.stringContaining("Error: Failed to parse questions"),
      expect.any(Number)
    );
    expect(mockProps.addQuestionsToState).not.toHaveBeenCalled();
    expect(mockProps.setStatus).toHaveBeenCalledWith("Error");
  });

  it("should handle API error", async () => {
    geminiSecure.generateContentSecure.mockRejectedValue(new Error("API Fail"));
    const { result } = renderHook(() => useQuestionGenerator(mockProps));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(mockProps.showMessage).toHaveBeenCalledWith(
      "Error: API Fail",
      expect.any(Number)
    );
    expect(mockProps.setStatus).toHaveBeenCalledWith("Error");
  });

  describe("handleAutoCritique", () => {
    it("should process questions in batches and update state", async () => {
      geminiSecure.generateCritiqueSecure.mockResolvedValue({
        score: 80,
        text: "Good job",
        rewrite: null,
        changes: null,
      });

      const questions = [{ id: "q1" }, { id: "q2" }];

      const { result } = renderHook(() => useQuestionGenerator(mockProps));

      await act(async () => {
        await result.current.handleAutoCritique(questions);
      });

      expect(mockProps.setStatus).toHaveBeenCalledWith("Auto-critiquing...");
      // Batch size is 3, so for 2 questions, it runs in one batch.
      // It calls critiqueQuestion for each question.
      expect(geminiSecure.generateCritiqueSecure).toHaveBeenCalledTimes(2);
      expect(mockProps.updateQuestionInState).toHaveBeenCalledTimes(2);
    });

    it("should handle rewrite suggestions in critique", async () => {
      geminiSecure.generateCritiqueSecure.mockResolvedValue({
        score: 50,
        text: "Needs improvement",
        rewrite: { question: "Better Q" },
        changes: "Fixed grammar",
      });
      geminiSecure.generateTagsSecure.mockResolvedValue(["NewTag"]);

      const questions = [{ id: "q1", tags: ["OldTag"] }];
      const { result } = renderHook(() => useQuestionGenerator(mockProps));

      await act(async () => {
        await result.current.handleAutoCritique(questions);
      });

      // 1 tag < 3 min tags, so it should generate tags
      expect(geminiSecure.generateTagsSecure).toHaveBeenCalled();
      expect(mockProps.updateQuestionInState).toHaveBeenCalledWith(
        "q1",
        expect.any(Function)
      );
    });
  });

  describe("handleExplain", () => {
    it("should call generateContent and update question", async () => {
      const question = {
        id: "q1",
        question: "Test?",
        options: { A: "Ans" },
        correct: "A",
      };
      const { result } = renderHook(() => useQuestionGenerator(mockProps));

      await act(async () => {
        await result.current.handleExplain(question);
      });

      expect(mockProps.setIsProcessing).toHaveBeenCalledWith(true);
      expect(mockProps.setStatus).toHaveBeenCalledWith("Explaining...");
      expect(geminiSecure.generateContentSecure).toHaveBeenCalled();
      expect(mockProps.updateQuestionInState).toHaveBeenCalledWith(
        "q1",
        expect.any(Function)
      );
    });
  });

  describe("handleVariate", () => {
    it("should call generateContent and add new questions", async () => {
      const question = {
        id: "q1",
        question: "Test?",
        options: { A: "Ans" },
        correct: "A",
        discipline: "Tech Art",
        difficulty: "Easy",
        type: "MC",
      };

      // Ensure parseQuestions returns valid new questions for this specific test
      mockParserUtils.parseQuestions.mockReturnValueOnce([
        { question: "Variation 1", options: { A: "1" }, correct: "A" },
      ]);

      const { result } = renderHook(() => useQuestionGenerator(mockProps));

      await act(async () => {
        await result.current.handleVariate(question);
      });

      expect(mockProps.setIsProcessing).toHaveBeenCalledWith(true);
      expect(mockProps.setStatus).toHaveBeenCalledWith(
        "Creating improved variations..."
      );
      expect(geminiSecure.generateContentSecure).toHaveBeenCalled();
      expect(mockProps.checkAndStoreQuestions).toHaveBeenCalled();
      expect(mockProps.addQuestionsToState).toHaveBeenCalled();
    });
  });
});
