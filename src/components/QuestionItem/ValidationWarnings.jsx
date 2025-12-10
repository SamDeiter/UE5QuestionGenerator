import React from 'react';
import Icon from '../Icon';

const ValidationWarnings = ({ q }) => {
    if (!q._validation?.isValid && !q.answerMismatch && !q.invalidUrl) {
        return null;
    }

    const hasAnswerWarning = q.answerMismatch ||
        (q._validation && !q._validation.isValid && q._validation.warnings.some(w => w.includes('Answer')));

    const hasUrlWarning = q.invalidUrl ||
        (q._validation && !q._validation.isValid && q._validation.warnings.some(w => w.includes('URL')));

    if (!hasAnswerWarning && !hasUrlWarning) {
        return null;
    }

    return (
        <div className="pl-6 mb-3 flex flex-col gap-2">
            {/* Answer Mismatch Warning */}
            {hasAnswerWarning && (
                <div className="flex items-center gap-2 p-2 bg-yellow-950/40 border border-yellow-700/40 rounded text-yellow-200 text-xs animate-in fade-in slide-in-from-top-1">
                    <Icon name="alert-triangle" size={14} className="text-yellow-500" />
                    <span><strong>Warning:</strong> Answer may not match source excerpt. Verify carefully.</span>
                </div>
            )}

            {/* Invalid URL Warning */}
            {hasUrlWarning && (
                <div className="flex items-center gap-2 p-2 bg-red-950/40 border border-red-700/40 rounded text-red-200 text-xs animate-in fade-in slide-in-from-top-1">
                    <Icon name="link" size={14} className="text-red-500" />
                    <span><strong>Warning:</strong> Source URL may be invalid or generic.</span>
                </div>
            )}
        </div>
    );
};

export default ValidationWarnings;
