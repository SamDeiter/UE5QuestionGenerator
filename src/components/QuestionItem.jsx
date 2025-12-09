import React, { useState } from 'react';
import Icon from './Icon';
import CritiqueDisplay from './CritiqueDisplay';
import ReviewProgressBar from './ReviewProgressBar';
import { renderMarkdown } from '../utils/helpers';
import QuestionHeader from './QuestionItem/QuestionHeader';
import QuestionContent from './QuestionItem/QuestionContent';
import QuestionMetadata from './QuestionItem/QuestionMetadata';
import LanguageControls from './QuestionItem/LanguageControls';
import QuestionActions from './QuestionItem/QuestionActions';
import QuestionMenu from './QuestionItem/QuestionMenu';
import { sanitizeMarkdown } from '../utils/sanitize';
import { getSecureItem } from '../utils/secureStorage';

const QuestionItem = ({
    q,
    onUpdateStatus,
    onExplain,
    onVariate,
    onCritique,
    onRewrite,
    onTranslateSingle,
    onSwitchLanguage,
    onDelete,
    onUpdateQuestion,
    onKickBack,
    availableLanguages,
    isProcessing,
    appMode,
    showMessage,
    isSelected,
    onToggleSelect,
    showCheckbox
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(q.question);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'accepted': return 'ring-1 ring-green-500/50';
            case 'rejected': return 'border-red-900/50 bg-slate-950/80 opacity-50 grayscale';
            default: return '';
        }
    };

    const getGradient = (d) => {
        switch (d?.toLowerCase()) {
            case 'easy': return 'bg-gradient-to-br from-slate-900/50 to-green-950 border-green-700 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]';
            case 'medium': return 'bg-gradient-to-br from-slate-900/50 to-yellow-950 border-yellow-700 shadow-[0_0_15px_-5px_rgba(234,179,8,0.3)]';
            case 'hard': return 'bg-gradient-to-br from-slate-900/50 to-red-950 border-red-700 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]';
            default: return 'bg-slate-900 border-slate-800';
        }
    };

    const getDiffBadgeColor = (d) => {
        switch (d?.toLowerCase()) {
            case 'easy': return 'bg-green-950 text-green-400 border-green-900';
            case 'medium': return 'bg-yellow-950 text-amber-300 border-yellow-900';
            case 'hard': return 'bg-red-950 text-red-400 border-red-900';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const isRejected = q.status === 'rejected';

    return (
        <div className={`group rounded-lg border shadow-sm transition-all p-4 relative ${getGradient(q.difficulty)} ${getStatusStyle(q.status)}`}>
            {/* Selection Checkbox */}
            {showCheckbox && (
                <div className="absolute top-4 left-4 z-20">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                </div>
            )}

            <div className="flex flex-col gap-2 mb-3 pl-6">
                {/* Top Row: Badges & Actions */}
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <QuestionHeader
                            q={q}
                            getDiffBadgeColor={getDiffBadgeColor}
                            onKickBack={onKickBack}
                            appMode={appMode}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* QuestionMenu Removed - Actions moved to QuestionActions */}
                        {/* <QuestionMenu ... /> */}

                        <QuestionActions
                            q={q}
                            onUpdateStatus={onUpdateStatus}
                            onCritique={onCritique}
                            onExplain={onExplain}
                            onVariate={onVariate}
                            onDelete={onDelete}
                            onUpdateQuestion={onUpdateQuestion}
                            isProcessing={isProcessing}
                            appMode={appMode}
                            showMessage={showMessage}
                        />
                    </div>
                </div>

                {/* Review Progress Bar - Only in Review Mode */}
                {appMode === 'review' && (
                    <ReviewProgressBar
                        question={q}
                        onCritique={() => onCritique?.(q)}
                        onVerify={() => {
                            const reviewerName = localStorage.getItem('ue5_gen_config')
                                ? JSON.parse(localStorage.getItem('ue5_gen_config')).creatorName || 'Unknown'
                                : 'Unknown';

                            // Auto-accept for high scores (≥70)
                            const autoAccept = q.critiqueScore >= 70;

                            onUpdateQuestion(q.id, {
                                ...q,
                                humanVerified: true,
                                humanVerifiedAt: new Date().toISOString(),
                                humanVerifiedBy: reviewerName,
                                ...(autoAccept && { status: 'accepted' }) // Auto-accept if high score
                            });

                            if (autoAccept) {
                                onUpdateStatus(q.id, 'accepted');
                                if (showMessage) showMessage("✓ Verified & Accepted! (Score ≥ 70)", 3000);
                            } else {
                                if (showMessage) showMessage("✓ Question verified!", 2000);
                            }
                        }}
                        onAccept={() => {
                            if (!q.humanVerified) {
                                if (showMessage) showMessage("⚠️ Please verify first", 3000);
                                return;
                            }
                            onUpdateStatus(q.id, 'accepted');
                        }}
                        isProcessing={isProcessing}
                    />
                )}

                {/* Language Controls */}
                <LanguageControls
                    q={q}
                    availableLanguages={availableLanguages}
                    onSwitchLanguage={onSwitchLanguage}
                    onTranslateSingle={onTranslateSingle}
                    isProcessing={isProcessing}
                    appMode={appMode}
                />
            </div>

            {/* Validation Warnings */}
            {(!q._validation?.isValid || q.answerMismatch || q.invalidUrl) && (
                <div className="pl-6 mb-3 flex flex-col gap-2">
                    {/* Answer Mismatch Warning */}
                    {(q.answerMismatch || (q._validation && !q._validation.isValid && q._validation.warnings.some(w => w.includes('Answer')))) && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-950/40 border border-yellow-700/40 rounded text-yellow-200 text-xs animate-in fade-in slide-in-from-top-1">
                            <Icon name="alert-triangle" size={14} className="text-yellow-500" />
                            <span><strong>Warning:</strong> Answer may not match source excerpt. Verify carefully.</span>
                        </div>
                    )}

                    {/* Invalid URL Warning */}
                    {(q.invalidUrl || (q._validation && !q._validation.isValid && q._validation.warnings.some(w => w.includes('URL')))) && (
                        <div className="flex items-center gap-2 p-2 bg-red-950/40 border border-red-700/40 rounded text-red-200 text-xs animate-in fade-in slide-in-from-top-1">
                            <Icon name="link" size={14} className="text-red-500" />
                            <span><strong>Warning:</strong> Source URL may be invalid or generic.</span>
                        </div>
                    )}
                </div>
            )}

            <div className="pl-6">
                <QuestionContent
                    q={q}
                    isEditing={isEditing}
                    editedText={editedText}
                    setEditedText={setEditedText}
                    setIsEditing={setIsEditing}
                    onUpdateQuestion={onUpdateQuestion}
                    showMessage={showMessage}
                    appMode={appMode}
                />

                {/* Critique Display - Only show in Review mode */}
                {appMode === 'review' && (q.critique || q.critiqueScore) && (
                    <CritiqueDisplay
                        critique={q.critiqueScore ? { score: q.critiqueScore, text: q.critique } : q.critique}
                        onRewrite={appMode === 'review' && onRewrite ? () => onRewrite(q) : undefined}
                        isProcessing={isProcessing}
                        suggestedRewrite={appMode === 'review' ? q.suggestedRewrite : null}
                        rewriteChanges={appMode === 'review' ? q.rewriteChanges : null}
                        originalQuestion={q}
                        onApplyRewrite={async () => {
                            if (!q.suggestedRewrite) return;

                            const updatedQ = {
                                ...q,
                                question: q.suggestedRewrite.question,
                                options: q.suggestedRewrite.options,
                                correct: q.suggestedRewrite.correct,
                                suggestedRewrite: null,
                                rewriteChanges: null,
                                critique: null,
                                critiqueScore: null,
                                humanVerified: false // Reset - human must verify
                            };
                            onUpdateQuestion(q.id, updatedQ);
                            if (showMessage) showMessage("✓ Applied! Re-critiquing...", 2000);

                            // Auto-run critique to show new score (human still verifies)
                            if (onCritique) {
                                setTimeout(() => {
                                    onCritique({ ...updatedQ, id: q.id });
                                }, 300);
                            }
                        }}
                        onApplyAndAccept={() => {
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
                            if (showMessage) showMessage("✓ Applied & Accepted!", 3000);
                        }}
                        onExplain={appMode === 'review' && onExplain ? () => onExplain(q) : undefined}
                        onVariate={appMode === 'review' && onVariate ? () => onVariate(q) : undefined}
                    />
                )}

                {q.explanation && (
                    <div className="mb-3 p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-1 text-indigo-300 text-sm font-bold uppercase"><Icon name="lightbulb" size={14} /> Explanation</div>
                        <div className="text-sm text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(q.explanation) }} />
                    </div>
                )}

                <QuestionMetadata q={q} showMessage={showMessage} />
            </div>
        </div>
    );
};

export default React.memo(QuestionItem);
