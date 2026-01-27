/**
 * AppBanners - Warning banners extracted from App.jsx
 * Displays registration warnings, permission errors, ad blocker alerts,
 * and auth service health warnings
 */
import { useState } from "react";
import AdBlockerWarning from "./AdBlockerWarning";
import BrowserWarning from "./BrowserWarning";

/**
 * Registration Warning Banner
 * Shows when user is logged in but not fully registered in the system
 */
export const RegistrationWarningBanner = ({ show }) => {
  if (!show) return null;

  return (
    <div className="bg-amber-500 text-black px-4 py-2 text-center text-sm font-medium">
      ⚠️ Your account is not fully registered. Some features (Accept/Reject) may
      not work. Please contact an admin for access.
    </div>
  );
};

/**
 * Permission Error Banner
 * Shows when user's Firestore write probe failed - CRITICAL blocking error
 */
export const PermissionErrorBanner = ({ show }) => {
  if (!show) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-3 text-center font-bold">
      🚫 CRITICAL: Your account cannot save data to the database. Your work will
      NOT be saved. Please contact{" "}
      <a
        href="mailto:sam.deiter@epicgames.com"
        className="underline text-white"
      >
        sam.deiter@epicgames.com
      </a>{" "}
      immediately.
    </div>
  );
};

/**
 * Ad Blocker Warning Banner
 * Shows when browser extensions are blocking Firebase requests
 */
export const AdBlockerBanner = ({ show, onShowModal }) => {
  if (!show) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-center font-medium flex items-center justify-center gap-2">
      <span>🚫 Ad blocker detected - Firebase requests are being blocked.</span>
      <button
        onClick={onShowModal}
        className="underline hover:text-amber-100 font-bold"
      >
        Learn how to fix
      </button>
    </div>
  );
};

/**
 * Auth Health Warning Banner
 * Shows when auth health check fails (e.g., Token Service API disabled)
 */
export const AuthHealthBanner = ({ authHealthStatus }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Don't show if healthy or no status
  if (!authHealthStatus || authHealthStatus.healthy) return null;

  return (
    <div className="bg-orange-600 text-white px-4 py-3">
      <div className="flex items-center justify-center gap-3">
        <span className="font-bold">
          🏥 Auth Service Issue: {authHealthStatus.error}
        </span>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm underline hover:text-orange-100"
        >
          {showDetails ? "Hide Details" : "Show Details"}
        </button>
      </div>
      {showDetails && authHealthStatus.guidance && (
        <div className="mt-2 text-center text-sm bg-orange-700 rounded p-2 max-w-2xl mx-auto">
          <p className="font-medium mb-1">How to fix:</p>
          <p>{authHealthStatus.guidance}</p>
          {authHealthStatus.errorCode && (
            <p className="mt-1 text-orange-200 text-xs">
              Error code: {authHealthStatus.errorCode}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * AppBanners - Combined component for all app-level warning banners
 */
const AppBanners = ({
  user,
  isRegistered,
  registrationLoading,
  permissionError,
  blockedByExtension,
  authHealthStatus,
}) => {
  const showRegistrationWarning = user && !isRegistered && !registrationLoading;
  const [showBlockerModal, setShowBlockerModal] = useState(false);

  return (
    <>
      <BrowserWarning />
      <AuthHealthBanner authHealthStatus={authHealthStatus} />
      <RegistrationWarningBanner show={showRegistrationWarning} />
      <PermissionErrorBanner show={permissionError} />
      <AdBlockerBanner
        show={blockedByExtension}
        onShowModal={() => setShowBlockerModal(true)}
      />
      {showBlockerModal && (
        <AdBlockerWarning onDismiss={() => setShowBlockerModal(false)} />
      )}
    </>
  );
};

export default AppBanners;
