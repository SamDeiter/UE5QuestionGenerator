import React from 'react';
import Icon from './Icon';
import { computeWordDiff } from '../utils/helpers';

// Simple markdown to HTML converter
const parseMarkdown = (text) => {
    if (!text) return '';

    // Convert **bold** to <strong>
    let html = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');

    // Convert *italic* to <em> (must be done after bold to avoid conflicts)
    html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-200">$1</em>');

    // Convert `code` to <code>
    html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1 rounded text-orange-300">$1</code>');

    return html;
};

/**
 * Renders inline word-level diff with highlighting
 */
const DiffText = ({ oldText, newText }) => {
    const diff = computeWordDiff(oldText || '', newText || '');

    if (diff.length === 0) return <span className="text-white">{newText}</span>;

    // Check if there are any actual changes
    const hasChanges = diff.some(seg => seg.type !== 'unchanged');

    if (!hasChanges) {
        return <span className="text-white">{oldText}</span>;
    }

    return (
        <span className="leading-relaxed">
            {diff.map((segment, idx) => {
                if (segment.type === 'removed') {
                    return (
                        <span
                            key={idx}
                            className="text-slate-500 line-through"
                        >
                            {segment.text}
                        </span>
                    );
                }
                if (segment.type === 'added') {
                    return (
                        <span
                            key={idx}
                            className="bg-green-900/60 text-green-300 font-semibold px-0.5 rounded mx-0.5"
                        >
                            {segment.text}
                        </span>
                    );
                }
                return <span key={idx} className="text-white">{segment.text}</span>;
            })}
        </span>
    );
};

const CritiqueDisplay = ({ critique, onRewrite, isProcessing, suggestedRewrite, rewriteChanges, onApplyRewrite, onApplyAndAccept, originalQuestion, onExplain, onVariate }) => {
    if (!critique) return null;

    // Handle both old (string) and new (object with score) formats
    const isNewFormat = typeof critique === 'object' && critique.score !== undefined;
    const score = isNewFormat ? critique.score : null;
    const text = (isNewFormat ? critique.text : critique) || '';

    // Color coding based on score
    const getScoreColor = (score) => {
        if (score >= 90) return 'bg-green-900/30 border-green-700/50 text-green-300';
        if (score >= 70) return 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300';
        if (score >= 50) return 'bg-orange-900/30 border-orange-700/50 text-orange-300';
        return 'bg-red-900/30 border-red-700/50 text-red-300';
    };

    // Process text into structured sections
    const renderContent = () => {
        const lines = text.split('\n').filter(line => line.trim());
        const elements = [];
        let currentList = [];
        let listType = null; // 'bullet' or 'number'

        const flushList = () => {
            if (currentList.length > 0) {
                const ListTag = listType === 'number' ? 'ol' : 'ul';
                elements.push(
                    <ListTag key={`list-${elements.length}`} className={`${listType === 'number' ? 'list-decimal' : 'list-disc'} ml-4 space-y-1`}>
                        {currentList.map((item, i) => (
                            <li key={i} className="text-current" dangerouslySetInnerHTML={{ __html: parseMarkdown(item) }} />
                        ))}
                    </ListTag>
                );
                currentList = [];
                listType = null;
            }
        };

        lines.forEach((line, index) => {
            const trimmed = line.trim();

            // Check for bullet points (* item or - item)
            const bulletMatch = trimmed.match(/^[\*\-]\s+(.+)$/);
            if (bulletMatch) {
                if (listType !== 'bullet') flushList();
                listType = 'bullet';
                currentList.push(bulletMatch[1]);
                return;
            }

            // Check for numbered lists (1. item)
            const numberMatch = trimmed.match(/^\d+\.\s+(.+)$/);
            if (numberMatch) {
                if (listType !== 'number') flushList();
                listType = 'number';
                currentList.push(numberMatch[1]);
                return;
            }

            // Regular paragraph - flush any pending list first
            flushList();

            // Check if it's a heading (ends with :)
            if (trimmed.endsWith(':') && trimmed.length < 50) {
                elements.push(
                    <p key={index} className="font-semibold text-white mt-2 first:mt-0" dangerouslySetInnerHTML={{ __html: parseMarkdown(trimmed) }} />
                );
            } else {
                elements.push(
                    <p key={index} className="text-current" dangerouslySetInnerHTML={{ __html: parseMarkdown(trimmed) }} />
                );
            }
        });

        // Flush any remaining list
        flushList();

        return elements;
    };

    const questionChanged = suggestedRewrite && originalQuestion &&
        suggestedRewrite.question !== originalQuestion.question;

    return (
        <div className={`mb-3 p-3 border rounded-lg animate-in fade-in slide-in-from-top-2 ${isNewFormat ? getScoreColor(score) : 'bg-red-950/30 border-red-500/30'}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase">
                    <Icon name="zap" size={12} />
                    AI Critique
                </div>
                <div className="flex items-center gap-3">
                    {isNewFormat && (
                        <div className={`px-3 py-1.5 rounded-md border ${score >= 90 ? 'bg-green-500/20 border-green-500 text-green-400' :
                            score >= 70 ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                                score >= 50 ? 'bg-orange-500/20 border-orange-500 text-orange-400' :
                                    'bg-red-500/20 border-red-500 text-red-400'
                            }`}>
                            <span className="text-sm font-bold">SCORE: {score}/100</span>
                        </div>
                    )}
                    {onRewrite && !suggestedRewrite && (
                        <button
                            onClick={onRewrite}
                            disabled={isProcessing}
                            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Auto-rewrite this question based on critique"
                        >
                            <Icon name="edit" size={12} />
                            {isProcessing ? 'Rewriting...' : 'Rewrite'}
                        </button>
                    )}
                </div>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
                {renderContent()}
            </div>

            {/* Suggested Rewrite Section with Word-Level Diff */}
            {suggestedRewrite && (
                <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase text-indigo-300 flex items-center gap-1">
                                <Icon name="sparkles" size={12} /> Suggested Improvement
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/50 flex items-center gap-1">
                                <Icon name="git-compare" size={10} />
                                Word Diff
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* WHY button - secondary */}
                            {onExplain && (
                                <button
                                    onClick={onExplain}
                                    disabled={isProcessing}
                                    className="px-3 py-1.5 rounded border border-indigo-500 bg-indigo-950/50 hover:bg-indigo-900/50 text-indigo-300 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                    title="Explain the answer"
                                >
                                    <Icon name="lightbulb" size={14} /> WHY
                                </button>
                            )}
                            {/* REMIX button - secondary */}
                            {onVariate && (
                                <button
                                    onClick={onVariate}
                                    disabled={isProcessing}
                                    className="px-3 py-1.5 rounded border border-purple-500 bg-purple-950/50 hover:bg-purple-900/50 text-purple-300 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                    title="Generate similar questions"
                                >
                                    <Icon name="git-branch" size={14} /> REMIX
                                </button>
                            )}
                            {/* Divider */}
                            <div className="w-px h-8 bg-slate-600"></div>
                            {/* APPLY button - PRIMARY ACTION */}
                            <button
                                onClick={onApplyRewrite}
                                className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-green-900/50 animate-pulse hover:animate-none"
                                title="✓ Apply AI improvements to this question"
                            >
                                <Icon name="check-circle" size={18} /> APPLY
                            </button>

                        </div>
                    </div>

                    {rewriteChanges && (
                        <div className="mb-2 text-xs text-indigo-200 bg-indigo-900/20 p-2 rounded border border-indigo-500/30 flex items-start gap-2">
                            <Icon name="info" size={14} className="flex-shrink-0 mt-0.5" />
                            <span><span className="font-bold text-indigo-100">Why:</span> {rewriteChanges}</span>
                        </div>
                    )}

                    <div className="text-xs space-y-3 bg-black/20 p-3 rounded border border-white/5">
                        {/* Question with word-level diff */}
                        <div>
                            <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                                <Icon name="message-square" size={10} />
                                Question
                            </div>
                            <div className="text-sm">
                                {questionChanged && originalQuestion ? (
                                    <DiffText oldText={originalQuestion.question} newText={suggestedRewrite.question} />
                                ) : (
                                    <span className="text-white">{suggestedRewrite.question}</span>
                                )}
                            </div>
                        </div>

                        {/* Options with word-level diff */}
                        <div>
                            <div className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                                <Icon name="list" size={10} />
                                Options
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 pl-2 border-l-2 border-indigo-500/30">
                                {['A', 'B', 'C', 'D'].map(letter => {
                                    const newVal = suggestedRewrite.options?.[letter];
                                    if (!newVal) return null;

                                    const oldVal = originalQuestion?.options?.[letter];
                                    const isChanged = oldVal && oldVal !== newVal;
                                    const isCorrect = suggestedRewrite.correct === letter;

                                    return (
                                        <div
                                            key={letter}
                                            className={`flex items-start gap-2 ${isCorrect ? 'text-green-400 font-bold' : ''}`}
                                        >
                                            <span className={`flex-shrink-0 w-5 h-5 rounded text-center text-[10px] leading-5 font-bold ${isChanged
                                                ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                                                : 'bg-slate-800 text-slate-400'
                                                }`}>
                                                {letter}
                                            </span>
                                            <span className="flex-1">
                                                {isChanged ? (
                                                    <DiffText oldText={oldVal} newText={newVal} />
                                                ) : (
                                                    <span className={isCorrect ? 'text-green-400' : 'text-slate-300'}>{newVal}</span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Correct answer change indicator */}
                        {originalQuestion && suggestedRewrite.correct !== originalQuestion.correct && (
                            <div className="flex items-center gap-2 text-xs text-yellow-200 bg-yellow-950/30 border border-yellow-700/50 rounded p-2">
                                <Icon name="alert-triangle" size={14} />
                                <span>
                                    Correct answer changed:
                                    <span className="ml-1 bg-red-900/50 text-red-300 line-through px-1.5 py-0.5 rounded">{originalQuestion.correct}</span>
                                    <span className="mx-1">→</span>
                                    <span className="bg-green-900/50 text-green-300 font-bold px-1.5 py-0.5 rounded">{suggestedRewrite.correct}</span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
};

export default CritiqueDisplay;

