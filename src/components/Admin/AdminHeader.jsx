import React from "react";
import Icon from "../Icon";

/**
 * AdminHeader Component
 *
 * Displays the title and icon for the Admin Panel.
 */
const AdminHeader = () => {
  return (
    <div className="flex items-center justify-between mb-3">
      <h1 className="text-lg font-bold text-white flex items-center gap-2">
        <Icon name="shield" size={18} />
        Admin Panel
      </h1>
    </div>
  );
};

export default AdminHeader;
