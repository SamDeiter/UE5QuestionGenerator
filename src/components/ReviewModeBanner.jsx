/**
 * ReviewModeBanner Component
 * 
 * Call-to-action banner shown in create mode after questions are generated.
 */
import Icon from './Icon';

const ReviewModeBanner = ({ onNavigateToReview }) => (
    <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-700/50 rounded-lg p-4 mb-4 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Icon name="info" size={20} className="text-indigo-400" />
                <div>
                    <h3 className="text-sm font-bold text-indigo-300">Questions Generated!</h3>
                    <p className="text-xs text-slate-400">Switch to Review Mode to accept or reject questions.</p>
                </div>
            </div>
            <button
                onClick={onNavigateToReview}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/50"
            >
                Go to Review <Icon name="arrow-right" size={16} />
            </button>
        </div>
    </div>
);

export default ReviewModeBanner;
