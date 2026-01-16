/**
 * AppBanners - Warning banners extracted from App.jsx
 * Displays registration warnings and permission error alerts
 */

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
 * AppBanners - Combined component for all app-level warning banners
 */
const AppBanners = ({
  user,
  isRegistered,
  registrationLoading,
  permissionError,
}) => {
  const showRegistrationWarning = user && !isRegistered && !registrationLoading;

  return (
    <>
      <RegistrationWarningBanner show={showRegistrationWarning} />
      <PermissionErrorBanner show={permissionError} />
    </>
  );
};

export default AppBanners;
