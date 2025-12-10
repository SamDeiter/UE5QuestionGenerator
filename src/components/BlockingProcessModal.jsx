import Icon from './Icon';

const BlockingProcessModal = ({ isProcessing, status, translationProgress }) => {
    if (!isProcessing) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-orange-600 p-8 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 space-y-4 text-center">
                <Icon name="loader" size={32} className="text-orange-500 mx-auto animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white">Working on Data...</h3>
                <p className="text-sm text-slate-300">{status}</p>
                {translationProgress > 0 && translationProgress < 100 && (
                    <div className="relative h-2 w-full bg-indigo-900 rounded-lg overflow-hidden mt-4">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${translationProgress}%` }}></div>
                    </div>
                )}
                {translationProgress > 0 && <span className="text-xs text-indigo-400 font-bold">{translationProgress}% Complete</span>}
            </div>
        </div>
    );
};

export default BlockingProcessModal;
