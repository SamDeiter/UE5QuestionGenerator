/**
 * Translation Integration Tests
 *
 * Tests the translation workflow using the useGeneration hook
 * and mocked Gemini API.
 *
 * NOTE: Uses Math.random in mock functions for unique test IDs - non-security.
 */
/* eslint-disable sonarjs/pseudo-random */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGeneration } from "../hooks/useGeneration";
import * as geminiMock from "./mocks/gemini.mock";

// Mock the gemini service to use our manual mock
vi.mock("../services/gemini", async () => {
  return await import("./mocks/gemini.mock");
});

// Mock the geminiSecure service too since useGeneration uses that
vi.mock("../services/geminiSecure", async () => {
  return await import("./mocks/gemini.mock");
});

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

// Mock analytics
vi.mock("../utils/analyticsStore", () => ({
  logGeneration: vi.fn(() => "gen-123"),
  logQuestion: vi.fn(),
}));

describe("Translation Integration Tests", () => {
  let mockConfig;
  let mockShowMessage;
  let mockSetStatus;
  let mockCheckAndStoreQuestions;
  let mockAddQuestionsToState;
  let mockUpdateQuestionInState;
  let mockHandleLanguageSwitch;
  let translationMap;
  let allQuestionsMap;

  beforeEach(() => {
    geminiMock.resetMock();

    mockConfig = {
      creatorName: "TestUser",
      discipline: "Graphics",
      difficulty: "Medium",
      type: "Multiple Choice",
      language: "English",
      batchSize: 2,
    };

    mockShowMessage = vi.fn();
    mockSetStatus = vi.fn();
    mockHandleLanguageSwitch = vi.fn();

    mockCheckAndStoreQuestions = vi.fn(async (questions) => {
      return questions.map((q) => ({
        ...q,
        id: Date.now() + Math.random(),
        dateAdded: new Date().toISOString(),
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

  describe("Single Question Translation", () => {
    it("should translate a question to target language", async () => {
      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          vi.fn(),
          "test-api-key",
          true,
          false,
          5,
          vi.fn(() => ""), // getFileContext
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          vi.fn(), // setShowNameModal
          vi.fn(), // setShowApiError
          vi.fn(), // setShowHistory
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleTranslateSingle(
          mockQuestions.multipleChoice,
          "Chinese (Simplified)"
        );
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      // Verify API was called with translation prompt
      expect(geminiMock.getCallCount()).toBe(1);
      const lastCall = geminiMock.getLastCall();
      expect(lastCall.userPrompt).toContain("Translate");
      // Target language is in the System Prompt, not User Prompt
      expect(lastCall.systemPrompt).toContain("Chinese (Simplified)");

      // Verify translated question was added
      expect(mockAddQuestionsToState).toHaveBeenCalled();
      const translatedQuestion = mockAddQuestionsToState.mock.calls[0][0][0];
      expect(translatedQuestion.language).toBe("Chinese (Simplified)");
      expect(translatedQuestion.uniqueId).toBe(
        mockQuestions.multipleChoice.uniqueId
      );
      expect(translatedQuestion.status).toBe("accepted");

      // Verify language was switched
      expect(mockHandleLanguageSwitch).toHaveBeenCalledWith(
        "Chinese (Simplified)"
      );

      // Verify success message
      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("Translated"),
        1500 // TOAST_DURATION.MEDIUM
      );
    });

    it("should preserve question metadata during translation", async () => {
      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          vi.fn(),
          "test-api-key",
          true,
          false,
          5,
          vi.fn(() => ""),
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleTranslateSingle(
          mockQuestions.multipleChoice,
          "Japanese"
        );
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      const translatedQuestion = mockAddQuestionsToState.mock.calls[0][0][0];
      expect(translatedQuestion.discipline).toBe(
        mockQuestions.multipleChoice.discipline
      );
      expect(translatedQuestion.type).toBe(mockQuestions.multipleChoice.type);
      expect(translatedQuestion.difficulty).toBe(
        mockQuestions.multipleChoice.difficulty
      );
    });

    it("should handle translation errors gracefully", async () => {
      geminiMock.simulateError("Translation failed");

      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          vi.fn(),
          "test-api-key",
          true,
          false,
          5,
          vi.fn(() => ""),
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleTranslateSingle(
          mockQuestions.multipleChoice,
          "Korean"
        );
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      expect(mockSetStatus).toHaveBeenCalledWith("Translation Failed");
      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("Translation Failed"),
        2500
      );
      expect(mockAddQuestionsToState).not.toHaveBeenCalled();
    });
  });

  describe("Bulk Translation", () => {
    it("should translate multiple questions to target languages", async () => {
      // Setup questions map with accepted questions
      const baseQuestion = {
        ...mockQuestions.multipleChoice,
        status: "accepted",
        language: "English",
      };

      // Ensure allQuestionsMap stores ARRAY of questions for correct uniqueId lookups
      allQuestionsMap.set(baseQuestion.uniqueId, [baseQuestion]);

      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          vi.fn(),
          "test-api-key",
          true,
          false,
          5,
          vi.fn(() => ""),
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleBulkTranslateMissing();
      });

      await waitFor(
        () => {
          expect(result.current.isProcessing).toBe(false);
        },
        { timeout: 2500 }
      );

      // Should translate to CN, JP, KR (3 languages)
      expect(geminiMock.getCallCount()).toBe(3);

      // Should add all translations
      expect(mockAddQuestionsToState).toHaveBeenCalledTimes(3);

      // Verify success message
      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("complete"),
        4000 // TOAST_DURATION.EXTENDED
      );
    });

    it("should skip already translated questions", async () => {
      const baseQuestion = {
        ...mockQuestions.multipleChoice,
        status: "accepted",
        language: "English",
      };

      // Mark Chinese as already translated
      translationMap.set(
        baseQuestion.uniqueId,
        new Set(["Chinese (Simplified)"])
      );
      allQuestionsMap.set(baseQuestion.uniqueId, [baseQuestion]);

      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          vi.fn(),
          "test-api-key",
          true,
          false,
          5,
          vi.fn(() => ""),
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleBulkTranslateMissing();
      });

      await waitFor(
        () => {
          expect(result.current.isProcessing).toBe(false);
        },
        { timeout: 2500 }
      );

      // Should only translate JP and KR (2 languages)
      expect(geminiMock.getCallCount()).toBe(2);
    });

    it("should show progress during bulk translation", async () => {
      const baseQuestion = {
        ...mockQuestions.multipleChoice,
        status: "accepted",
        language: "English",
      };

      allQuestionsMap.set(baseQuestion.uniqueId, [baseQuestion]);

      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          vi.fn(),
          "test-api-key",
          true,
          false,
          5,
          vi.fn(() => ""),
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleBulkTranslateMissing();
      });

      await waitFor(() => {
        expect(result.current.translationProgress).toBeGreaterThan(0);
      });

      await waitFor(
        () => {
          expect(result.current.isProcessing).toBe(false);
        },
        { timeout: 2500 }
      );
    });

    it("should not translate rejected questions", async () => {
      allQuestionsMap.set(mockQuestions.rejected.uniqueId, [
        mockQuestions.rejected,
      ]);

      const { result } = renderHook(() =>
        useGeneration(
          mockConfig,
          vi.fn(),
          "test-api-key",
          true,
          false,
          5,
          vi.fn(() => ""),
          mockCheckAndStoreQuestions,
          mockAddQuestionsToState,
          mockUpdateQuestionInState,
          vi.fn(), // updateAllVariantsInState
          mockHandleLanguageSwitch,
          mockShowMessage,
          mockSetStatus,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          translationMap,
          allQuestionsMap
        )
      );

      await act(async () => {
        await result.current.handleBulkTranslateMissing();
      });

      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      // Should show message that no translations are needed
      expect(mockShowMessage).toHaveBeenCalledWith(
        expect.stringContaining("already exist"),
        2500 // TOAST_DURATION.LONG
      );

      // Should not call API
      expect(geminiMock.getCallCount()).toBe(0);
    });
  });
});

// Mock Data
const mockQuestions = {
  multipleChoice: {
    id: 123,
    uniqueId: "uuid-123",
    question: "What is the primary rendering pipeline in Unreal Engine 5?",
    options: {
      A: "Forward Rendering",
      B: "Deferred Rendering",
      C: "Nanite",
      D: "Lumen",
    },
    correct: "B",
    discipline: "Graphics",
    difficulty: "Medium",
    type: "Multiple Choice",
    status: "accepted",
    language: "English",
    sourceUrl: "https://docs.unrealengine.com/5.0/en-US/rendering-overview/",
    sourceExcerpt: "Unreal Engine 5 uses deferred rendering by default.",
  },
  rejected: {
    id: 456,
    uniqueId: "uuid-456",
    question: "Bad question?",
    options: { A: "Yes", B: "No" },
    correct: "A",
    discipline: "Graphics",
    difficulty: "Easy",
    type: "True/False",
    status: "rejected",
    language: "English",
  },
};
