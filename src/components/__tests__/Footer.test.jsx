/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Footer from "../Footer";

// Mock constants
vi.mock("../../utils/constants", () => ({
  APP_VERSION: "v2.3.5",
}));

describe("Footer", () => {
  const currentYear = new Date().getFullYear();

  it("renders copyright with current year", () => {
    render(<Footer />);
    expect(
      screen.getByText(new RegExp(`© ${currentYear}`)),
    ).toBeInTheDocument();
  });

  it("displays Epic Games copyright", () => {
    render(<Footer />);
    expect(screen.getByText(/Epic Games, Inc/)).toBeInTheDocument();
  });

  it("displays app name", () => {
    render(<Footer />);
    expect(screen.getByText("UE5 Question Generator")).toBeInTheDocument();
  });

  it("displays version number", () => {
    render(<Footer />);
    expect(screen.getByText("v2.3.5")).toBeInTheDocument();
  });

  it("has Privacy Policy link", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /Privacy Policy/i });
    expect(link).toHaveAttribute(
      "href",
      "https://legal.epicgames.com/en-US/epicgames/privacy-policy",
    );
  });

  it("has Terms of Service link", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /Terms of Service/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.epicgames.com/site/en-US/tos",
    );
  });

  it("has GitHub link", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /GitHub/i });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/SamDeiter/UE5QuestionGenerator",
    );
  });

  it("all external links open in new tab", () => {
    render(<Footer />);
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  it("renders with semantic footer element", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("footer")).toBeInTheDocument();
  });
});
