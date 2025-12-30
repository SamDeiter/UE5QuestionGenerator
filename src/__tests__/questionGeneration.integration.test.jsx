/**
 * Integration Tests for Question Generation Flow
 * Tests the complete workflow of generating questions using AI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useGeneration } from "../hooks/useGeneration";
import * as geminiMock from "./mocks/gemini.mock";
import { mockQuestions } from "./testHelpers";

// Mock the gemini service
vi.mock("../services/gemini", async () => {
  return await import("./mocks/gemini.mock");
});

// Mock the geminiSecure service too
vi.mock("../services/geminiSecure", async () => {
  return await import("./mocks/gemini.mock");
});

// Mock the firebase service to prevent initialization side-effects
// Mock Firebase SDKs to allow service logic to run without initialization errors
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase/analytics", () => ({
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  Timestamp: { now: vi.fn(() => 12345) },
}));

vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));

// Mock the analytics store
vi.mock("../utils/analyticsStore", () => ({
  logGeneration: vi.fn(() => "gen-123"),
  logQuestion: vi.fn(),
}));

describe("Question Generation Integration Tests", () => {
  let mockConfig;
  let mockSetConfig;
  let mockShowMessage;
  let mockSetStatus;
  let mockSetShowNameModal;
  let mockSetShowAdvancedConfig;
  let mockSetShowApiError;
  let mockSetShowHistory;
  let mockCheckAndStoreQuestions;
  let mockAddQuestionsToState;
  let mockUpdateQuestionInState;
  let mockHandleLanguageSwitch;
  let mockGetFileContext;
  let translationMap;
  let allQuestionsMap;

  beforeEach(() => {
    // Reset mocks
    geminiMock.resetMock();

    // Setup mock config
    mockConfig = {
      creatorName: "TestUser",
      discipline: "Graphics",
      difficulty: "Medium",
      type: "Multiple Choice",
      language: "English",
      batchSize: 2,
      temperature: 0.7,
      model: "gemini-1.5-flash",
    };

    // Setup mock functions
    mockSetConfig = vi.fn();
    mockShowMessage = vi.fn();
    mockSetStatus = vi.fn();
    mockSetShowNameModal = vi.fn();
    mockSetShowAdvancedConfig = vi.fn();
    mockSetShowApiError = vi.fn();
    mockSetShowHistory = vi.fn();
    mockHandleLanguageSwitch = vi.fn();
    mockGetFileContext = vi.fn(() => "");

    mockCheckAndStoreQuestions = vi.fn(async (questions) => {
      // Simulate adding unique IDs and returning questions
      return questions.map((q) => ({
        ...q,
        id: Date.now() + Math.random(),
        uniqueId: `uid-${Date.now()}`,
        dateAdded: new Date().toISOString(),
        status: "pending",
        creatorName: mockConfig.creatorName,
      }));
    });

    mockAddQuestionsToState = vi.fn();
    mockUpdateQuestionInState = vi.fn();

    translationMap = new Map();
    allQuestionsMap = new Map();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Single Question Generation", () => {
    it("should generate a question successfully", async () => {
      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          mockSetConfig,
          "test-api-key",
          true, // isApiReady
          false, // isTargetMet
          5, // maxBatchSize
          mockGetFileContext,
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          mockSetShowNameModal,
          mockSetShowApiError,
          mockSetShowHistory,
          translationMap,
          allQuestionsMap
        )
      );

      expect(result.current.isGenerating).toBe(false);

      // Trigger generation
      await act(async () => {
        await result.current.handleGenerate();
      });

      // Wait for generation to complete
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      // Verify API was called
      expect(geminiMock.getCallCount()).toBe(1);

      // Verify questions were added to state
      expect(mockAddQuestionsToState).toHaveBeenCalled();
      const addedQuestions = mockAddQuestionsToState.mock.calls[0][0];
      expect(addedQuestions.length).toBeGreaterThan(0);
      expect(addedQuestions[0]).toHaveProperty("question");
      expect(addedQuestions[0]).toHaveProperty("difficulty");
      expect(addedQuestions[0]).toHaveProperty("type");

      // Verify status was updated
      expect(mockSetStatus).toHaveBeenCalledWith("Drafting Scenarios...");
      expect(mockSetStatus).toHaveBeenCalledWith("");
    });

    it("should not generate without creator name", async () => {
      const configWithoutName = { ...mockConfig, creatorName: "" };

      const { result } = renderHook(() =>
        useGeneration(
          configWithoutName,
          mockSetConfig,
          "test-api-key",
          true,
          false,
          5,
          mockGetFileContext,
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          mockSetShowNameModal,
          mockSetShowApiError,
          mockSetShowHistory,
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleGenerate();
      });

      // Should show error message
      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("Creator Name"),
        2500
      );
      expect(mockSetShowNameModal).toHaveBeenCalledWith(true);

      // Should not call API
      expect(geminiMock.getCallCount()).toBe(0);
    });

    it("should not generate without API key", async () => {
      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          mockSetConfig,
          "", // No API key
          false, // isApiReady = false
          false,
          5,
          mockGetFileContext,
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          mockSetShowNameModal,
          mockSetShowApiError,
          mockSetShowHistory,
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleGenerate();
      });

      // Should show error
      expect(mockSetShowApiError).toHaveBeenCalledWith(true);
      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("API key"),
        2500
      );

      // Should not call API
      expect(geminiMock.getCallCount()).toBe(0);
    });

    it("should handle API errors gracefully", async () => {
      // Simulate API error
      geminiMock.simulateError("Network timeout");

      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          mockSetConfig,
          "test-api-key",
          true,
          false,
          5,
          mockGetFileContext,
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          mockSetShowNameModal,
          mockSetShowApiError,
          mockSetShowHistory,
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      // Should show error message
      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("Network timeout"),
        4000
      );

      // Should set error status
      expect(mockSetStatus).toHaveBeenCalledWith("Error");

      // Should not add questions
      expect(mockAddQuestionsToState).not.toHaveBeenCalled();
    });
  });

  describe("Question Variations", () => {
    it("should generate variations of existing question", async () => {
      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          mockSetConfig,
          "test-api-key",
          true,
          false,
          5,
          mockGetFileContext,
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          mockSetShowNameModal,
          mockSetShowApiError,
          mockSetShowHistory,
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleVariate(mockQuestions.multipleChoice);
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      // Verify API was called
      expect(geminiMock.getCallCount()).toBe(1);
      const lastCall = geminiMock.getLastCall();
      expect(lastCall.userPrompt).toContain(
        mockQuestions.multipleChoice.question
      );

      // Verify variations were added
      expect(mockAddQuestionsToState).toHaveBeenCalled();
      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("variations"),
        1000
      );
    });

    it("should generate explanation for question", async () => {
      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          mockSetConfig,
          "test-api-key",
          true,
          false,
          5,
          mockGetFileContext,
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          mockSetShowNameModal,
          mockSetShowApiError,
          mockSetShowHistory,
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleExplain(mockQuestions.multipleChoice);
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      // Verify explanation was added to question
      expect(mockUpdateQuestionInState).toHaveBeenCalledWith(
        mockQuestions.multipleChoice.id,
        expect.any(Function)
      );

      // Verify status was cleared
      expect(mockSetStatus).toHaveBeenCalledWith("");
    });

    it("should generate critique for question", async () => {
      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          mockSetConfig,
          "test-api-key",
          true,
          false,
          5,
          mockGetFileContext,
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          mockSetShowNameModal,
          mockSetShowApiError,
          mockSetShowHistory,
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleCritique(mockQuestions.rejected);
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      // Verify critique was added
      expect(mockUpdateQuestionInState).toHaveBeenCalled();
      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("Critique Ready"),
        1500
      );
    });
  });

  describe("Token Usage Tracking", () => {
    it("should log token usage for successful generation", async () => {
      const { logGeneration } = await import("../utils/analyticsStore");

      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          mockSetConfig,
          "test-api-key",
          true,
          false,
          5,
          mockGetFileContext,
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          mockSetShowNameModal,
          mockSetShowApiError,
          mockSetShowHistory,
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      // Verify analytics were logged
      expect(logGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          discipline: "Graphics",
          difficulty: "Medium",
          success: true,
          tokensUsed: expect.objectContaining({
            input: expect.any(Number),
            output: expect.any(Number),
          }),
        })
      );
    });

    it("should log failed generation attempts", async () => {
      const { logGeneration } = await import("../utils/analyticsStore");
      geminiMock.simulateError("API Error");

      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          mockSetConfig,
          "test-api-key",
          true,
          false,
          5,
          mockGetFileContext,
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          mockSetShowNameModal,
          mockSetShowApiError,
          mockSetShowHistory,
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleGenerate();
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      // Verify failed generation was logged
      expect(logGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: "API Error",
          questionsGenerated: 0,
        })
      );
    });
  });
});
