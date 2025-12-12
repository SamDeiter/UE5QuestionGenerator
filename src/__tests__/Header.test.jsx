/**
 * @fileoverview Unit tests for Header component
 * Tests accessibility compliance, rendering modes, and status displays
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Header from "../components/Header";

// Mock the hooks and services
vi.mock("../hooks/useConnectionStatus", () => ({
  default: () => ({
    isOnline: true,
    queuedCount: 0,
    syncInProgress: false,
  }),
}));

vi.mock("../services/firebase", () => ({
  signOutUser: vi.fn().mockResolvedValue(undefined),
}));

// Mock environment variables
vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "test-dev-project");

describe("Header Component", () => {
  const defaultProps = {
    apiKeyStatus: "Cloud Functions",
    isCloudReady: true,
    onHome: vi.fn(),
    creatorName: "Test User",
    appMode: "create",
    tokenUsage: { inputTokens: 1500, outputTokens: 500, totalCost: 0.0025 },
    onStartTutorial: vi.fn(),
    isAdmin: false,
    onSignOut: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Accessibility Compliance", () => {
    it("renders header with banner role", () => {
      render(<Header {...defaultProps} />);
      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
    });

    it("has accessible name on header", () => {
      render(<Header {...defaultProps} />);
      const header = screen.getByRole("banner");
      expect(header).toHaveAttribute("aria-label", "Application header");
    });

    it("sign out button has accessible label", () => {
      render(<Header {...defaultProps} />);
      const signOutBtn = screen.getByRole("button", {
        name: /sign out/i,
      });
      expect(signOutBtn).toBeInTheDocument();
    });

    it("tutorial button is keyboard accessible", () => {
      render(<Header {...defaultProps} />);
      const tutorialBtn = screen.getByRole("button", { name: /tutorial/i });
      expect(tutorialBtn).toBeInTheDocument();
      tutorialBtn.focus();
      expect(document.activeElement).toBe(tutorialBtn);
    });

    it("status section has status role for screen readers", () => {
      render(<Header {...defaultProps} />);
      const statusSection = screen.getByRole("status");
      expect(statusSection).toBeInTheDocument();
    });
  });

  describe("Mode Rendering", () => {
    it("displays CREATE MODE badge in create mode", () => {
      render(<Header {...defaultProps} appMode="create" />);
      expect(screen.getByText("CREATE MODE")).toBeInTheDocument();
    });

    it("displays REVIEW MODE badge in review mode", () => {
      render(<Header {...defaultProps} appMode="review" />);
      expect(screen.getByText("REVIEW MODE")).toBeInTheDocument();
    });

    it("displays ANALYTICS badge in analytics mode", () => {
      render(<Header {...defaultProps} appMode="analytics" />);
      expect(screen.getByText("ANALYTICS")).toBeInTheDocument();
    });

    it("displays DATABASE VIEW badge in database mode", () => {
      render(<Header {...defaultProps} appMode="database" />);
      expect(screen.getByText("DATABASE VIEW")).toBeInTheDocument();
    });
  });

  describe("Status Displays", () => {
    it("displays token count formatted as k for thousands", () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByText("2.0k")).toBeInTheDocument();
    });

    it("displays cost formatted to 4 decimal places", () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByText("0.0025")).toBeInTheDocument();
    });

    it("displays creator name", () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    it("shows ADMIN badge when user is admin", () => {
      render(<Header {...defaultProps} isAdmin={true} />);
      expect(screen.getByText("ADMIN")).toBeInTheDocument();
    });

    it("shows CLOUD DEV indicator when cloud ready", () => {
      render(<Header {...defaultProps} isCloudReady={true} />);
      expect(screen.getByText("CLOUD")).toBeInTheDocument();
      expect(screen.getByText("DEV")).toBeInTheDocument();
    });

    it("shows LOCAL MODE when cloud not ready", () => {
      render(<Header {...defaultProps} isCloudReady={false} />);
      expect(screen.getByText("LOCAL MODE")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls onHome when logo clicked", () => {
      render(<Header {...defaultProps} />);
      const logoArea = screen.getByTitle("Back to Home");
      fireEvent.click(logoArea);
      expect(defaultProps.onHome).toHaveBeenCalledTimes(1);
    });

    it("calls onStartTutorial with mode when tutorial clicked", () => {
      render(<Header {...defaultProps} appMode="review" />);
      const tutorialBtn = screen.getByRole("button", { name: /tutorial/i });
      fireEvent.click(tutorialBtn);
      expect(defaultProps.onStartTutorial).toHaveBeenCalledWith("review");
    });

    it("calls onSignOut when sign out clicked", async () => {
      render(<Header {...defaultProps} />);
      const signOutBtn = screen.getByRole("button", { name: /sign out/i });
      fireEvent.click(signOutBtn);
      expect(defaultProps.onSignOut).toHaveBeenCalled();
    });
  });
});
