import React from "react";
import LoadingSpinner from "../LoadingSpinner";

/**
 * AdminSection Component
 *
 * A wrapper that combines React.Suspense and a loading state.
 * This helps reduce boilerplate in the main AdminPanel.
 */
const AdminSection = ({ children, label, fallback }) => {
  return (
    <React.Suspense fallback={fallback || <LoadingSpinner label={label} />}>
      {children}
    </React.Suspense>
  );
};

export default AdminSection;
