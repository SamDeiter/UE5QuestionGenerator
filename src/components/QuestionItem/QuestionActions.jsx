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

        // Check critique score if available
        const score = q.critiqueScore;
        if (score !== undefined && score !== null && score < 50) {
            if (showMessage) showMessage(`⛔ Score too low (${score}/100). Apply AI suggestions to improve.`, 4000);
            return;
        }

        // Warn for borderline scores (50-69)
        if (score !== undefined && score !== null && score < 70) {
            if (showMessage) showMessage(`⚠️ Accepted with low score (${score}/100). Consider reviewing.`, 3000);
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
            if (score < 50) {
                return 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed border border-red-900/50';
            }
            if (score < 70) {
                return 'bg-slate-800 text-yellow-500 hover:bg-yellow-900/20 hover:text-yellow-400 border border-yellow-700/50';
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
            if (score < 50) return `Score too low (${score}/100). Apply suggestions first.`;
            if (score < 70) return `Low score (${score}/100). Accept with caution.`;
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

                    {/* AI Critique Button - PRIMARY ACTION (must run first) */}
                    {appMode === 'review' && (
                        <>
                            <button
                                onClick={() => onCritique(q)}
                                disabled={isProcessing}
                                className={`p-2 rounded-lg transition-all ${q.critiqueScore !== undefined && q.critiqueScore !== null
                                        ? 'bg-slate-800 text-slate-500 hover:bg-orange-900/20 hover:text-orange-400'
                                        : 'bg-orange-600 text-white hover:bg-orange-500 animate-pulse shadow-lg shadow-orange-900/50'
                                    } disabled:opacity-50`}
                                title={q.critiqueScore !== undefined ? `Re-run AI Critique (Current: ${q.critiqueScore}/100)` : "⚡ Run AI Critique First!"}
                            >
                                <Icon name="zap" size={18} />
                            </button>

                            {/* Divider after primary action */}
                            <div className="w-px h-6 bg-slate-700"></div>

                            {/* Explain Answer - requires critique first */}
                            <button
                                onClick={() => onExplain && onExplain(q)}
                                disabled={isProcessing || (q.critiqueScore === undefined || q.critiqueScore === null)}
                                className={`p-2 rounded-lg transition-all ${q.critiqueScore === undefined || q.critiqueScore === null
                                        ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                                        : 'bg-slate-800 text-slate-500 hover:bg-indigo-900/20 hover:text-indigo-400'
                                    } disabled:opacity-50`}
                                title={q.critiqueScore === undefined ? "Run AI Critique first" : "Explain Answer"}
                            >
                                <Icon name="lightbulb" size={18} />
                            </button>

                            {/* Create Variations - requires critique first */}
                            <button
                                onClick={() => onVariate && onVariate(q)}
                                disabled={isProcessing || (q.critiqueScore === undefined || q.critiqueScore === null)}
                                className={`p-2 rounded-lg transition-all ${q.critiqueScore === undefined || q.critiqueScore === null
                                        ? 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                                        : 'bg-slate-800 text-slate-500 hover:bg-purple-900/20 hover:text-purple-400'
                                    } disabled:opacity-50`}
                                title={q.critiqueScore === undefined ? "Run AI Critique first" : "Create Variations"}
                            >
                                <Icon name="copy" size={18} />
                            </button>

                            {/* Copy Question Text - always available */}
                            <button
                                onClick={() => {
                                    const textArea = document.createElement("textarea");
                                    textArea.value = stripHtmlTags(q.question);
                                    document.body.appendChild(textArea);
                                    textArea.select();
                                    try {
                                        document.execCommand('copy');
                                        if (showMessage) showMessage("Question copied to clipboard", 2000);
                                    } catch (err) {
                                        console.error('Failed to copy', err);
                                    }
                                    document.body.removeChild(textArea);
                                }}
                                className="p-2 rounded-lg transition-all bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white"
                                title="Copy Question Text"
                            >
                                <Icon name="clipboard" size={18} />
                            </button>
                        </>
                    )}

                    <button
                        onClick={handleAccept}
                        className={`p-2 rounded-lg transition-all ${getAcceptButtonStyle()}`}
                        title={getAcceptTooltip()}
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

