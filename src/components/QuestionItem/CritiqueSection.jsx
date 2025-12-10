import React from 'react';
import CritiqueDisplay from '../CritiqueDisplay';
import { getSecureItem } from '../../utils/secureStorage';

const CritiqueSection = ({
    q,
    appMode,
    isProcessing,
    onApplyRewrite,
    onUpdateQuestion,
    onUpdateStatus,
    onExplain,
    onVariate,
    showMessage
}) => {
    if (appMode !== 'review' || (!q.critique && !q.critiqueScore)) {
        return null;
    }

    const handleApplyAndAccept = () => {
        if (!q.suggestedRewrite) return;
        
        // Get reviewer name for verification
        const config = getSecureItem('ue5_gen_config');
        const reviewerName = config?.creatorName || 'Unknown';

        // Apply changes + mark verified + accept
        const updatedQ = {
            ...q,
            question: q.suggestedRewrite.question,
            options: q.suggestedRewrite.options,
            correct: q.suggestedRewrite.correct,
            suggestedRewrite: null,
            rewriteChanges: null,
            critique: null,
            critiqueScore: 100, // AI-improved score
            humanVerified: true,
            humanVerifiedAt: new Date().toISOString(),
            humanVerifiedBy: reviewerName,
            status: 'accepted'
        };
        
        onUpdateQuestion(q.id, updatedQ);
        onUpdateStatus(q.id, 'accepted');
        if (showMessage) showMessage('✓ Applied & Accepted!', 3000);
    };

    return (
        <CritiqueDisplay
            critique={q.critiqueScore ? { score: q.critiqueScore, text: q.critique } : q.critique}
            onRewrite={undefined} // Removed old rewrite handler
            isProcessing={isProcessing}
            suggestedRewrite={q.suggestedRewrite}
            rewriteChanges={q.rewriteChanges}
            originalQuestion={q}
            onApplyRewrite={() => onApplyRewrite && onApplyRewrite(q)}
            onApplyAndAccept={handleApplyAndAccept}
            onExplain={onExplain ? () => onExplain(q) : undefined}
            onVariate={onVariate ? () => onVariate(q) : undefined}
        />
    );
};

export default CritiqueSection;
