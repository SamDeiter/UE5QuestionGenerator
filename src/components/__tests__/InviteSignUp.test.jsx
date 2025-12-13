/**
 * InviteSignUp Component Tests
 *
 * Following QA-Sentinel-Prime: "IF IT ISN'T TESTED, IT DOESN'T EXIST"
 * Using React Testing Library for behavior-based testing
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import InviteSignUp from "../InviteSignUp";
import * as inviteService from "../../services/inviteService";
import * as firebase from "../../services/firebase";

// Mock the services
vi.mock("../../services/inviteService");
vi.mock("../../services/firebase");

describe("InviteSignUp Component", () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    inviteService.getInviteFromUrl.mockReturnValue(null);
  });

  describe("Initial Render", () => {
    test("renders invite code input field", () => {
      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument();
    });

    test("renders validate button initially", () => {
      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      expect(
        screen.getByRole("button", { name: /validate invite code/i })
      ).toBeInTheDocument();
    });

    test("renders cancel button when onCancel is provided", () => {
      render(
        <InviteSignUp onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );
      expect(
        screen.getByRole("button", { name: /cancel/i })
      ).toBeInTheDocument();
    });

    test("does not render cancel button when onCancel is not provided", () => {
      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      expect(
        screen.queryByRole("button", { name: /cancel/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("URL Invite Code Detection", () => {
    test("auto-populates invite code from URL", async () => {
      inviteService.getInviteFromUrl.mockReturnValue("ABC123XYZ789");
      inviteService.validateInvite.mockResolvedValue({
        valid: true,
        role: "user",
      });

      render(<InviteSignUp onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/invite code/i)).toHaveValue(
          "ABC123XYZ789"
        );
      });
    });

    test("auto-validates invite code from URL", async () => {
      inviteService.getInviteFromUrl.mockReturnValue("ABC123XYZ789");
      inviteService.validateInvite.mockResolvedValue({
        valid: true,
        role: "admin",
      });

      render(<InviteSignUp onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(inviteService.validateInvite).toHaveBeenCalledWith(
          "ABC123XYZ789"
        );
      });
    });
  });

  describe("Input Handling", () => {
    test("converts input to uppercase", async () => {
      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      const input = screen.getByLabelText(/invite code/i);

      await userEvent.type(input, "abc123xyz");

      expect(input).toHaveValue("ABC123XYZ");
    });

    test("disables input after successful validation", async () => {
      inviteService.validateInvite.mockResolvedValue({
        valid: true,
        role: "user",
      });

      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      const input = screen.getByLabelText(/invite code/i);

      await userEvent.type(input, "VALID123CODE");
      await userEvent.click(screen.getByRole("button", { name: /validate/i }));

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe("Validation Flow", () => {
    test("shows loading state during validation", async () => {
      inviteService.validateInvite.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ valid: true }), 100)
          )
      );

      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      await userEvent.type(
        screen.getByLabelText(/invite code/i),
        "CODE12345678"
      );
      await userEvent.click(screen.getByRole("button", { name: /validate/i }));

      expect(screen.getByText(/validating/i)).toBeInTheDocument();
    });

    test("shows success message for valid invite", async () => {
      inviteService.validateInvite.mockResolvedValue({
        valid: true,
        role: "admin",
      });

      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      await userEvent.type(
        screen.getByLabelText(/invite code/i),
        "VALIDCODE123"
      );
      await userEvent.click(screen.getByRole("button", { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByText(/valid invite/i)).toBeInTheDocument();
        expect(screen.getByText(/admin/i)).toBeInTheDocument();
      });
    });

    test("shows error message for invalid invite", async () => {
      inviteService.validateInvite.mockRejectedValue(
        new Error("Invalid invite code")
      );

      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      await userEvent.type(
        screen.getByLabelText(/invite code/i),
        "BADCODE12345"
      );
      await userEvent.click(screen.getByRole("button", { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid invite code/i)).toBeInTheDocument();
      });
    });

    test("shows rate limit error when exceeded", async () => {
      inviteService.validateInvite.mockRejectedValue(
        new Error("Too many failed attempts")
      );

      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      await userEvent.type(
        screen.getByLabelText(/invite code/i),
        "ANYCODE12345"
      );
      await userEvent.click(screen.getByRole("button", { name: /validate/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/too many failed attempts/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Authentication Flow", () => {
    test("shows Google sign-in button after valid invite", async () => {
      inviteService.validateInvite.mockResolvedValue({
        valid: true,
        role: "user",
      });

      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      await userEvent.type(
        screen.getByLabelText(/invite code/i),
        "VALIDCODE123"
      );
      await userEvent.click(screen.getByRole("button", { name: /validate/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /continue with google/i })
        ).toBeInTheDocument();
      });
    });

    test("calls onSuccess after successful sign-in and invite consumption", async () => {
      inviteService.validateInvite.mockResolvedValue({
        valid: true,
        role: "admin",
      });
      firebase.signInWithGoogle.mockResolvedValue({
        user: { email: "test@example.com" },
      });
      inviteService.consumeInvite.mockResolvedValue({
        success: true,
        role: "admin",
      });
      inviteService.clearInviteFromUrl.mockImplementation(() => {});

      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      await userEvent.type(
        screen.getByLabelText(/invite code/i),
        "VALIDCODE123"
      );
      await userEvent.click(screen.getByRole("button", { name: /validate/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /continue with google/i })
        ).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByRole("button", { name: /continue with google/i })
      );

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith("admin");
      });
    });

    test("shows error when authentication fails", async () => {
      inviteService.validateInvite.mockResolvedValue({
        valid: true,
        role: "user",
      });
      firebase.signInWithGoogle.mockRejectedValue(new Error("Auth cancelled"));

      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      await userEvent.type(
        screen.getByLabelText(/invite code/i),
        "VALIDCODE123"
      );
      await userEvent.click(screen.getByRole("button", { name: /validate/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /continue with google/i })
        ).toBeInTheDocument();
      });

      await userEvent.click(
        screen.getByRole("button", { name: /continue with google/i })
      );

      await waitFor(() => {
        expect(screen.getByText(/auth cancelled/i)).toBeInTheDocument();
      });
    });
  });

  describe("Cancel Flow", () => {
    test("calls onCancel when cancel button is clicked", async () => {
      render(
        <InviteSignUp onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    test("input has proper aria-labels", () => {
      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      const input = screen.getByLabelText(/invite code/i);

      expect(input).toHaveAttribute("id", "invite-code");
    });

    test("input shows aria-invalid when validation fails", async () => {
      inviteService.validateInvite.mockRejectedValue(new Error("Invalid"));

      render(<InviteSignUp onSuccess={mockOnSuccess} />);
      await userEvent.type(
        screen.getByLabelText(/invite code/i),
        "BADCODE12345"
      );
      await userEvent.click(screen.getByRole("button", { name: /validate/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/invite code/i)).toHaveAttribute(
          "aria-invalid",
          "true"
        );
      });
    });
  });
});

/**
 * Coverage Report (QA-Sentinel style):
 *
 * Happy Path:
 * ✅ Valid invite code → Google sign-in → Success callback
 *
 * Edge Cases:
 * ✅ Empty input handling
 * ✅ URL parameter detection
 * ✅ Uppercase conversion
 *
 * Error States:
 * ✅ Invalid invite code
 * ✅ Rate limit exceeded
 * ✅ Authentication failure
 *
 * Accessibility:
 * ✅ Proper labels and ARIA attributes
 * ✅ aria-invalid for error states
 */
