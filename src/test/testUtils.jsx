/**
 * Test Utilities - Provides wrappers and utilities for testing components
 *
 * This file solves the problem of components requiring context providers
 * (AccessibilityContext, etc.) by providing a unified wrapper.
 *
 * Usage:
 *   import { renderWithProviders } from '../../../test/testUtils';
 *   const { getByText } = renderWithProviders(<MyComponent />);
 */
import { render } from "@testing-library/react";
import { AccessibilityProvider } from "../contexts/AccessibilityContext";

/**
 * Mock localStorage for tests
 */
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value;
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Set up localStorage mock if in test environment
if (typeof global.localStorage === "undefined") {
  Object.defineProperty(global, "localStorage", { value: localStorageMock });
}

/**
 * AllProviders - Wraps components with all necessary context providers
 * Add more providers here as needed
 */
export const AllProviders = ({ children }) => {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
};

/**
 * Renders a component with all necessary context providers
 * @param {React.ReactElement} ui - Component to render
 * @param {Object} options - Additional render options
 * @returns {Object} Render result with all RTL methods
 */
export const renderWithProviders = (ui, options = {}) => {
  return render(ui, { wrapper: AllProviders, ...options });
};

/**
 * Creates mock accessibility context value for direct mocking
 */
export const createMockAccessibilityContext = (overrides = {}) => ({
  colorblindMode: false,
  highContrast: false,
  reducedMotion: false,
  toggleColorblindMode: () => {},
  toggleHighContrast: () => {},
  toggleReducedMotion: () => {},
  setPrefs: () => {},
  ...overrides,
});

/**
 * Creates mock theme colors for direct mocking
 */
export const createMockThemeColors = (overrides = {}) => ({
  getScoreTier: () => "good",
  scoreColor: () => "bg-emerald-500",
  scoreColorByValue: () => "bg-emerald-500",
  statusColor: () => "bg-cyan-500",
  lockColor: () => "bg-amber-500",
  eventColor: () => "bg-blue-500",
  actionColor: () => "bg-emerald-500",
  severityStyles: () => ({
    bg: "bg-emerald-900/20",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    icon: "text-emerald-400",
  }),
  colorblindMode: false,
  SCORE_TIERS: {
    exceptional: { min: 90, label: "Exceptional" },
    veryGood: { min: 80, label: "Very Good" },
    good: { min: 70, label: "Good" },
    adequate: { min: 60, label: "Adequate" },
    needsWork: { min: 0, label: "Needs Work" },
  },
  ...overrides,
});

/**
 * Creates mock question for testing
 */
export const createMockQuestion = (overrides = {}) => ({
  uniqueId: "test-question-123",
  question: "What is the Blueprint Editor in Unreal Engine 5?",
  options: {
    A: "A visual scripting tool",
    B: "A 3D modeling tool",
    C: "A sound editor",
    D: "A texture painter",
  },
  correct: "A",
  discipline: "Blueprint",
  difficulty: "Medium",
  status: "pending",
  language: "English",
  creatorName: "Test User",
  creatorEmail: "test@example.com",
  creatorId: "user-123",
  ...overrides,
});

export default renderWithProviders;
