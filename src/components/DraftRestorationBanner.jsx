import Icon from './Icon';

const DraftRestorationBanner = ({ timestamp, onClear }) => {
    const formatTimestamp = (ts) => {
        const date = new Date(ts);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / 60000);
        
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        
        return date.toLocaleString();
    };

    return (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-4 animate-in slide-in-from-top">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Icon name="info" size={20} className="text-blue-400" />
                    <div>
                        <p className="text-white font-medium">
                            Draft Restored
                        </p>
                        <p className="text-sm text-slate-400">
                            Your work from {formatTimestamp(timestamp)} has been restored
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClear}
                    className="px-3 py-1 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
                >
                    Clear Draft
                </button>
            </div>
        </div>
    );
};

export default DraftRestorationBanner;
