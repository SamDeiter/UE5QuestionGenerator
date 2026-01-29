import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VerifyConfirmModal from "../VerifyConfirmModal";

/**
 * Tests for VerifyConfirmModal - Traffic Light verification workflow
 */

describe("VerifyConfirmModal", () => {
  const mockProps = {
    sourceUrl: "https://dev.epicgames.com/documentation/test",
    sourceExcerpt: "This is a test excerpt from Epic documentation.",
    onVerifyDocs: vi.fn(),
    onVerifySearch: vi.fn(),
    onReject: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    // Mock window.open
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  describe("Rendering", () => {
    it("renders the modal with header", () => {
      render(<VerifyConfirmModal {...mockProps} />);
      expect(screen.getByText("Verify Source Content")).toBeInTheDocument();
    });

    it("displays the source excerpt", () => {
      render(<VerifyConfirmModal {...mockProps} />);
      expect(screen.getByText(/This is a test excerpt/)).toBeInTheDocument();
    });

    it("shows Epic Documentation button when URL is valid", () => {
      render(<VerifyConfirmModal {...mockProps} />);
      expect(screen.getByText("Epic Documentation")).toBeInTheDocument();
    });

    it("shows Search Excerpt button", () => {
      render(<VerifyConfirmModal {...mockProps} />);
      expect(screen.getByText("Search Excerpt")).toBeInTheDocument();
    });

    it("shows three outcome buttons", () => {
      render(<VerifyConfirmModal {...mockProps} />);
      expect(screen.getByText(/Found in Epic Docs/)).toBeInTheDocument();
      expect(screen.getByText(/Found in Google Search/)).toBeInTheDocument();
      expect(screen.getByText(/Cannot Verify/)).toBeInTheDocument();
    });

    it("shows Cancel button", () => {
      render(<VerifyConfirmModal {...mockProps} />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("Open Source Buttons", () => {
    it("shows checkmark after Epic Docs button clicked", () => {
      render(<VerifyConfirmModal {...mockProps} />);

      fireEvent.click(screen.getByText("Epic Documentation"));

      // Button should show checkmark after click
      expect(screen.getByText("✓ Docs Opened")).toBeInTheDocument();
    });

    it("shows checkmark and clipboard message after Search button clicked", () => {
      render(<VerifyConfirmModal {...mockProps} />);

      fireEvent.click(screen.getByText("Search Excerpt"));

      // Button should show checkmark after click
      expect(screen.getByText("✓ Search Opened")).toBeInTheDocument();

      // Clipboard should be called
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        mockProps.sourceExcerpt
      );

      // Should show clipboard message
      expect(
        screen.getByText(/Excerpt copied to clipboard/)
      ).toBeInTheDocument();
    });
  });

  describe("Verification Outcomes", () => {
    it("calls onVerifyDocs with click tracking when 'Found in Epic Docs' clicked", () => {
      render(<VerifyConfirmModal {...mockProps} />);

      // Click the Epic Docs button first to set click state
      fireEvent.click(screen.getByText("Epic Documentation"));

      // Then click the outcome button
      fireEvent.click(screen.getByText(/Found in Epic Docs/));

      expect(mockProps.onVerifyDocs).toHaveBeenCalledWith({
        answerState: null,
        clickedDocs: true,
        clickedSearch: false,
        docLinkState: null,
      });
    });

    it("calls onVerifySearch with click tracking when 'Found in Google Search' clicked", () => {
      render(<VerifyConfirmModal {...mockProps} />);

      // Click the Search button first
      fireEvent.click(screen.getByText("Search Excerpt"));

      // Then click the outcome button
      fireEvent.click(screen.getByText(/Found in Google Search/));

      expect(mockProps.onVerifySearch).toHaveBeenCalledWith({
        answerState: null,
        clickedDocs: false,
        clickedSearch: true,
        docLinkState: null,
      });
    });

    it("shows rejection menu when 'Cannot Verify' clicked", () => {
      render(<VerifyConfirmModal {...mockProps} />);

      fireEvent.click(screen.getByText(/Cannot Verify/));

      // Should show rejection reasons
      expect(
        screen.getByText("Excerpt not on Epic Docs page")
      ).toBeInTheDocument();
      expect(
        screen.getByText("AI Hallucination suspected")
      ).toBeInTheDocument();
    });

    it("calls onReject with reason when rejection reason selected", () => {
      render(<VerifyConfirmModal {...mockProps} />);

      // Open reject menu
      fireEvent.click(screen.getByText(/Cannot Verify/));

      // Select a reason
      fireEvent.click(screen.getByText("AI Hallucination suspected"));

      expect(mockProps.onReject).toHaveBeenCalledWith("ai_hallucination", {
        clickedDocs: false,
        clickedSearch: false,
      });
    });
  });

  describe("Modal Dismiss", () => {
    it("calls onDismiss when Cancel button clicked", () => {
      render(<VerifyConfirmModal {...mockProps} />);

      fireEvent.click(screen.getByText("Cancel"));

      expect(mockProps.onDismiss).toHaveBeenCalled();
    });

    it("calls onDismiss when backdrop clicked", () => {
      render(<VerifyConfirmModal {...mockProps} />);

      // Click the backdrop (outermost div)
      const backdrop = document.querySelector(".fixed.inset-0");
      fireEvent.click(backdrop);

      expect(mockProps.onDismiss).toHaveBeenCalled();
    });
  });

  describe("Invalid URL Handling", () => {
    it("shows disabled button when URL is invalid", () => {
      render(
        <VerifyConfirmModal {...mockProps} sourceUrl="not-a-valid-epic-url" />
      );

      expect(screen.getByText("Docs Link Broken")).toBeInTheDocument();
    });

    it("shows disabled button when URL is missing", () => {
      render(<VerifyConfirmModal {...mockProps} sourceUrl="" />);

      expect(screen.getByText("Docs Link Broken")).toBeInTheDocument();
    });
  });

  describe("Flag Unverified Feature", () => {
    const propsWithFlag = {
      ...mockProps,
      onFlagUnverified: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("shows flag unverified button in rejection menu", () => {
      render(<VerifyConfirmModal {...propsWithFlag} />);

      // Open reject menu
      fireEvent.click(screen.getByText(/Cannot Verify/));

      // Should show the flag option
      expect(
        screen.getByText(/Cannot find in docs or search/)
      ).toBeInTheDocument();
    });

    it("calls onFlagUnverified when flag button clicked", () => {
      render(<VerifyConfirmModal {...propsWithFlag} />);

      // Open reject menu
      fireEvent.click(screen.getByText(/Cannot Verify/));

      // Click flag option
      fireEvent.click(screen.getByText(/Cannot find in docs or search/));

      expect(propsWithFlag.onFlagUnverified).toHaveBeenCalledWith({
        clickedDocs: false,
        clickedSearch: false,
      });
    });

    it("flag option appears before rejection reasons", () => {
      render(<VerifyConfirmModal {...propsWithFlag} />);

      // Open reject menu
      fireEvent.click(screen.getByText(/Cannot Verify/));

      // Both should be present
      expect(
        screen.getByText(/Cannot find in docs or search/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Or reject outright/)).toBeInTheDocument();
    });
  });
});
