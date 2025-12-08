import React, { useState, useRef, useEffect } from 'react';
import Icon from '../Icon';
import { stripHtmlTags } from '../../utils/helpers';

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
    onExplain,
    onVariate,
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

    // Handle accept with verification and score check
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

        // Check critique score if available - must be 70+ to accept
        const score = q.critiqueScore;
        if (score !== undefined && score !== null && score < 70) {
            if (showMessage) showMessage(`⛔ Score too low (${score}/100). Must be 70+ to accept. Apply AI suggestions to improve.`, 4000);
            return;
        }

        onUpdateStatus(q.id, 'accepted');
    };

    // Get accept button styling based on score
    const getAcceptButtonStyle = () => {
        if (q.status === 'accepted') {
            return 'bg-green-600 text-white shadow-lg shadow-green-900/50';
        }

        if (!q.humanVerified) {
            return 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed';
        }

        const score = q.critiqueScore;

        // Score-based styling
        if (score !== undefined && score !== null) {
            if (score < 70) {
                return 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed border border-red-900/50';
            }
            // High score - ready to accept
            return 'bg-slate-800 text-green-500 hover:bg-green-900/20 hover:text-green-400 border border-green-700/50';
        }

        // No score yet - normal state
        return 'bg-slate-800 text-slate-500 hover:bg-green-900/20 hover:text-green-500';
    };

    // Get accept button tooltip
    const getAcceptTooltip = () => {
        if (q.status === 'accepted') return 'Already accepted';
        if (!q.humanVerified) return 'Verify first before accepting';

        const score = q.critiqueScore;
        if (score !== undefined && score !== null) {
            if (score < 70) return `Score too low (${score}/100). Must be 70+ to accept.`;
            return `Good score (${score}/100). Ready to accept!`;
        }

        return 'Accept question';
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
                // REVIEW MODE: Show AI Critique -> Verify -> Other Actions -> Accept/Reject
                <>
                    {/* AI Critique Button - Step 1: Run critique first */}
                    {appMode === 'review' && (
                        <button
                            onClick={() => onCritique(q)}
                            disabled={isProcessing}
                            className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                                // Has a score OR already accepted/rejected = don't flash
                                (q.critiqueScore !== undefined && q.critiqueScore !== null) || q.status === 'accepted' || q.status === 'rejected'
                                    ? 'bg-slate-800 text-slate-500 hover:bg-orange-900/20 hover:text-orange-400'
                                    : 'bg-orange-600 text-white hover:bg-orange-500 animate-pulse shadow-lg shadow-orange-900/50'
                                } disabled:opacity-50`}
                            title={q.critiqueScore !== undefined ? `Re-run AI Critique (Current: ${q.critiqueScore}/100)` : "⚡ Step 1: Run AI Critique!"}
                        >
                            <Icon name="zap" size={18} />
                            <span className="text-xs font-bold">
                                {(q.critiqueScore !== undefined && q.critiqueScore !== null) || q.status === 'accepted' ? 'REDO' : 'CRITIQUE'}
                            </span>
                        </button>
                    )}

                    {/* Human Verification Button - Step 2: Verify after critique */}
                    {appMode === 'review' && (
                        <button
                            onClick={handleVerify}
                            disabled={q.humanVerified || !(q.critiqueScore !== undefined && q.critiqueScore !== null) || q.critiqueScore < 70}
                            className={`p-2 rounded-lg transition-all flex items-center gap-1 ${q.humanVerified
                                ? 'bg-green-600 text-white shadow-lg shadow-green-900/50'
                                : (q.critiqueScore !== undefined && q.critiqueScore !== null && q.critiqueScore < 70)
                                    ? 'bg-slate-800 text-red-500 opacity-50 cursor-not-allowed border border-red-900/50'
                                    : (q.critiqueScore !== undefined && q.critiqueScore !== null && !q.humanVerified)
                                        ? 'bg-green-600 text-white hover:bg-green-500 animate-pulse shadow-lg shadow-green-900/50'
                                        : 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                                }`}
                            title={
                                q.humanVerified
                                    ? `✓ Verified by ${q.humanVerifiedBy}`
                                    : (q.critiqueScore !== undefined && q.critiqueScore !== null && q.critiqueScore < 70)
                                        ? `⛔ Score too low (${q.critiqueScore}/100). Must be 70+ to verify. Apply AI suggestions to improve.`
                                        : (q.critiqueScore !== undefined && q.critiqueScore !== null)
                                            ? "Step 2: Click to verify source & answer are correct"
                                            : "Run AI Critique first"
                            }
                            aria-label="Mark as human-verified"
                        >
                            <Icon name={q.humanVerified ? "check-circle" : "eye"} size={18} />
                            <span className="text-xs font-bold">{q.humanVerified ? "OK" : "VERIFY"}</span>
                        </button>
                    )}

                    {/* Accept Button with text */}
                    <button
                        onClick={handleAccept}
                        className={`p-2 rounded-lg transition-all flex items-center gap-1 ${getAcceptButtonStyle()}`}
                        title={getAcceptTooltip()}
                        aria-label="Accept question"
                    >
                        <Icon name="check" size={18} />
                        <span className="text-xs font-bold">ACCEPT</span>
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
                            className={`p-2 rounded-lg transition-all flex items-center gap-1 ${q.status === 'rejected' ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-slate-800 text-slate-500 hover:bg-red-900/20 hover:text-red-500'}`}
                            title={q.status === 'rejected' && q.rejectionReason ? `Rejected: ${REJECTION_REASONS.find(r => r.id === q.rejectionReason)?.label || q.rejectionReason}` : "Reject"}
                            aria-label="Reject question"
                        >
                            <Icon name="x" size={18} />
                            <span className="text-xs font-bold">REJECT</span>
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
            )
            }
        </div >
    );
};

export default QuestionActions;

