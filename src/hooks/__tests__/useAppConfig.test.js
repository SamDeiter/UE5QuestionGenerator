import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAppConfig } from "../useAppConfig";
import { STORAGE_KEYS, DEFAULT_CONFIG, APP_MODES } from "../../utils/constants";
import * as secureStorage from "../../utils/secureStorage";

// Mock dependencies
vi.mock("../../utils/secureStorage", () => ({
  getSecureItem: vi.fn(),
  setSecureItem: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../contexts/ModalContext", () => ({
  useModals: () => ({
    showNameModal: false,
    setShowNameModal: vi.fn(),
    showGenSettings: true,
    setShowGenSettings: vi.fn(),
    showSettings: false,
    setShowSettings: vi.fn(),
    showApiKey: false,
    setShowApiKey: vi.fn(),
    showTerms: false,
    setShowTerms: vi.fn(),
    showAgeGate: false,
    setShowAgeGate: vi.fn(),
    termsAccepted: false,
    setTermsAccepted: vi.fn(),
    showExportMenu: false,
    setShowExportMenu: vi.fn(),
    showBulkExportModal: false,
    setShowBulkExportModal: vi.fn(),
    showAnalytics: false,
    setShowAnalytics: vi.fn(),
    dataMenuOpen: false,
    setDataMenuOpen: vi.fn(),
    dataMenuRef: { current: null },
    showAdvancedConfig: false,
    setShowAdvancedConfig: vi.fn(),
    showDangerZone: false,
    setShowDangerZone: vi.fn(),
    showApiKeyModal: false,
    setShowApiKeyModal: vi.fn(),
  }),
}));

describe("useAppConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should initialize with default config and landing mode", () => {
    secureStorage.getSecureItem.mockReturnValue(null);
    const { result } = renderHook(() => useAppConfig());

    expect(result.current.appMode).toBe(APP_MODES.LANDING);
    expect(result.current.config).toEqual(
      expect.objectContaining(DEFAULT_CONFIG)
    );
    expect(result.current.apiKeyStatus).toBe("Not Set"); // No user = not auth ready
  });

  it("should load config from secure storage", () => {
    const savedConfig = {
      ...DEFAULT_CONFIG,
      creatorName: "Test User",
      discipline: "Design",
    };
    secureStorage.getSecureItem.mockReturnValue(savedConfig);

    const { result } = renderHook(() => useAppConfig());

    expect(result.current.config.creatorName).toBe("Test User");
    expect(result.current.config.discipline).toBe("Design");
  });

  it("should update config and persist to storage", () => {
    const { result } = renderHook(() => useAppConfig());

    act(() => {
      result.current.handleChange({
        target: { name: "creatorName", value: "New User" },
      });
    });

    expect(result.current.config.creatorName).toBe("New User");
    expect(secureStorage.setSecureItem).toHaveBeenCalledWith(
      STORAGE_KEYS.CONFIG,
      expect.objectContaining({ creatorName: "New User" })
    );
  });

  it("should handle language switch", () => {
    const { result } = renderHook(() => useAppConfig());

    act(() => {
      result.current.handleLanguageSwitch("Spanish");
    });

    expect(result.current.config.language).toBe("Spanish");
  });

  it("should handle app mode conversion logic", () => {
    // Test mode switching
    const { result } = renderHook(() => useAppConfig());

    act(() => {
      result.current.setAppMode(APP_MODES.CREATE);
    });

    expect(result.current.appMode).toBe(APP_MODES.CREATE);
    // Persist to localStorage
    expect(localStorage.getItem(STORAGE_KEYS.APP_MODE)).toBe(APP_MODES.CREATE);
  });
});
