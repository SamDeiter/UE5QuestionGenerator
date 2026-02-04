const InviteCodeInput = ({
  value,
  onChange,
  onValidate,
  status,
  validationError,
}) => {
  const isValid = status === "valid";
  const isValidating = status === "validating";
  const hasError = !!validationError || status === "invalid";

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="invite-code"
          className="block text-sm font-medium text-slate-300 mb-2"
        >
          Invite Code
        </label>
        <input
          id="invite-code"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your invite code"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono tracking-wider"
          disabled={isValid}
          aria-invalid={hasError}
        />
      </div>

      {!isValid && (
        <button
          onClick={onValidate}
          disabled={isValidating || !value.trim()}
          className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
        >
          Validate Invite Code
        </button>
      )}
    </div>
  );
};

export default InviteCodeInput;
