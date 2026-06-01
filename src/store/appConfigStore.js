import { create } from "zustand";
import { getLocalPref } from "../utils/localPrefs";
import { DEFAULT_CONFIG, STORAGE_KEYS, APP_MODES } from "../utils/constants";

/**
 * App-config domain store — source of truth for `appMode`, `config`, and a few
 * small UI flags that used to live in the `useAppConfig` hook.
 *
 * Initial state is resolved SYNCHRONOUSLY at module load (URL param + localStorage)
 * so the very first render is correct — no landing-mode/default-config flash.
 * localStorage *persistence* still happens via effects in `useAppConfig`.
 *
 * Setters are React-`useState`-compatible (value OR updater function).
 */

const applyUpdate = (next, prev) =>
  typeof next === "function" ? next(prev) : next;

/**
 * Resolve the initial app mode the same way the old useAppConfig initializer did:
 * URL `?mode=` param (highest priority, validated) → localStorage → LANDING.
 */
export const resolveInitialAppMode = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    if (modeParam && Object.values(APP_MODES).includes(modeParam)) {
      return modeParam;
    }
  }
  if (typeof window === "undefined") return APP_MODES.LANDING;
  return localStorage.getItem(STORAGE_KEYS.APP_MODE) || APP_MODES.LANDING;
};

/** Merge saved config over defaults, mirroring the old useState initializer. */
export const resolveInitialConfig = () => {
  const saved = getLocalPref(STORAGE_KEYS.CONFIG);
  const initialConfig = saved
    ? { ...DEFAULT_CONFIG, ...saved }
    : { ...DEFAULT_CONFIG };
  initialConfig.creatorName = initialConfig.creatorName || "";
  initialConfig.reviewerName = initialConfig.reviewerName || "";
  initialConfig.apiKey = initialConfig.apiKey || "";
  return initialConfig;
};

const createInitialState = () => ({
  appMode: resolveInitialAppMode(),
  config: resolveInitialConfig(),
  showApiError: false,
  batchSizeWarning: "",
  pendingNavigationUniqueId: null,
});

export const useAppConfigStore = create((set) => ({
  ...createInitialState(),
  setAppMode: (next) =>
    set((s) => ({ appMode: applyUpdate(next, s.appMode) })),
  setConfig: (next) => set((s) => ({ config: applyUpdate(next, s.config) })),
  setShowApiError: (next) =>
    set((s) => ({ showApiError: applyUpdate(next, s.showApiError) })),
  setBatchSizeWarning: (next) =>
    set((s) => ({ batchSizeWarning: applyUpdate(next, s.batchSizeWarning) })),
  setPendingNavigationUniqueId: (next) =>
    set((s) => ({
      pendingNavigationUniqueId: applyUpdate(
        next,
        s.pendingNavigationUniqueId
      ),
    })),
}));

/**
 * Test helper: re-read storage and reset data state (actions preserved).
 * Needed because the store initializes once per process, whereas the old hook
 * re-read localStorage on every mount.
 */
export const hydrateAppConfigStore = () =>
  useAppConfigStore.setState(createInitialState());
