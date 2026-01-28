import Icon from "../Icon";

const AuthOptions = ({ onGoogle, onEmail, isAuthenticating }) => (
  <div className="space-y-3">
    <button
      onClick={onGoogle}
      disabled={isAuthenticating}
      className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50"
    >
      {isAuthenticating ? (
        <Icon name="loader" size={20} className="animate-spin" />
      ) : (
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
          className="w-5 h-5"
        />
      )}
      <span>Continue with Google</span>
    </button>
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-700"></div>
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-slate-900 px-2 text-slate-500">Or</span>
      </div>
    </div>
    <button
      onClick={onEmail}
      disabled={isAuthenticating}
      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
    >
      Continue with Email
    </button>
    <p className="text-xs text-slate-500 text-center">
      Any Google or email account works. No Epic Games login required.
    </p>
  </div>
);

export default AuthOptions;
