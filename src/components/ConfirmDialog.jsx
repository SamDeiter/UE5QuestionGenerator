import Icon from './Icon';

const ConfirmDialog = ({ 
    isOpen, 
    title, 
    message, 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    onConfirm, 
    onCancel,
    isDanger = false 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 space-y-4">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isDanger ? 'text-red-500' : 'text-yellow-500'}`}>
                    <Icon name={isDanger ? "alert-triangle" : "help-circle"} size={24} />
                    {title}
                </h3>
                
                <div className="text-sm text-slate-300">
                    {message.split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? 'mt-2' : ''}>
                            {line}
                        </p>
                    ))}
                </div>
                
                <div className="flex gap-3 pt-4">
                    <button 
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors font-medium"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-2.5 text-sm rounded font-bold transition-colors ${
                            isDanger 
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

export default ConfirmDialog;
