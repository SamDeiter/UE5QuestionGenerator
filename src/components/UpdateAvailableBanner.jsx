/**
 * UpdateAvailableBanner
 *
 * Shows a non-intrusive bottom banner when a new service worker version
 * has installed and is waiting to activate. Clicking "Reload" calls the
 * updateSW(true) function provided by registerSW() in src/main.jsx, which
 * triggers skipWaiting on the SW and reloads the page so the new bundle
 * takes effect.
 *
 * Architecture: the SW is registered in src/main.jsx (outside React) via
 * `import { registerSW } from "virtual:pwa-register"`. When the registration
 * fires its onNeedRefresh callback, main.jsx calls notifyUpdateAvailable()
 * (exported below) which flips the module-level state and notifies any
 * subscribed component. This component subscribes on mount.
 */
import { useEffect, useState } from "react";

// --- Tiny module-level store (no extra file, keeps the state colocated) ---
let _needRefresh = false;
let _updateSW = null;
const _listeners = new Set();

const _emit = () => {
  for (const l of _listeners) l(_needRefresh);
};

/**
 * Called from src/main.jsx when the SW reports onNeedRefresh.
 * Stores the updateSW function so the Reload button can call it.
 */
export const notifyUpdateAvailable = (updateSW) => {
  _updateSW = updateSW;
  _needRefresh = true;
  _emit();
};

const _subscribe = (cb) => {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
};

const _dismiss = () => {
  _needRefresh = false;
  _emit();
};

// --- Component ---
const UpdateAvailableBanner = () => {
  const [needRefresh, setNeedRefresh] = useState(_needRefresh);

  useEffect(() => {
    return _subscribe(setNeedRefresh);
  }, []);

  if (!needRefresh) return null;

  const handleReload = async () => {
    // Dismiss first so a race-triggered re-registration doesn't re-show the
    // banner on the reloaded page before the new SW has taken control.
    _dismiss();

    // Listen for the SW handoff before reloading. workbox-window fires
    // controllerchange when the new SW takes control; reloading before that
    // leaves the waiting SW still waiting, which causes onNeedRefresh to fire
    // again on the next page load (the loop the user sees).
    const reloadOnControl = () => window.location.reload();
    navigator.serviceWorker?.addEventListener(
      "controllerchange",
      reloadOnControl,
      { once: true }
    );

    // Fallback: if the SW doesn't take control within 3 s (e.g. no SW support,
    // or clientsClaim timing edge-case), force the reload ourselves.
    const fallback = setTimeout(reloadOnControl, 3000);

    try {
      if (typeof _updateSW === "function") {
        await _updateSW(true); // posts SKIP_WAITING to the waiting SW
      } else {
        clearTimeout(fallback);
        reloadOnControl();
      }
    } catch {
      clearTimeout(fallback);
      reloadOnControl();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] pointer-events-auto"
    >
      <div className="flex items-center gap-3 bg-indigo-600 text-white rounded-lg shadow-lg px-4 py-3 border border-indigo-400 max-w-md">
        <span className="text-sm font-medium">A new version is available.</span>
        <button
          type="button"
          onClick={handleReload}
          className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-sm px-3 py-1 rounded transition-colors"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={_dismiss}
          aria-label="Dismiss update notification"
          className="text-indigo-100 hover:text-white text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default UpdateAvailableBanner;
