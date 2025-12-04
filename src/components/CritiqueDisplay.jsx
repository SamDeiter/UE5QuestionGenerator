import React from 'react';
import Icon from './Icon';

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

const CritiqueDisplay = ({ critique, onRewrite, isProcessing }) => {
    if (!critique) return null;

    // Handle both old (string) and new (object with score) formats
    const isNewFormat = typeof critique === 'object' && critique.score !== undefined;
    const score = isNewFormat ? critique.score : null;
    const text = isNewFormat ? critique.text : critique;

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

    return (
        <div className={`mb-3 p-3 border rounded-lg animate-in fade-in slide-in-from-top-2 ${isNewFormat ? getScoreColor(score) : 'bg-red-950/30 border-red-500/30'}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase">
                    <Icon name="zap" size={12} />
                    AI Critique
                </div>
                <div className="flex items-center gap-2">
                    {isNewFormat && (
                        <div className="px-2 py-1 rounded bg-black/30 border border-current">
                            <span className="text-xs font-bold">Score: {score}/100</span>
                        </div>
                    )}
                    {onRewrite && (
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
        </div>
    );
};

export default CritiqueDisplay;
