import React, { useState, useRef, useEffect } from 'react';
import Icon from '../Icon';

// Rejection reason options
const REJECTION_REASONS = [
    { id: 'too_easy', label: 'Too Easy', icon: 'arrow-down' },
    { id: 'too_hard', label: 'Too Difficult', icon: 'arrow-up' },
    { id: 'incorrect', label: 'Incorrect Answer', icon: 'x-circle' },
    { id: 'unclear', label: 'Unclear Question', icon: 'help-circle' },
    { id: 'duplicate', label: 'Duplicate', icon: 'copy' },
    { id: 'poor_quality', label: 'Poor Quality', icon: 'thumbs-down' },
    { id: 'bad_source', label: 'Bad/Missing Source', icon: 'link-2' },
    { id: 'other', label: 'Other', icon: 'more-horizontal' },
];

const QuestionActions = ({
    q,
    onUpdateStatus,
    onCritique,
    onDelete,
    onUpdateQuestion,
    isProcessing,
    appMode,
    showMessage
}) => {
    const [rejectMenuOpen, setRejectMenuOpen] = useState(false);
    const rejectMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (rejectMenuRef.current && !rejectMenuRef.current.contains(event.target)) {
                setRejectMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle human verification
    const handleVerify = () => {
        const reviewerName = localStorage.getItem('ue5_gen_config')
            ? JSON.parse(localStorage.getItem('ue5_gen_config')).creatorName || 'Unknown'
            : 'Unknown';

        onUpdateQuestion(q.id, {
            ...q,
            humanVerified: true,
            humanVerifiedAt: new Date().toISOString(),
            humanVerifiedBy: reviewerName
        });
        if (showMessage) showMessage("✓ Question verified! You can now accept it.", 3000);
    };

    // Handle accept with verification check
    const handleAccept = () => {
        if (q.status === 'accepted') {
            if (showMessage) showMessage("Question is already accepted.");
            return;
        }

        // Require human verification before accepting
        if (!q.humanVerified) {
            if (showMessage) showMessage("⚠️ Please verify source & answer first (click the shield icon)", 4000);
            return;
        }

        onUpdateStatus(q.id, 'accepted');
    };

    if (appMode === 'database') return null;

    return (
        <div className="flex items-center gap-2">
            {appMode === 'create' ? (
                // CREATE MODE: Only show Delete (Discard) button
                <button
                    onClick={() => onDelete(q.id)}
                    className="p-2 rounded-lg transition-all bg-slate-800 text-slate-500 hover:bg-red-900/30 hover:text-red-400 border border-slate-700 hover:border-red-900/50"
                    title="Discard this question"
                    aria-label="Discard question"
                >
                    <Icon name="trash-2" size={18} />
                </button>
            ) : (
                // REVIEW MODE: Show Verify/AI Critique/Accept/Reject
                <>
                    {/* Human Verification Button - REQUIRED before accepting */}
                    {appMode === 'review' && (
                        <button
                            onClick={handleVerify}
                            disabled={q.humanVerified}
                            className={`p-2 rounded-lg transition-all ${q.humanVerified
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                    : 'bg-slate-800 text-slate-500 hover:bg-indigo-900/20 hover:text-indigo-400 border border-indigo-900/50 animate-pulse'
                                }`}
                            title={q.humanVerified
                                ? `Verified by ${q.humanVerifiedBy} at ${new Date(q.humanVerifiedAt).toLocaleString()}`
                                : "Click after verifying source & answer are correct"}
                            aria-label="Mark as human-verified"
                        >
                            <Icon name={q.humanVerified ? "shield-check" : "shield"} size={18} />
                        </button>
                    )}

                    {/* AI Critique Button */}
                    {appMode === 'review' && (
                        <button
                            onClick={() => onCritique(q)}
                            disabled={isProcessing}
                            className="p-2 rounded-lg transition-all bg-slate-800 text-slate-500 hover:bg-orange-900/20 hover:text-orange-400 disabled:opacity-50"
                            title="AI Critique"
                            aria-label="Get AI critique for this question"
                        >
                            <Icon name="zap" size={18} />
                        </button>
                    )}

                    <button
                        onClick={handleAccept}
                        className={`p-2 rounded-lg transition-all ${q.status === 'accepted'
                                ? 'bg-green-600 text-white shadow-lg shadow-green-900/50'
                                : q.humanVerified
                                    ? 'bg-slate-800 text-slate-500 hover:bg-green-900/20 hover:text-green-500'
                                    : 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                            }`}
                        title={q.humanVerified ? "Accept" : "Verify first before accepting"}
                        aria-label="Accept question"
                    >
                        <Icon name="check" size={18} />
                    </button>

                    {/* Reject Button with Reason Dropdown */}
                    <div className="relative" ref={rejectMenuRef}>
                        <button
                            onClick={() => {
                                if (q.status === 'rejected') {
                                    if (showMessage) showMessage(`Already rejected${q.rejectionReason ? `: ${REJECTION_REASONS.find(r => r.id === q.rejectionReason)?.label || q.rejectionReason}` : ''}`);
                                } else {
                                    setRejectMenuOpen(!rejectMenuOpen);
                                }
                            }}
                            className={`p-2 rounded-lg transition-all ${q.status === 'rejected' ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-slate-800 text-slate-500 hover:bg-red-900/20 hover:text-red-500'}`}
                            title={q.status === 'rejected' && q.rejectionReason ? `Rejected: ${REJECTION_REASONS.find(r => r.id === q.rejectionReason)?.label || q.rejectionReason}` : "Reject"}
                            aria-label="Reject question"
                        >
                            <Icon name="x" size={18} />
                        </button>

                        {rejectMenuOpen && (
                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-800 border border-red-900/50 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-3 py-2 bg-red-900/30 border-b border-red-900/50">
                                    <span className="text-xs font-bold text-red-400 uppercase">Reject Because:</span>
                                </div>
                                <div className="py-1">
                                    {REJECTION_REASONS.map(reason => (
                                        <button
                                            key={reason.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateStatus(q.id, 'rejected', reason.id);
                                                setRejectMenuOpen(false);
                                                if (showMessage) showMessage(`Rejected: ${reason.label}`);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-red-900/30 hover:text-red-300 flex items-center gap-2 transition-colors"
                                        >
                                            <Icon name={reason.icon} size={14} className="text-red-400" />
                                            {reason.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default QuestionActions;

