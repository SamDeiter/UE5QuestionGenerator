/**
 * LanguageControls Regression Tests
 *
 * REGRESSION PREVENTION: The LanguageControls component disappeared from
 * production due to an isAdmin conditional and gh-pages caching issues.
 * These tests ensure the component always renders properly.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// MOCKS
// ============================================================

vi.mock("../../utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ============================================================
// COMPONENT IMPORTS (after mocks)
// ============================================================
import LanguageControls from "../QuestionItem/LanguageControls";
import { LANGUAGE_FLAGS } from "../../utils/constants";

// ============================================================
// TEST FIXTURES
// ============================================================
const mockQuestion = {
  id: "test-123",
  uniqueId: "test-unique-123",
  question: "What is the purpose of Blueprints in UE5?",
  language: "English",
  status: "pending",
};

const defaultProps = {
  q: mockQuestion,
  availableVariants: [],
  onSwitchLanguage: vi.fn(),
  onTranslateSingle: vi.fn(),
  isProcessing: false,
  userRole: "admin",
  isLocked: false,
  lockedBy: null,
  appMode: "review",
};

// ============================================================
// LANGUAGE CONTROLS REGRESSION TESTS
// ============================================================

describe("LanguageControls Regression Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CRITICAL: Component renders without crashing", () => {
    const { container } = render(<LanguageControls {...defaultProps} />);

    // The component should render a container div
    expect(container.firstChild).not.toBeNull();
    expect(container.firstChild).toHaveAttribute(
      "data-component",
      "LanguageControls"
    );
  });

  it("CRITICAL: All language flags render", () => {
    render(<LanguageControls {...defaultProps} />);

    // Should have buttons for all supported languages
    const allLanguages = Object.keys(LANGUAGE_FLAGS);
    const buttons = screen.getAllByRole("button");

    expect(buttons.length).toBe(allLanguages.length);
  });

  it("Current language button has distinct styling", () => {
    render(<LanguageControls {...defaultProps} />);

    // English is current, should be highlighted
    const buttons = screen.getAllByRole("button");
    const englishButton = buttons.find((b) => b.title?.includes("English"));

    expect(englishButton).toHaveClass("border-indigo-500");
  });

  it("Component renders for non-admin users", () => {
    const { container } = render(
      <LanguageControls {...defaultProps} userRole="reviewer" />
    );

    // Should still render - no admin restriction on viewing
    expect(container.firstChild).not.toBeNull();
  });

  it("Locked state disables buttons", () => {
    render(
      <LanguageControls
        {...defaultProps}
        isLocked={true}
        lockedBy={{ userEmail: "other@test.com" }}
      />
    );

    const buttons = screen.getAllByRole("button");
    // All buttons should be disabled when locked
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
