/**
 * AppBanners - Warning banners extracted from App.jsx
 * Displays registration warnings, permission errors, and ad blocker alerts
 */
import { useState } from "react";
import AdBlockerWarning from "./AdBlockerWarning";

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
 * AppBanners - Combined component for all app-level warning banners
 */
const AppBanners = ({
  user,
  isRegistered,
  registrationLoading,
  permissionError,
  blockedByExtension,
}) => {
  const showRegistrationWarning = user && !isRegistered && !registrationLoading;
  const [showBlockerModal, setShowBlockerModal] = useState(false);

  return (
    <>
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
