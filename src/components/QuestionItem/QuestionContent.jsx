import { sanitizeText } from '../../utils/stringHelpers';

const QuestionContent = ({
    q,
    isEditing,
    editedText,
    setEditedText,
    setIsEditing,
    onUpdateQuestion,
    showMessage,
    appMode
}) => {
    return (
        <>
            <div className="mb-4">
                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full bg-slate-800 border border-indigo-500 rounded-lg p-3 text-slate-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setIsEditing(false); setEditedText(q.question); }} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg">Cancel</button>
                            <button onClick={() => { if (onUpdateQuestion) { onUpdateQuestion(q.id, { question: editedText }); } setIsEditing(false); if (showMessage) showMessage('Question updated'); }} className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Save</button>
                        </div>
                    </div>
                ) : (
                    <h3
                        className={`text-base font-medium leading-relaxed cursor-pointer hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors ${q.status === 'rejected' ? 'text-slate-600 line-through decoration-slate-700' : 'text-slate-200'}`}
                        dangerouslySetInnerHTML={{ __html: sanitizeText(q.question) }}
                        onClick={() => appMode !== 'database' && setIsEditing(true)}
                        title={appMode !== 'database' ? 'Click to edit' : ''}
                    />
                )}
                <div className="flex items-center gap-3 mt-2">
                    {/* DEBUG ID: Helps verify linking */}
                    {q.uniqueId && (
                        <div className="text-[9px] text-slate-700 font-mono cursor-help" title={`Unique ID: ${q.uniqueId} (Use this to link translations)`}>
                            #{q.uniqueId.substring(0, 8)} | {q.language || 'English'}
                        </div>
                    )}
                </div>
            </div>

            {q.type === 'Multiple Choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {Object.entries(q.options || {}).map(([key, val]) => {
                        const isCorrect = q.correct === key;
                        // SAFEGUARD: If option text is missing/empty, show placeholder to maintain layout
                        const optionText = val && val.trim() ? val : "(Empty)";
                        return (
                            <div key={key} className={`text-sm p-2 rounded border transition-all ${isCorrect ? 'bg-green-700/50 border-green-400 text-white shadow-[0_0_10px_-3px_rgba(34,197,94,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                <span className={`font-bold mr-2 ${isCorrect ? 'text-white' : 'text-slate-600'}`}>{key})</span>
                                <span dangerouslySetInnerHTML={{ __html: sanitizeText(optionText) }} />
                            </div>
                        );
                    })}
                </div>
            )}

            {q.type === 'True/False' && (
                <div className="flex gap-4 mb-4">
                    <div className={`px-3 py-1 rounded text-xs border transition-all ${q.correct === 'A' ? 'bg-green-700/50 border-green-400 text-white shadow-[0_0_10px_-3px_rgba(34,197,94,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>TRUE</div>
                    <div className={`px-3 py-1 rounded text-xs border transition-all ${q.correct === 'B' ? 'bg-red-700/50 border-red-400 text-white shadow-[0_0_10px_-3px_rgba(239,68,68,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>FALSE</div>
                </div>
            )}
        </>
    );
};

export default QuestionContent;
