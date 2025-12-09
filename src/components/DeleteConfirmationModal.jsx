import React from 'react';
import Icon from './Icon';

const DeleteConfirmationModal = ({ deleteConfirmId, onConfirm, onCancel }) => {
    if (!deleteConfirmId) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 space-y-4">
                <h3 className="text-xl font-bold text-red-500 flex items-center gap-2"><Icon name="trash-2" size={20} /> DELETE QUESTION?</h3>
                <p className="text-sm text-slate-300">Why are you deleting this question? This helps improve future generation.</p>

                <div className="grid grid-cols-1 gap-2">
                    {[
                        { id: 'Duplicate', label: 'Duplicate Question' },
                        { id: 'Poor Quality', label: 'Poor Quality / Hallucination' },
                        { id: 'Incorrect', label: 'Incorrect Information' },
                        { id: 'Bad Source', label: 'Bad Source / YouTube' },
                        { id: 'Test', label: 'Just Testing / Cleanup' }
                    ].map(reason => (
                        <button
                            key={reason.id}
                            onClick={() => onConfirm(reason.id)}
                            className="w-full text-left px-4 py-3 rounded bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-500/50 transition-all flex items-center justify-between group"
                        >
                            <span className="text-sm font-medium text-slate-300 group-hover:text-red-200">{reason.label}</span>
                            <Icon name="chevron-right" size={14} className="text-slate-600 group-hover:text-red-400" />
                        </button>
                    ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button onClick={onCancel} className="px-4 py-2 text-sm rounded bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
