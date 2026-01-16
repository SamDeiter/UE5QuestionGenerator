/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import StatCard from "../StatCard";

describe("StatCard", () => {
  const defaultProps = {
    title: "Total Questions",
    value: 42,
    icon: "file-text",
    color: "blue",
  };

  it("renders title and value", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText("Total Questions")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders with string value", () => {
    render(<StatCard {...defaultProps} value="$1.25" />);
    expect(screen.getByText("$1.25")).toBeInTheDocument();
  });

  it("renders with percentage value", () => {
    render(<StatCard {...defaultProps} value="85%" />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("applies correct color styling for blue", () => {
    const { container } = render(<StatCard {...defaultProps} color="blue" />);
    expect(container.innerHTML).toContain("blue");
  });

  it("applies correct color styling for emerald", () => {
    const { container } = render(
      <StatCard {...defaultProps} color="emerald" />
    );
    expect(container.innerHTML).toContain("emerald");
  });

  it("handles zero value correctly", () => {
    render(<StatCard {...defaultProps} value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("handles large numbers", () => {
    render(<StatCard {...defaultProps} value={12345} />);
    expect(screen.getByText("12345")).toBeInTheDocument();
  });
});
