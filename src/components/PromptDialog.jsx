import { useState } from 'react';
import Icon from './Icon';

const PromptDialog = ({
    isOpen,
    title,
    message,
    placeholder = "",
    expectedValue = null,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isDanger = false
}) => {
    const [inputValue, setInputValue] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (expectedValue && inputValue !== expectedValue) {
            alert(`Please type "${expectedValue}" exactly to confirm.`);
            return;
        }
        onConfirm(inputValue);
        setInputValue('');
    };

    const handleCancel = () => {
        setInputValue('');
        onCancel();
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 space-y-4">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDanger ? 'text-red-500' : 'text-yellow-500'}`}>
                    <Icon name={isDanger ? "alert-triangle" : "help-circle"} size={24} />
                    {title}
                </h3>

                <p className="text-sm text-slate-300 whitespace-pre-line">{message}</p>

                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirm();
                        if (e.key === 'Escape') handleCancel();
                    }}
                />

                {expectedValue && (
                    <p className="text-xs text-slate-500">
                        Type <span className="font-bold text-red-400">{expectedValue}</span> to confirm
                    </p>
                )}

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={handleCancel}
                        className="flex-1 px-4 py-2 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`flex-1 px-4 py-2 text-sm rounded font-bold transition-colors ${isDanger
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptDialog;
