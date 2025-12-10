import { useState } from 'react';
import Icon from './Icon';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    const [inputValue, setInputValue] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (inputValue === 'DELETE') {
            onConfirm();
            setInputValue('');
        } else {
            alert('You must type DELETE exactly to confirm.');
        }
    };

    const handleClose = () => {
        setInputValue('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border-2 border-red-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-red-900 bg-red-950/30">
                    <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
                        <Icon name="alert-triangle" className="text-red-500" />
                        {title}
                    </h2>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-slate-300 text-sm whitespace-pre-line">{message}</p>

                    <div>
                        <label className="block text-xs font-bold uppercase text-red-400 mb-2">
                            Type DELETE to confirm:
                        </label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="DELETE"
                            className="w-full px-3 py-2 bg-slate-800 border border-red-900/50 rounded text-sm text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm();
                                if (e.key === 'Escape') handleClose();
                            }}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={inputValue !== 'DELETE'}
                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
