import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useInviteFlow } from "../useInviteFlow";
import * as firebaseServices from "../../services/firebase";

// Mock dependencies
vi.mock("../../services/firebase", () => ({
  signInWithGoogle: vi.fn(),
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
}));

vi.mock("../../services/inviteService", () => ({
  validateInvite: vi.fn(),
  consumeInvite: vi.fn(),
  getInviteFromUrl: vi.fn(),
  clearInviteFromUrl: vi.fn(),
}));

// Mock logger to avoid console spam
vi.mock("../../utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("useInviteFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles auth/account-exists-with-different-credential error correctly", async () => {
    // Setup - Mock Google Sign In to fail with specific error
    const error = new Error("Account exists");
    error.code = "auth/account-exists-with-different-credential";
    firebaseServices.signInWithGoogle.mockRejectedValue(error);

    const { result } = renderHook(() => useInviteFlow({ onSuccess: vi.fn() }));

    // Execute
    await act(async () => {
      await result.current.handleGoogleSignIn();
    });

    // Assert
    expect(result.current.authError).toBe(
      "An account with this email already exists. Please sign in using your existing method (Email/Password)."
    );
    expect(result.current.isAuthenticating).toBe(false);
  });

  it("handles auth/email-already-in-use error for email signup", async () => {
    // Setup
    const error = new Error("Email in use");
    error.code = "auth/email-already-in-use";
    firebaseServices.signUpWithEmail.mockRejectedValue(error);

    const { result } = renderHook(() => useInviteFlow({ onSuccess: vi.fn() }));

    // Act
    await act(async () => {
      await result.current.handleEmailAuth("test@example.com", "password");
    });

    // Assert
    expect(result.current.authError).toBe(
      "This email is already registered. Try signing in instead."
    );
    expect(result.current.isNewUser).toBe(false); // Should switch to sign-in mode
  });

  it("handles standard auth/weak-password error", async () => {
    const error = new Error("Weak password");
    error.code = "auth/weak-password";
    firebaseServices.signUpWithEmail.mockRejectedValue(error);

    const { result } = renderHook(() => useInviteFlow({ onSuccess: vi.fn() }));

    await act(async () => {
      await result.current.handleEmailAuth("test@example.com", "123");
    });

    expect(result.current.authError).toBe(
      "Password should be at least 6 characters."
    );
  });

  it("handles generic errors", async () => {
    const error = new Error("Random error");
    firebaseServices.signInWithGoogle.mockRejectedValue(error);

    const { result } = renderHook(() => useInviteFlow({ onSuccess: vi.fn() }));

    await act(async () => {
      await result.current.handleGoogleSignIn();
    });

    await act(async () => {
      await result.current.handleGoogleSignIn();
    });

    // Check for generic error message
    expect(result.current.authError).toContain("An error occurred");
  });
});
