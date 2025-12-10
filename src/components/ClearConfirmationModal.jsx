import Icon from './Icon';

const ClearConfirmationModal = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-300 space-y-4">
            <h3 className="text-xl font-bold text-red-500 flex items-center gap-2"><Icon name="alert-triangle" size={20} /> CONFIRM DATABASE WIPE</h3>
            <p className="text-sm text-slate-300">This action will permanently delete all accepted questions saved in the database for this application. Are you sure you want to proceed?</p>
            <div className="flex justify-end gap-3">
                <button onClick={onCancel} className="px-4 py-2 text-sm rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 text-sm rounded bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">Wipe All Data</button>
            </div>
        </div>
    </div>
);

export default ClearConfirmationModal;
