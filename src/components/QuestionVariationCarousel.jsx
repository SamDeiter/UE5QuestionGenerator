import { useState } from 'react';
import Icon from '../Icon';

/**
 * QuestionVariationCarousel
 * Shows original question + its alternatives in a carousel interface
 */
const QuestionVariationCarousel = ({ originalQuestion, alternatives, onSelectVariation }) => {
    const allVersions = [originalQuestion, ...alternatives];
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentQuestion = allVersions[currentIndex];

    const canGoPrev = currentIndex > 0;
    const canGoNext = currentIndex < allVersions.length - 1;

    const handlePrev = () => {
        if (canGoPrev) setCurrentIndex(prev => prev - 1);
    };

    const handleNext = () => {
        if (canGoNext) setCurrentIndex(prev => prev + 1);
    };

    const handleSelect = () => {
        if (onSelectVariation) {
            onSelectVariation(currentQuestion);
        }
    };

    return (
        <div className="border-2 border-purple-500/50 rounded-lg p-4 bg-purple-950/20">
            {/* Navigation Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-500/30">
                <button
                    onClick={handlePrev}
                    disabled={!canGoPrev}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Previous variation"
                >
                    <Icon name="arrow-left" size={16} />
                    <span className="text-sm font-bold">PREV</span>
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-xs uppercase tracking-widest text-purple-400 font-bold mb-1">
                        {currentIndex === 0 ? '📝 Original' : `🔄 Alternative ${currentIndex}`}
                    </span>
                    <span className="text-lg font-bold">
                        <span className="text-white">{currentIndex + 1}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-slate-400">{allVersions.length}</span>
                    </span>
                </div>

                <button
                    onClick={handleNext}
                    disabled={!canGoNext}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Next variation"
                >
                    <span className="text-sm font-bold">NEXT</span>
                    <Icon name="arrow-right" size={16} />
                </button>
            </div>

            {/* Question Display */}
            <div className="mb-4">
                <h3 className="text-base font-medium text-slate-200 leading-relaxed mb-3">
                    {currentQuestion.question}
                </h3>

                {/* Options */}
                {currentQuestion.type === 'Multiple Choice' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(currentQuestion.options || {}).map(([key, val]) => {
                            const isCorrect = currentQuestion.correct === key;
                            return (
                                <div 
                                    key={key} 
                                    className={`text-sm p-2 rounded border transition-all ${
                                        isCorrect 
                                            ? 'bg-green-700/50 border-green-400 text-white' 
                                            : 'bg-slate-950 border-slate-800 text-slate-400'
                                    }`}
                                >
                                    <span className={`font-bold mr-2 ${isCorrect ? 'text-white' : 'text-slate-600'}`}>
                                        {key})
                                    </span>
                                    <span>{val}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {currentQuestion.type === 'True/False' && (
                    <div className="flex gap-4">
                        <div className={`px-3 py-1 rounded text-xs border transition-all ${
                            currentQuestion.correct === 'A' 
                                ? 'bg-green-700/50 border-green-400 text-white' 
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}>
                            TRUE
                        </div>
                        <div className={`px-3 py-1 rounded text-xs border transition-all ${
                            currentQuestion.correct === 'B' 
                                ? 'bg-red-700/50 border-red-400 text-white' 
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}>
                            FALSE
                        </div>
                    </div>
                )}
            </div>

            {/* Action: Select This Version */}
            {currentIndex > 0 && (
                <div className="flex justify-center pt-3 border-t border-purple-500/30">
                    <button
                        onClick={handleSelect}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg"
                    >
                        <Icon name="check" size={16} className="inline mr-2" />
                        Use This Alternative
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuestionVariationCarousel;
