import React from 'react';
import Icon from './Icon';

/**
 * CrashRecoveryPrompt - Modal shown when potential data loss is detected
 * Offers to restore questions from Firestore cloud backup
 */
const CrashRecoveryPrompt = ({
    isOpen,
    recoveryData,
    isRecovering,
    onRecover,
    onDismiss
}) => {
    if (!isOpen || !recoveryData) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-gradient-to-b from-blue-900/50 to-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-4 border-b border-blue-700 bg-blue-900/30">
                    <h2 className="text-lg font-bold text-blue-300 flex items-center gap-2">
                        <Icon name="cloud-download" className="text-blue-400" />
                        Recover Your Data?
                    </h2>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-700/50">
                        <p className="text-sm text-slate-300 mb-3">
                            <strong className="text-blue-300">Good news!</strong> We found a cloud backup of your questions.
                        </p>

                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-slate-800/50 p-3 rounded-lg">
                                <p className="text-2xl font-bold text-blue-400">{recoveryData.firestoreCount}</p>
                                <p className="text-xs text-slate-500">In Cloud Backup</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-lg">
                                <p className="text-2xl font-bold text-slate-400">{recoveryData.localCount}</p>
                                <p className="text-xs text-slate-500">Currently Local</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 text-center">
                        This can happen after an IDE crash or unexpected browser close.
                        <br />Your questions were automatically backed up to Firestore.
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onDismiss}
                            disabled={isRecovering}
                            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm font-bold rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                        >
                            Dismiss
                        </button>
                        <button
                            onClick={onRecover}
                            disabled={isRecovering}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/50"
                        >
                            {isRecovering ? (
                                <><Icon name="loader" size={16} className="animate-spin" /> Recovering...</>
                            ) : (
                                <><Icon name="download" size={16} /> Restore Questions</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrashRecoveryPrompt;
