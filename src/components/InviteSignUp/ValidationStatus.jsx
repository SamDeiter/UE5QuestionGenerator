import Icon from "../Icon";

const ValidationStatus = ({ status, error, role, colorblindMode }) => {
  const successClasses = colorblindMode
    ? "text-blue-400 bg-blue-900/20"
    : "text-green-400 bg-green-900/20";

  const errorClasses = colorblindMode
    ? "text-rose-400 bg-rose-900/20"
    : "text-red-400 bg-red-900/20";

  if (status === "validating") {
    return (
      <div className="flex items-center gap-2 text-blue-400">
        <Icon name="loader" size={16} className="animate-spin" />
        <span>Validating invite code...</span>
      </div>
    );
  }

  if (status === "valid") {
    return (
      <div
        className={`flex items-center gap-2 ${successClasses} p-3 rounded-lg`}
      >
        <Icon name="check-circle" size={16} />
        <span>
          Valid invite! Role: <strong>{role}</strong>
        </span>
      </div>
    );
  }

  if (error || status === "invalid") {
    return (
      <div className={`flex items-center gap-2 ${errorClasses} p-3 rounded-lg`}>
        <Icon name="x-circle" size={16} />
        <span>{error || "Invalid invite code"}</span>
      </div>
    );
  }

  return null;
};

export default ValidationStatus;
