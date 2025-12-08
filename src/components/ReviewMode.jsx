import React from 'react';
import Icon from './Icon';
import QuestionItem from './QuestionItem';

const ReviewMode = ({
    questions,
    currentIndex,
    setCurrentIndex,
    onUpdateStatus,
    onExplain,
    onVariate,
    onCritique,
    onTranslateSingle,
    onSwitchLanguage,
    onDelete,
    onUpdateQuestion,
    translationMap,
    isProcessing,
    showMessage
}) => {
    if (!questions || questions.length === 0) return null;

    const currentQuestion = questions[currentIndex];

    if (!currentQuestion) {
        return <div className="text-center p-10 text-slate-500">No question selected.</div>;
    }
    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < questions.length - 1;

    // Auto-adjust index if out of bounds (e.g. after accepting an item and list shrinks)
    React.useEffect(() => {
        if (currentIndex >= questions.length && questions.length > 0) {
            setCurrentIndex(questions.length - 1);
        }
    }, [questions.length, currentIndex, setCurrentIndex]);

    return (
        <div className="flex flex-col items-center justify-start h-full max-w-4xl mx-auto w-full pt-4">
            <div className="w-full mb-6 flex justify-between items-center text-slate-400 text-xs font-mono bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                <button
                    onClick={() => setCurrentIndex(prev => Math.max(prev - 1, 0))}
                    disabled={!canGoPrev}
                    className="flex items-center gap-2 px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
                >
                    <Icon name="arrow-left" size={16} /> PREV
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-slate-500 uppercase text-[10px] tracking-widest">Review Progress</span>
                    <span className="text-lg">
                        <span className="text-white font-bold">{currentIndex + 1}</span> <span className="text-slate-600">/</span> <span className="text-slate-400 font-bold">{questions.length}</span>
                    </span>
                    {/* Score Badge */}
                    {currentQuestion.critiqueScore !== undefined && currentQuestion.critiqueScore !== null && (
                        <span
                            className={`mt-1 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 ${currentQuestion.critiqueScore >= 80 ? 'bg-green-900/50 text-green-400 border border-green-700/50' :
                                    currentQuestion.critiqueScore >= 60 ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50' :
                                        currentQuestion.critiqueScore >= 40 ? 'bg-orange-900/50 text-orange-400 border border-orange-700/50' :
                                            'bg-red-900/50 text-red-400 border border-red-700/50'
                                }`}
                            title={`AI Critique Score: ${currentQuestion.critiqueScore}/100`}
                        >
                            <Icon name="brain" size={12} />
                            Score: {currentQuestion.critiqueScore}/100
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setCurrentIndex(prev => Math.min(prev + 1, questions.length - 1))}
                    disabled={!canGoNext}
                    className="flex items-center gap-2 px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold"
                >
                    NEXT <Icon name="arrow-right" size={16} />
                </button>
            </div>

            <div className="w-full transform transition-all duration-300">
                <QuestionItem
                    key={currentQuestion.uniqueId}
                    q={currentQuestion}
                    onUpdateStatus={onUpdateStatus}
                    onExplain={onExplain}
                    onVariate={onVariate}
                    onCritique={onCritique}
                    onTranslateSingle={onTranslateSingle}
                    onSwitchLanguage={onSwitchLanguage}
                    onDelete={onDelete}
                    onUpdateQuestion={onUpdateQuestion}
                    availableLanguages={translationMap.get(currentQuestion.uniqueId)}
                    isProcessing={isProcessing}
                    appMode="review"
                    showMessage={showMessage}
                />
            </div>
        </div>
    );
};

export default ReviewMode;
