/**
 * SharedChartComponents Unit Tests
 *
 * Tests utility functions and shared components used across the AnalyticsDashboard.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  normalizeTag,
  getProgressBarClass,
  PIE_COLORS,
  REJECTION_REASON_LABELS,
  MetricCard,
  ChartContainer,
  TOOLTIP_STYLE,
} from "../SharedChartComponents";

describe("SharedChartComponents", () => {
  // ============================================================
  // normalizeTag
  // ============================================================
  describe("normalizeTag", () => {
    it("lowercases a simple tag", () => {
      expect(normalizeTag("Blueprint")).toBe("blueprint");
    });

    it("lowercases a tag with mixed case", () => {
      expect(normalizeTag("MaterialEditor")).toBe("materialeditor");
    });

    it("handles already lowercase tags", () => {
      expect(normalizeTag("animation")).toBe("animation");
    });

    it("handles tags with spaces", () => {
      expect(normalizeTag("Level Design")).toBe("level design");
    });

    it("handles tags with special characters", () => {
      expect(normalizeTag("C++")).toBe("c++");
    });

    it("handles empty string", () => {
      expect(normalizeTag("")).toBe("");
    });
  });

  // ============================================================
  // getProgressBarClass
  // ============================================================
  describe("getProgressBarClass", () => {
    it("returns transparent for count 0", () => {
      expect(getProgressBarClass(0)).toBe("bg-transparent");
    });

    it("returns orange for count 1", () => {
      expect(getProgressBarClass(1)).toBe("bg-orange-500");
    });

    it("returns orange for count 2", () => {
      expect(getProgressBarClass(2)).toBe("bg-orange-500");
    });

    it("returns emerald for count 3", () => {
      expect(getProgressBarClass(3)).toBe("bg-emerald-500");
    });

    it("returns emerald for count 5", () => {
      expect(getProgressBarClass(5)).toBe("bg-emerald-500");
    });

    it("returns emerald for large counts", () => {
      expect(getProgressBarClass(100)).toBe("bg-emerald-500");
    });
  });

  // ============================================================
  // PIE_COLORS constant
  // ============================================================
  describe("PIE_COLORS", () => {
    it("contains 8 colors", () => {
      expect(PIE_COLORS).toHaveLength(8);
    });

    it("all colors are valid hex codes", () => {
      PIE_COLORS.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  // ============================================================
  // REJECTION_REASON_LABELS
  // ============================================================
  describe("REJECTION_REASON_LABELS", () => {
    it("maps too_easy to 'Too Easy'", () => {
      expect(REJECTION_REASON_LABELS.too_easy).toBe("Too Easy");
    });

    it("maps too_hard to 'Too Difficult'", () => {
      expect(REJECTION_REASON_LABELS.too_hard).toBe("Too Difficult");
    });

    it("maps incorrect to 'Incorrect'", () => {
      expect(REJECTION_REASON_LABELS.incorrect).toBe("Incorrect");
    });

    it("maps unclear to 'Unclear'", () => {
      expect(REJECTION_REASON_LABELS.unclear).toBe("Unclear");
    });

    it("maps duplicate to 'Duplicate'", () => {
      expect(REJECTION_REASON_LABELS.duplicate).toBe("Duplicate");
    });

    it("maps poor_quality to 'Poor Quality'", () => {
      expect(REJECTION_REASON_LABELS.poor_quality).toBe("Poor Quality");
    });

    it("maps bad_source to 'Bad Source'", () => {
      expect(REJECTION_REASON_LABELS.bad_source).toBe("Bad Source");
    });

    it("maps other to 'Other'", () => {
      expect(REJECTION_REASON_LABELS.other).toBe("Other");
    });

    it("contains exactly 8 mappings", () => {
      expect(Object.keys(REJECTION_REASON_LABELS)).toHaveLength(8);
    });
  });

  // ============================================================
  // TOOLTIP_STYLE constant
  // ============================================================
  describe("TOOLTIP_STYLE", () => {
    it("has contentStyle with dark background", () => {
      expect(TOOLTIP_STYLE.contentStyle.backgroundColor).toBe("#0f172a");
    });

    it("has contentStyle with border color", () => {
      expect(TOOLTIP_STYLE.contentStyle.borderColor).toBe("#334155");
    });
  });

  // ============================================================
  // MetricCard component
  // ============================================================
  describe("MetricCard", () => {
    it("renders title and value", () => {
      render(
        <MetricCard
          title="Total Questions"
          value={42}
          icon={<span data-testid="icon">📊</span>}
          color="blue"
        />
      );

      expect(screen.getByText("Total Questions")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("renders the icon", () => {
      render(
        <MetricCard
          title="Test"
          value={0}
          icon={<span data-testid="metric-icon">🎯</span>}
          color="green"
        />
      );

      expect(screen.getByTestId("metric-icon")).toBeInTheDocument();
    });

    it("applies blue color classes", () => {
      const { container } = render(
        <MetricCard title="Test" value={0} icon={<span>X</span>} color="blue" />
      );

      expect(container.firstChild).toHaveClass("bg-blue-500/10");
      expect(container.firstChild).toHaveClass("text-blue-400");
    });

    it("applies green color classes", () => {
      const { container } = render(
        <MetricCard
          title="Test"
          value={0}
          icon={<span>X</span>}
          color="green"
        />
      );

      expect(container.firstChild).toHaveClass("bg-emerald-500/10");
      expect(container.firstChild).toHaveClass("text-emerald-400");
    });

    it("applies orange color classes", () => {
      const { container } = render(
        <MetricCard
          title="Test"
          value={0}
          icon={<span>X</span>}
          color="orange"
        />
      );

      expect(container.firstChild).toHaveClass("bg-orange-500/10");
      expect(container.firstChild).toHaveClass("text-orange-400");
    });

    it("applies purple color classes", () => {
      const { container } = render(
        <MetricCard
          title="Test"
          value={0}
          icon={<span>X</span>}
          color="purple"
        />
      );

      expect(container.firstChild).toHaveClass("bg-purple-500/10");
      expect(container.firstChild).toHaveClass("text-purple-400");
    });
  });

  // ============================================================
  // ChartContainer component
  // ============================================================
  describe("ChartContainer", () => {
    it("renders title and icon", () => {
      render(
        <ChartContainer
          title="Token Usage"
          icon={<span data-testid="chart-icon">📈</span>}
        >
          <div>Chart content</div>
        </ChartContainer>
      );

      expect(screen.getByText("Token Usage")).toBeInTheDocument();
      expect(screen.getByTestId("chart-icon")).toBeInTheDocument();
    });

    it("renders children content", () => {
      render(
        <ChartContainer title="Test" icon={<span>X</span>}>
          <div data-testid="chart-content">My chart here</div>
        </ChartContainer>
      );

      expect(screen.getByTestId("chart-content")).toBeInTheDocument();
      expect(screen.getByText("My chart here")).toBeInTheDocument();
    });

    it("applies single column by default", () => {
      const { container } = render(
        <ChartContainer title="Test" icon={<span>X</span>}>
          <div>Content</div>
        </ChartContainer>
      );

      expect(container.firstChild).not.toHaveClass("lg:col-span-2");
    });

    it("applies double column when colSpan=2", () => {
      const { container } = render(
        <ChartContainer title="Test" icon={<span>X</span>} colSpan={2}>
          <div>Content</div>
        </ChartContainer>
      );

      expect(container.firstChild).toHaveClass("lg:col-span-2");
    });

    it("applies custom className", () => {
      const { container } = render(
        <ChartContainer
          title="Test"
          icon={<span>X</span>}
          className="custom-class"
        >
          <div>Content</div>
        </ChartContainer>
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
