import Icon from './Icon';

const UnsavedChangesDialog = ({ isOpen, onSaveDraft, onDiscard, onCancel, draftTimestamp }) => {
    if (!isOpen) return null;

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl max-w-md w-full border border-slate-800 shadow-2xl">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-900/30 rounded-lg">
                            <Icon name="alert-triangle" size={24} className="text-orange-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Unsaved Work Detected</h2>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-slate-300">
                        You have unsaved work in Creation Mode. What would you like to do?
                    </p>
                    {draftTimestamp && (
                        <p className="text-sm text-slate-400">
                            Last saved: {formatTimestamp(draftTimestamp)}
                        </p>
                    )}
                </div>

                <div className="p-6 border-t border-slate-800 flex gap-3">
                    <button
                        onClick={onSaveDraft}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Icon name="save" size={18} />
                            Keep Draft
                        </div>
                    </button>
                    <button
                        onClick={onDiscard}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Icon name="trash" size={18} />
                            Discard
                        </div>
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnsavedChangesDialog;
