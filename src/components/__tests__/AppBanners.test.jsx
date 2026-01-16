/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AppBanners, {
  RegistrationWarningBanner,
  PermissionErrorBanner,
} from "../AppBanners";

describe("AppBanners", () => {
  describe("RegistrationWarningBanner", () => {
    it("renders nothing when show is false", () => {
      const { container } = render(<RegistrationWarningBanner show={false} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders warning message when show is true", () => {
      render(<RegistrationWarningBanner show={true} />);
      expect(
        screen.getByText(/Your account is not fully registered/i)
      ).toBeInTheDocument();
    });

    it("displays amber background styling", () => {
      render(<RegistrationWarningBanner show={true} />);
      const banner = screen.getByText(/Your account is not fully registered/i);
      expect(banner.className).toContain("bg-amber-500");
    });
  });

  describe("PermissionErrorBanner", () => {
    it("renders nothing when show is false", () => {
      const { container } = render(<PermissionErrorBanner show={false} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders critical error message when show is true", () => {
      render(<PermissionErrorBanner show={true} />);
      expect(
        screen.getByText(/CRITICAL: Your account cannot save data/i)
      ).toBeInTheDocument();
    });

    it("displays red background for critical errors", () => {
      render(<PermissionErrorBanner show={true} />);
      const banner = screen.getByText(/CRITICAL/i).closest("div");
      expect(banner.className).toContain("bg-red-600");
    });

    it("includes support email link", () => {
      render(<PermissionErrorBanner show={true} />);
      const emailLink = screen.getByRole("link");
      expect(emailLink).toHaveAttribute(
        "href",
        "mailto:sam.deiter@epicgames.com"
      );
    });
  });

  describe("AppBanners (combined)", () => {
    const defaultProps = {
      user: null,
      isRegistered: true,
      registrationLoading: false,
      permissionError: false,
    };

    it("renders nothing when no banners should show", () => {
      const { container } = render(<AppBanners {...defaultProps} />);
      // Should only have empty fragment children
      expect(container.childElementCount).toBe(0);
    });

    it("shows registration warning when user is not registered", () => {
      render(
        <AppBanners
          {...defaultProps}
          user={{ uid: "test-user" }}
          isRegistered={false}
        />
      );
      expect(
        screen.getByText(/Your account is not fully registered/i)
      ).toBeInTheDocument();
    });

    it("hides registration warning while loading", () => {
      render(
        <AppBanners
          {...defaultProps}
          user={{ uid: "test-user" }}
          isRegistered={false}
          registrationLoading={true}
        />
      );
      expect(
        screen.queryByText(/Your account is not fully registered/i)
      ).not.toBeInTheDocument();
    });

    it("shows permission error when set", () => {
      render(<AppBanners {...defaultProps} permissionError={true} />);
      expect(screen.getByText(/CRITICAL/i)).toBeInTheDocument();
    });

    it("can show both banners simultaneously", () => {
      render(
        <AppBanners
          user={{ uid: "test-user" }}
          isRegistered={false}
          registrationLoading={false}
          permissionError={true}
        />
      );
      expect(
        screen.getByText(/Your account is not fully registered/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/CRITICAL/i)).toBeInTheDocument();
    });
  });
});
