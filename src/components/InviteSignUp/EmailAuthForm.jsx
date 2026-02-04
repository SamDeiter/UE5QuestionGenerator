import { useState } from "react";

const EmailAuthForm = ({
  onSubmit,
  isAuthenticating,
  isNewUser,
  toggleNewUser,
  onBack,
  authButtonText,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        required
      />
      <input
        type="password"
        placeholder="Password (6+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        required
        minLength={6}
      />
      <button
        type="submit"
        disabled={isAuthenticating}
        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
      >
        {authButtonText}
      </button>
      <button
        type="button"
        onClick={toggleNewUser}
        className="w-full text-sm text-slate-400 hover:text-white"
      >
        {isNewUser
          ? "Already have an account? Sign in"
          : "New user? Create account"}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-slate-500 hover:text-slate-300"
      >
        ← Back to sign-in options
      </button>
    </form>
  );
};

export default EmailAuthForm;
