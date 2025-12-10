import React from 'react';
import Icon from '../Icon';
import { renderMarkdown } from '../../utils/helpers';

const ExplanationDisplay = ({ explanation }) => {
    if (!explanation) {
        return null;
    }

    return (
        <div className="mb-3 p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-1 text-indigo-300 text-sm font-bold uppercase">
                <Icon name="lightbulb" size={14} /> Explanation
            </div>
            <div
                className="text-sm text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(explanation) }}
            />
        </div>
    );
};

export default ExplanationDisplay;
