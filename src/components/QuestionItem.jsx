import React from 'react';
import { useState} from 'react';
import ReviewProgressBar from './ReviewProgressBar';
import QuestionHeader from './QuestionItem/QuestionHeader';
import QuestionContent from './QuestionItem/QuestionContent';
import QuestionMetadata from './QuestionItem/QuestionMetadata';
import LanguageControls from './QuestionItem/LanguageControls';
import QuestionActions from './QuestionItem/QuestionActions';
import CritiqueSection from './QuestionItem/CritiqueSection';
import ValidationWarnings from './QuestionItem/ValidationWarnings';
import ExplanationDisplay from './QuestionItem/ExplanationDisplay';
import SourceContextCard from './QuestionItem/SourceContextCard';
import { getSecureItem } from '../utils/secureStorage';

const QuestionItem = ({
    q,
    onUpdateStatus,
    onExplain,
    onVariate,
    onCritique,
    onApplyRewrite,
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
                        onFix={() => onApplyRewrite && onApplyRewrite(q)}
                        onVerify={() => {
                            const config = getSecureItem('ue5_gen_config');
                            const reviewerName = config?.creatorName || 'Unknown';

                            onUpdateQuestion(q.id, {
                                ...q,
                                humanVerified: true,
                                humanVerifiedAt: new Date().toISOString(),
                                humanVerifiedBy: reviewerName
                            });

                            if (showMessage) showMessage("✓ Source verified! Click Accept to approve.", 2000);
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

                <LanguageControls
                    q={q}
                    availableLanguages={availableLanguages}
                    onSwitchLanguage={onSwitchLanguage}
                    onTranslateSingle={onTranslateSingle}
                    isProcessing={isProcessing}
                    appMode={appMode}
                />
            </div>

            <ValidationWarnings q={q} />

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

                <SourceContextCard
                    sourceUrl={q.sourceUrl}
                    sourceExcerpt={q.sourceExcerpt}
                    question={q.question}
                />

                <CritiqueSection
                    q={q}
                    appMode={appMode}
                    isProcessing={isProcessing}
                    onApplyRewrite={onApplyRewrite}
                    onUpdateQuestion={onUpdateQuestion}
                    onUpdateStatus={onUpdateStatus}
                    onExplain={onExplain}
                    onVariate={onVariate}
                    showMessage={showMessage}
                />

                <ExplanationDisplay explanation={q.explanation} />

                <QuestionMetadata q={q} />
            </div>
        </div>
    );
};

export default React.memo(QuestionItem);
