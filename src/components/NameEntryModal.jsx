/* eslint-disable sonarjs/pseudo-random */
import { useState, useEffect } from "react";
import Icon from "./Icon";
import { validateDisplayName } from "../utils/nameValidation";

/**
 * NameEntryModal - Modal for entering user's display name
 * Shows validation errors for invalid names (profanity, special characters, etc.)
 *
 * @param {Object} props
 * @param {Function} props.onSave - Called with name when valid name is submitted
 */
const NameEntryModal = ({ onSave }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const [sillyPlaceholder, setSillyPlaceholder] = useState("");

  useEffect(() => {
    const sillyNames = [
      "Captain Blueprint",
      "Sir Render-Lot",
      "Polygon Prince",
      "Texture Titan",
    ];
    // Pick a random placeholder for fun UI variety (non-security)
    setSillyPlaceholder(
      `e.g. ${sillyNames[Math.floor(Math.random() * sillyNames.length)]}`,
    );
  }, []);

  // Live validation as user types (debounced feel via state)
  const handleChange = (e) => {
    const value = e.target.value;
    setName(value);

    // Only show errors after user has typed something
    if (value.trim()) {
      const validation = validateDisplayName(value);
      setError(validation.valid ? null : validation.error);
    } else {
      setError(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validation = validateDisplayName(name);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    // Call the parent handler with validated name
    const result = onSave(validation.sanitized);

    // If onSave returns an error object, display it
    if (result && !result.success) {
      setError(result.error);
    }
  };

  const isValid = name.trim() && !error;

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-orange-600 p-3 rounded-full mb-4 shadow-lg shadow-orange-900/50">
            <Icon name="user" size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome, Creator / Reviewer
          </h2>
          <p className="text-slate-400 text-sm">
            Please enter your name to identify your contributions.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Your Full Name (For Creating & Reviewing)
            </label>
            <input
              type="text"
              name="creatorName"
              value={name}
              onChange={handleChange}
              placeholder={sillyPlaceholder}
              className={`w-full px-4 py-3 bg-slate-950 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-white placeholder-slate-600 transition-all ${
                error ? "border-red-500" : "border-slate-700"
              }`}
              autoFocus
              aria-invalid={!!error}
              aria-describedby={error ? "name-error" : undefined}
            />
            {error && (
              <div
                id="name-error"
                className="flex items-center gap-2 text-red-400 text-sm mt-2"
              >
                <Icon name="alert-circle" size={14} />
                <span>{error}</span>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Must start with a letter. Only letters, spaces, hyphens, and
              apostrophes allowed.
            </p>
          </div>
          <button
            type="submit"
            disabled={!isValid}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg active:scale-[0.98]"
          >
            Set Identity & Start
          </button>
        </form>
      </div>
    </div>
  );
};

export default NameEntryModal;
