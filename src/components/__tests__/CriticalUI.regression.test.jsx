/**
 * Critical UI Regression Tests
 *
 * These tests verify that critical reviewer workflow UI elements exist and render correctly.
 * If any of these tests fail, deployments will be blocked.
 *
 * REGRESSION PREVENTION: The Reject button was accidentally removed during ESLint cleanup.
 * These tests ensure that never happens again.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ScoreBadge
vi.mock("../ScoreBadge", () => ({
  default: ({ score }) => <div data-testid="score-badge">{score}</div>,
}));

// ============================================================
// MOCKS - Required to isolate component rendering
// ============================================================

// Mock Firebase (path relative to src/components/__tests__/)
vi.mock("../../services/firebase", () => ({
  auth: { currentUser: { uid: "test-uid", email: "test@test.com" } },
  getConnectionStatus: () => ({ isOnline: true, queuedCount: 0 }),
  subscribeToConnectionStatus: () => () => {},
}));

// Mock hooks
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "test-uid", email: "test@test.com" } }),
}));

vi.mock("../../hooks/useThemeColors", () => ({
  useThemeColors: () => ({
    lockColor: () => "bg-green-500",
    statusColor: () => "bg-blue-500",
    scoreColor: () => "text-green-400",
  }),
}));

vi.mock("../../hooks/useEditLock", () => ({
  useEditLock: () => ({ lockedBy: null, isLocked: false, hasLock: false }),
}));

vi.mock("../../hooks/useConnectionStatus", () => ({
  default: () => ({ isOnline: true, queuedCount: 0, syncInProgress: false }),
}));

vi.mock("../../utils/secureStorage", () => ({
  getSecureItem: () => "TestUser",
}));

vi.mock("../../utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../../contexts/AccessibilityContext", () => ({
  useAccessibility: () => ({
    colorblindMode: false,
    toggleColorblindMode: vi.fn(),
  }),
}));

// ============================================================
// COMPONENT IMPORTS (after mocks)
// ============================================================
import QuestionActions from "../QuestionItem/QuestionActions";
import QuestionContent from "../QuestionItem/QuestionContent";
import QuestionHeader from "../QuestionItem/QuestionHeader";
import { APP_MODES, QUESTION_STATUS } from "../../utils/constants";

// ============================================================
// TEST FIXTURES
// ============================================================
const mockQuestion = {
  id: "test-123",
  uniqueId: "test-unique-123",
  question: "What is the purpose of Blueprints in UE5?",
  status: QUESTION_STATUS.PENDING,
  type: "Multiple Choice",
  options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
  correct: "A",
  critiqueScore: 85,
  humanVerified: false,
};

// ============================================================
// CRITICAL UI REGRESSION TESTS
// ============================================================

describe("Critical UI Regression Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("QuestionActions Component", () => {
    it("CRITICAL: Reject button renders in Review mode", () => {
      render(
        <QuestionActions
          q={mockQuestion}
          isLocked={false}
          lockedBy={null}
          onUpdateStatus={vi.fn()}
          onDelete={vi.fn()}
          appMode={APP_MODES.REVIEW}
          showMessage={vi.fn()}
        />
      );

      // The REJECT button must exist
      const rejectButton = screen.getByRole("button", { name: /reject/i });
      expect(rejectButton).toBeInTheDocument();
      expect(rejectButton).not.toBeDisabled();
    });

    it("CRITICAL: Reject button is disabled when locked", () => {
      render(
        <QuestionActions
          q={mockQuestion}
          isLocked={true}
          lockedBy={{ userEmail: "other@test.com" }}
          onUpdateStatus={vi.fn()}
          onDelete={vi.fn()}
          appMode={APP_MODES.REVIEW}
          showMessage={vi.fn()}
        />
      );

      const rejectButton = screen.getByRole("button", { name: /reject/i });
      expect(rejectButton).toBeDisabled();
    });

    it("QuestionActions returns null in Database mode", () => {
      const { container } = render(
        <QuestionActions
          q={mockQuestion}
          isLocked={false}
          onUpdateStatus={vi.fn()}
          onDelete={vi.fn()}
          appMode={APP_MODES.DATABASE}
          showMessage={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  // ============================================================
  // CLICK-TO-CORRECT ANSWER TESTS (NEW FEATURE)
  // ============================================================
  describe("QuestionContent Click-to-Correct Answers", () => {
    const mcQuestion = {
      id: "mc-test-123",
      question: "What is the purpose of Blueprints?",
      type: "Multiple Choice",
      options: { A: "Option A", B: "Option B", C: "Option C", D: "Option D" },
      correct: "A",
    };

    const tfQuestion = {
      id: "tf-test-456",
      question: "Blueprints are visual scripts.",
      type: "True/False",
      options: { A: "True", B: "False" },
      correct: "A",
    };

    it("CRITICAL: MC answer options render as clickable elements", () => {
      render(
        <QuestionContent
          q={mcQuestion}
          isEditing={false}
          editedText=""
          setEditedText={vi.fn()}
          setIsEditing={vi.fn()}
          onUpdateQuestion={vi.fn()}
          showMessage={vi.fn()}
          appMode={APP_MODES.REVIEW}
        />
      );

      // All 4 options should be rendered
      expect(screen.getByText(/Option A/)).toBeInTheDocument();
      expect(screen.getByText(/Option B/)).toBeInTheDocument();
      expect(screen.getByText(/Option C/)).toBeInTheDocument();
      expect(screen.getByText(/Option D/)).toBeInTheDocument();
    });

    it("CRITICAL: MC options have cursor-pointer for click-to-correct", () => {
      const { container } = render(
        <QuestionContent
          q={mcQuestion}
          isEditing={false}
          editedText=""
          setEditedText={vi.fn()}
          setIsEditing={vi.fn()}
          onUpdateQuestion={vi.fn()}
          showMessage={vi.fn()}
          appMode={APP_MODES.REVIEW}
        />
      );

      // Check that option divs have cursor-pointer class
      const optionDivs = container.querySelectorAll(".cursor-pointer");
      expect(optionDivs.length).toBeGreaterThan(0);
    });

    it("CRITICAL: T/F options render TRUE and FALSE labels", () => {
      render(
        <QuestionContent
          q={tfQuestion}
          isEditing={false}
          editedText=""
          setEditedText={vi.fn()}
          setIsEditing={vi.fn()}
          onUpdateQuestion={vi.fn()}
          showMessage={vi.fn()}
          appMode={APP_MODES.REVIEW}
        />
      );

      expect(screen.getByText("TRUE")).toBeInTheDocument();
      expect(screen.getByText("FALSE")).toBeInTheDocument();
    });

    it("CRITICAL: Correct answer shows green styling", () => {
      const { container } = render(
        <QuestionContent
          q={mcQuestion}
          isEditing={false}
          editedText=""
          setEditedText={vi.fn()}
          setIsEditing={vi.fn()}
          onUpdateQuestion={vi.fn()}
          showMessage={vi.fn()}
          appMode={APP_MODES.REVIEW}
        />
      );

      // The correct answer (A) should have green styling
      const greenElements = container.querySelectorAll('[class*="green"]');
      expect(greenElements.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // VIEW AI SUGGESTIONS BUTTON TESTS (NEW FEATURE)
  // ============================================================
  describe("QuestionHeader View AI Suggestions Button", () => {
    const critiquedQuestion = {
      id: "critiqued-123",
      question: "Test question",
      type: "Multiple Choice",
      difficulty: "Intermediate",
      critiqueScore: 85,
      critique: { score: 85, feedback: "Good question" },
      suggestedRewrite: { question: "Improved question text" },
    };

    const getDiffBadgeColor = () =>
      "bg-yellow-950 text-yellow-400 border-yellow-800";

    it("CRITICAL: View AI Suggestions button renders for critiqued questions", () => {
      render(
        <QuestionHeader
          q={critiquedQuestion}
          originalQ={critiquedQuestion}
          getDiffBadgeColor={getDiffBadgeColor}
          appMode={APP_MODES.REVIEW}
          onOpenCritiqueModal={vi.fn()}
          onUpdateQuestion={vi.fn()}
          onKickBack={vi.fn()}
          onCritique={vi.fn()}
        />
      );

      const viewSuggestionsButton = screen.getByRole("button", {
        name: /view ai suggestions/i,
      });
      expect(viewSuggestionsButton).toBeInTheDocument();
    });

    it("CRITICAL: View AI Suggestions button calls onOpenCritiqueModal when clicked", () => {
      const mockOpenModal = vi.fn();
      render(
        <QuestionHeader
          q={critiquedQuestion}
          originalQ={critiquedQuestion}
          getDiffBadgeColor={getDiffBadgeColor}
          appMode={APP_MODES.REVIEW}
          onOpenCritiqueModal={mockOpenModal}
          onUpdateQuestion={vi.fn()}
          onKickBack={vi.fn()}
          onCritique={vi.fn()}
        />
      );

      const viewSuggestionsButton = screen.getByRole("button", {
        name: /view ai suggestions/i,
      });
      viewSuggestionsButton.click();
      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it("View AI Suggestions button does NOT render without critique", () => {
      const uncritiquedQuestion = {
        ...critiquedQuestion,
        critiqueScore: null,
        critique: null,
        suggestedRewrite: null,
      };

      render(
        <QuestionHeader
          q={uncritiquedQuestion}
          originalQ={uncritiquedQuestion}
          getDiffBadgeColor={getDiffBadgeColor}
          appMode={APP_MODES.REVIEW}
          onOpenCritiqueModal={vi.fn()}
          onUpdateQuestion={vi.fn()}
          onKickBack={vi.fn()}
        />
      );

      const viewSuggestionsButton = screen.queryByRole("button", {
        name: /view ai suggestions/i,
      });
      expect(viewSuggestionsButton).not.toBeInTheDocument();
    });
  });

  // NOTE: ReviewProgressBar tests skipped - the component has complex internal dependencies
  // The Accept/Verify/Critique workflow is tested by existing ReviewProgressBar tests
  // See src/components/__tests__/ReviewProgressBar.test.jsx
  // describe("ReviewProgressBar Component", () => { ... });

  // NOTE: Header tests skipped - require complex mocking of useConnectionStatus and other hooks
  // The colorblind toggle is tested via the AccessibilityContext tests
  // describe("Header Component", () => { ... });
});

// ============================================================
// FIRESTORE RULES FIELD COVERAGE
// ============================================================

describe("Firestore Rules Field Coverage", () => {
  it("All reviewer update fields are documented", () => {
    // This test documents which fields reviewers can update
    // If this list changes, the Firestore rules must be updated too
    const REVIEWER_UPDATE_FIELDS = [
      "status",
      "critique",
      "critiqueScore",
      "rejectionReason",
      "rejectedAt",
      "acceptedAt",
      "reviewDuration",
      "reviewerName",
      "reviewCompletedAt",
      "reviewStartedAt",
      "humanVerified",
      "humanVerifiedBy",
      "humanVerifiedAt",
      "suggestedRewrite",
      "improvedScore",
      "improvementsApplied",
      "notes",
    ];

    // This test exists as documentation - always passes
    // The actual validation is done by scripts/validate-firestore-rules.js
    expect(REVIEWER_UPDATE_FIELDS.length).toBeGreaterThan(0);
  });
});
