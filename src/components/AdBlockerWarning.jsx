/**
 * AdBlockerWarning - Shows when browser extensions block Firebase requests
 *
 * Displays a helpful message explaining how to whitelist the site in ad blockers.
 */
import Icon from "./Icon";

const AdBlockerWarning = ({ onDismiss }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-amber-900/30 p-4 flex items-center gap-3 border-b border-amber-500/30">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center">
            <Icon name="shield-off" size={24} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-200">
              Ad Blocker Detected
            </h2>
            <p className="text-sm text-amber-400/80">
              Your browser is blocking essential connections
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-slate-300">
            A browser feature or extension is blocking requests to Google
            Firebase. <strong>Brave browser</strong> has built-in "Shields" that
            block these by default.
          </p>

          <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-orange-200 flex items-center gap-2">
              <Icon name="shield-off" size={16} className="text-orange-400" />
              Brave Browser (Shields):
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
              <li>
                Click the <strong>lion icon</strong> in the address bar
              </li>
              <li>
                Toggle <strong>"Shields"</strong> to <strong>OFF</strong> for
                this site
              </li>
              <li>
                <strong>Refresh</strong> the page (Ctrl+R or Cmd+R)
              </li>
            </ol>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Icon
                name="check-circle"
                size={16}
                className="text-emerald-400"
              />
              Other browsers (Chrome, Edge, Firefox):
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
              <li>
                Click your <strong>ad blocker icon</strong> (uBlock, AdBlock,
                etc.)
              </li>
              <li>
                Choose <strong>"Disable for this site"</strong>
              </li>
              <li>
                <strong>Refresh</strong> the page
              </li>
            </ol>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
            <Icon name="info" size={14} className="inline mr-2" />
            <strong>Alternative:</strong> Try Chrome Incognito or Edge InPrivate
            mode.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-between items-center bg-slate-900/50">
          <p className="text-xs text-slate-500">
            This app requires access to *.googleapis.com
          </p>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdBlockerWarning;
