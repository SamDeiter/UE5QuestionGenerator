import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import QuestionItem from "../QuestionItem";
import { AccessibilityProvider } from "../../contexts/AccessibilityContext";

// Polyfill matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock hooks
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "123", email: "test@test.com" } }),
}));

vi.mock("../../hooks/useThemeColors", () => ({
  useThemeColors: () => ({ lockColor: () => "bg-red-500" }),
}));

vi.mock("../../hooks/useEditLock", () => ({
  useEditLock: () => ({ lockedBy: null, isLocked: false, hasLock: false }),
}));

vi.mock("../../utils/secureStorage", () => ({
  getSecureItem: () => "TestUser",
}));

// We still mock useAccessibility but it needs a Provider to avoid the error
vi.mock("../../contexts/AccessibilityContext", async () => {
  const actual = await vi.importActual("../../contexts/AccessibilityContext");
  return {
    ...actual,
    useAccessibility: () => ({ colorblindMode: false }),
  };
});

vi.mock("../../utils/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn() },
}));

// Mock child components to avoid deep rendering issues and dependencies
// Paths must be relative to THIS test file (src/components/__tests__/QuestionItem.test.jsx)
vi.mock("../QuestionItem/QuestionHeader", () => ({
  default: () => <div data-testid="header" />,
}));
vi.mock("../QuestionItem/QuestionContent", () => ({
  default: () => <div data-testid="content" />,
}));
vi.mock("../QuestionItem/QuestionMetadata", () => ({
  default: () => <div data-testid="metadata" />,
}));
vi.mock("../QuestionItem/LanguageControls", () => ({
  default: () => <div data-testid="lang-controls">Language Controls</div>,
}));
vi.mock("../QuestionItem/QuestionActions", () => ({
  default: () => <div data-testid="actions" />,
}));
vi.mock("../QuestionItem/CritiqueSection", () => ({
  default: () => <div data-testid="critique" />,
}));
vi.mock("../QuestionItem/ValidationWarnings", () => ({
  default: () => <div data-testid="warnings" />,
}));
vi.mock("../QuestionItem/ExplanationDisplay", () => ({
  default: () => <div data-testid="explanation" />,
}));
vi.mock("../QuestionItem/SourceContextCard", () => ({
  default: () => <div data-testid="source" />,
}));
vi.mock("../QuestionItem/QuestionNotesField", () => ({
  default: () => <div data-testid="notes" />,
}));
vi.mock("../ImprovementModal", () => ({
  default: () => <div data-testid="modal" />,
}));
vi.mock("../ReviewProgressBar", () => ({
  default: () => <div data-testid="progress" />,
}));
vi.mock("../ui/Card", () => ({
  default: ({ children }) => <div data-testid="card">{children}</div>,
}));

import { APP_MODES, QUESTION_STATUS } from "../../utils/constants";

describe("QuestionItem", () => {
  const defaultProps = {
    q: {
      id: 1,
      question: "Test?",
      status: QUESTION_STATUS.PENDING,
      _source: "session",
    },
    onUpdateStatus: vi.fn(),
    appMode: APP_MODES.CREATE,
    availableVariants: [],
  };

  it("should render LanguageControls for all authenticated users", () => {
    render(
      <AccessibilityProvider>
        <QuestionItem {...defaultProps} isAdmin={true} />
      </AccessibilityProvider>,
    );
    expect(screen.getByTestId("lang-controls")).toBeInTheDocument();
  });

  it("should render LanguageControls for non-admin users too", () => {
    // LanguageControls was made available to all users (no longer admin-only)
    render(
      <AccessibilityProvider>
        <QuestionItem {...defaultProps} isAdmin={false} />
      </AccessibilityProvider>,
    );
    expect(screen.getByTestId("lang-controls")).toBeInTheDocument();
  });
});
