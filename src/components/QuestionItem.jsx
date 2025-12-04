import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import FlagIcon from './FlagIcon';
import CritiqueDisplay from './CritiqueDisplay';
import { sanitizeText, formatUrl, getDisplayUrl, stripHtmlTags } from '../utils/helpers';
import { LANGUAGE_CODES, LANGUAGE_FLAGS } from '../utils/constants';

const QuestionItem = ({ q, onUpdateStatus, onExplain, onVariate, onCritique, onRewrite, onTranslateSingle, onSwitchLanguage, onDelete, onUpdateQuestion, onKickBack, availableLanguages, isProcessing, appMode, showMessage }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    // Track loading state per specific language flag
    const [loadingLang, setLoadingLang] = useState(null);

    const handleFlagClick = async (e, lang) => {
        e.stopPropagation();

        const currentLang = (q.language || 'English').trim();

        // Check if the translation ALREADY exists
        // Special case: English always exists if we're viewing a non-English question
        const langExists = (availableLanguages && availableLanguages.has(lang)) ||
            (lang === 'English' && currentLang !== 'English');

        if (langExists) {
            // It exists -> SWITCH VIEW
            onSwitchLanguage(lang);
        } else {
            // It doesn't exist -> GENERATE
            setLoadingLang(lang);
            await onTranslateSingle(q, lang);
            setLoadingLang(null);
        }
    };

    const [translateMenuOpen, setTranslateMenuOpen] = useState(false);
    const translateMenuRef = useRef(null);

    // Close translate menu on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (translateMenuRef.current && !translateMenuRef.current.contains(event.target)) {
                setTranslateMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const renderLanguageFlags = () => {
        const currentLang = (q.language || 'English').trim();
        const allLanguageNames = Object.keys(LANGUAGE_FLAGS).filter(lang => currentLang !== lang);

        // Separate into existing translations and missing translations
        const existingTranslations = [];
        const missingTranslations = [];

        allLanguageNames.forEach(lang => {
            let hasLang = availableLanguages && availableLanguages.has(lang);

            // SPECIAL CASE: If we're viewing a non-English question, English MUST exist
            if (lang === 'English' && currentLang !== 'English') {
                hasLang = true;
            }

            if (hasLang) {
                existingTranslations.push(lang);
            } else {
                missingTranslations.push(lang);
            }
        });

        return (
            <>
                {/* Show current language indicator */}
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/50 rounded border border-slate-700 text-xs text-slate-400">
                    <FlagIcon code={LANGUAGE_CODES[currentLang] || 'US'} size={14} />
                    <span className="font-medium">{currentLang}</span>
                </div>

                {/* Existing translations - bright flags */}
                {existingTranslations.map(lang => {
                    const langCode = LANGUAGE_CODES[lang] || lang.substring(0, 2).toUpperCase();
                    return (
                        <button
                            key={lang}
                            onClick={(e) => handleFlagClick(e, lang)}
                            className="p-0.5 rounded border-2 border-green-600 hover:border-green-400 hover:scale-110 transition-all shadow-sm shadow-green-900/50"
                            title={`Switch to ${lang}`}
                            aria-label={`Switch to ${lang} translation`}
                        >
                            <FlagIcon code={langCode} size={18} />
                        </button>
                    );
                })}

                {/* Add translation button with dropdown - only show if there are missing translations */}
                {missingTranslations.length > 0 && appMode !== 'database' && (
                    <div className="relative" ref={translateMenuRef}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setTranslateMenuOpen(!translateMenuOpen); }}
                            disabled={isProcessing}
                            className="p-1 rounded border border-dashed border-slate-600 hover:border-orange-500 hover:bg-slate-800/50 transition-all text-slate-500 hover:text-orange-400 flex items-center gap-0.5"
                            title="Add translation"
                            aria-label="Add translation"
                        >
                            <Icon name="globe" size={14} />
                            <Icon name="plus" size={10} />
                        </button>

                        {translateMenuOpen && (
                            <div className="absolute left-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="py-1">
                                    <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-700">Translate to:</div>
                                    {missingTranslations.map(lang => {
                                        const langCode = LANGUAGE_CODES[lang] || lang.substring(0, 2).toUpperCase();
                                        const isLoading = loadingLang === lang;
                                        return (
                                            <button
                                                key={lang}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFlagClick(e, lang);
                                                    setTranslateMenuOpen(false);
                                                }}
                                                disabled={isProcessing || isLoading}
                                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isLoading ? (
                                                    <Icon name="loader" size={14} className="animate-spin text-orange-500" />
                                                ) : (
                                                    <FlagIcon code={langCode} size={14} />
                                                )}
                                                {lang}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className={`group rounded-lg border shadow-sm transition-all p-4 relative ${getGradient(q.difficulty)} ${getStatusStyle(q.status)}`}>
            <div className="flex flex-col gap-2 mb-3">
                {/* Top Row: Badges */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-2 items-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${getDiffBadgeColor(q.difficulty)} flex items-center gap-1`}>
                                <Icon name="zap" size={12} />
                                {q.difficulty}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border bg-blue-950 text-blue-400 border-blue-900">{q.type === 'True/False' ? 'T/F' : 'MC'}</span>

                            {/* Creator / Reviewer Info - Moved to Top */}
                            <div className="flex items-center gap-2 ml-1 border-l border-slate-700/50 pl-2">
                                <div className="flex items-center gap-1 text-xs text-slate-500" title="Creator">
                                    <Icon name="user" size={12} />
                                    <span className="font-bold text-slate-400">{q.creatorName || 'N/A'}</span>
                                </div>
                                {q.reviewerName && q.reviewerName !== q.creatorName && (
                                    <div className="flex items-center gap-1 text-xs text-slate-500" title="Reviewer">
                                        <Icon name="check" size={12} />
                                        <span className="font-bold text-indigo-400">{q.reviewerName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* DATABASE MODE: Only show Kick Back to Review button */}
                        {appMode === 'database' ? (
                            <button
                                onClick={() => onKickBack(q)}
                                className="px-3 py-1.5 rounded-lg transition-all bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/50 hover:text-indigo-200 border border-indigo-700/50 flex items-center gap-2 text-xs font-medium"
                                title="Send back to Review Console"
                                aria-label="Kick back to review"
                            >
                                <Icon name="corner-up-left" size={14} />
                                Kick Back to Review
                            </button>
                        ) : (
                            <>
                                {/* More Menu (Not shown in Database mode) */}
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                                        aria-label="More options"
                                    >
                                        <Icon name="more-vertical" size={16} />
                                    </button>

                                    {/* Dropdown */}
                                    {menuOpen && (
                                        <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <div className="py-1">
                                                <button onClick={(e) => { e.stopPropagation(); onExplain(q); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs text-indigo-300 hover:bg-slate-700 flex items-center gap-2">
                                                    <Icon name="lightbulb" size={14} /> Explain Answer
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); onVariate(q); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs text-purple-300 hover:bg-slate-700 flex items-center gap-2">
                                                    <Icon name="copy" size={14} /> Create Variations
                                                </button>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    const textArea = document.createElement("textarea");
                                                    // FIX: Use stripHtmlTags for clean copy
                                                    textArea.value = stripHtmlTags(q.question);
                                                    document.body.appendChild(textArea);
                                                    textArea.select();
                                                    try {
                                                        document.execCommand('copy');
                                                    } catch (err) {
                                                        console.error('Fallback: Oops, unable to copy', err);
                                                    }
                                                    document.body.removeChild(textArea);
                                                    setMenuOpen(false);
                                                }} className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 flex items-center gap-2">
                                                    <Icon name="clipboard" size={14} /> Copy Question
                                                </button>

                                                {/* Kick Back to Review (Review Mode Only - via menu) */}
                                                {appMode === 'review' && onKickBack && (
                                                    <button onClick={(e) => { e.stopPropagation(); onKickBack(q); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs text-indigo-300 hover:bg-slate-700 flex items-center gap-2 border-t border-slate-700 mt-1 pt-2">
                                                        <Icon name="corner-up-left" size={14} /> Kick Back to Review
                                                    </button>
                                                )}

                                                {/* Delete Permanently (If Rejected or Create Mode) */}
                                                {(isRejected || appMode === 'create') && (
                                                    <button onClick={(e) => { e.stopPropagation(); onDelete(q.id); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-slate-700 flex items-center gap-2">
                                                        <Icon name="trash-2" size={14} /> Delete Permanently
                                                    </button>
                                                )}

                                                {/* Set Language Submenu */}
                                                {onUpdateQuestion && (
                                                    <div className="border-t border-slate-700 mt-1 pt-1">
                                                        <div className="px-4 py-1 text-[10px] font-bold text-slate-500 uppercase">Set Language</div>
                                                        {Object.keys(LANGUAGE_FLAGS).map(lang => (
                                                            <button
                                                                key={lang}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onUpdateQuestion({ ...q, language: lang });
                                                                    setMenuOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-1.5 text-xs hover:bg-slate-700 flex items-center gap-2 ${q.language === lang ? 'text-green-400 font-bold' : 'text-slate-300'}`}
                                                            >
                                                                <span className="text-base">{LANGUAGE_FLAGS[lang]}</span> {lang}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons (Large) */}
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
                                        // REVIEW MODE: Show AI Critique/Accept/Reject
                                        <>
                                            {/* AI Critique Button - First option in Review mode */}
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
                                                onClick={() => {
                                                    if (q.status === 'accepted') {
                                                        if (showMessage) showMessage("Question is already accepted.");
                                                    } else {
                                                        onUpdateStatus(q.id, 'accepted');
                                                    }
                                                }}
                                                className={`p-2 rounded-lg transition-all ${q.status === 'accepted' ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'bg-slate-800 text-slate-500 hover:bg-green-900/20 hover:text-green-500'}`}
                                                title="Accept"
                                                aria-label="Accept question"
                                            >
                                                <Icon name="check" size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (q.status === 'rejected') {
                                                        if (showMessage) showMessage("Question is already rejected.");
                                                    } else {
                                                        onUpdateStatus(q.id, 'rejected');
                                                    }
                                                }}
                                                className={`p-2 rounded-lg transition-all ${q.status === 'rejected' ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-slate-800 text-slate-500 hover:bg-red-900/20 hover:text-red-500'}`}
                                                title="Reject"
                                                aria-label="Reject question"
                                            >
                                                <Icon name="x" size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Second Row: Language Indicators (Flags or Codes) */}
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                    {renderLanguageFlags()}
                </div>
            </div>

            <div className="mb-4">
                <h3 className={`text-base font-medium leading-relaxed ${q.status === 'rejected' ? 'text-slate-600 line-through decoration-slate-700' : 'text-slate-200'}`} dangerouslySetInnerHTML={{ __html: sanitizeText(q.question) }} />
                <div className="flex items-center gap-3 mt-2">
                    {q.sourceUrl && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-500 truncate max-w-[70%]">
                            <Icon name="external-link" size={12} className="flex-shrink-0" />
                            <a href={formatUrl(q.sourceUrl)} target="_blank" rel="noreferrer" className="hover:underline truncate text-blue-500 hover:text-blue-400">{getDisplayUrl(q.sourceUrl)}</a>
                        </div>
                    )}
                    {/* DEBUG ID: Helps verify linking */}
                    {q.uniqueId && (
                        <div className="text-[9px] text-slate-700 font-mono cursor-help" title={`Unique ID: ${q.uniqueId} (Use this to link translations)`}>
                            #{q.uniqueId.substring(0, 8)} | {q.language || 'English'}
                        </div>
                    )}
                </div>
            </div>

            {q.type === 'Multiple Choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {Object.entries(q.options || {}).map(([key, val]) => {
                        const isCorrect = q.correct === key;
                        // SAFEGUARD: If option text is missing/empty, show placeholder to maintain layout
                        const optionText = val && val.trim() ? val : "(Empty)";
                        return (
                            <div key={key} className={`text-sm p-2 rounded border transition-all ${isCorrect ? 'bg-green-700/50 border-green-400 text-white shadow-[0_0_10px_-3px_rgba(34,197,94,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
                                <span className={`font-bold mr-2 ${isCorrect ? 'text-white' : 'text-slate-600'}`}>{key})</span>
                                <span dangerouslySetInnerHTML={{ __html: sanitizeText(optionText) }} />
                            </div>
                        );
                    })}
                </div>
            )}

            {q.type === 'True/False' && (
                <div className="flex gap-4 mb-4">
                    <div className={`px-3 py-1 rounded text-xs border transition-all ${q.correct === 'A' ? 'bg-green-700/50 border-green-400 text-white shadow-[0_0_10px_-3px_rgba(34,197,94,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>TRUE</div>
                    <div className={`px-3 py-1 rounded text-xs border transition-all ${q.correct === 'B' ? 'bg-red-700/50 border-red-400 text-white shadow-[0_0_10px_-3px_rgba(239,68,68,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>FALSE</div>
                </div>
            )}

            {q.critique && <CritiqueDisplay critique={q.critique} onRewrite={() => onRewrite(q)} isProcessing={isProcessing} />}

            {q.explanation && (
                <div className="mb-3 p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-1 text-indigo-300 text-sm font-bold uppercase"><Icon name="lightbulb" size={14} /> Explanation</div>
                    <p className="text-sm text-slate-300 leading-relaxed">{q.explanation}</p>
                </div>
            )}

            {q.sourceExcerpt && (
                <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                    {/* Source URL - Prominent Display */}
                    {q.sourceUrl && (
                        <div className="flex items-center gap-2 bg-blue-950/30 border border-blue-800/50 rounded px-3 py-1.5">
                            <Icon name="link" size={14} className="text-blue-400 flex-shrink-0" />
                            <span className="text-[10px] font-bold uppercase text-blue-400">Source:</span>
                            <a
                                href={formatUrl(q.sourceUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-300 hover:text-blue-200 hover:underline truncate flex-1"
                            >
                                {q.sourceUrl}
                            </a>
                            <Icon name="external-link" size={12} className="text-blue-500 flex-shrink-0" />
                        </div>
                    )}
                    {/* Source Excerpt - Cleaned */}
                    <div className="flex items-start gap-1.5 text-sm text-slate-400 italic bg-slate-950 p-2 rounded border border-slate-800">
                        <Icon name="message-square" size={14} className="mt-0.5 flex-shrink-0" />
                        <span>"{stripHtmlTags(q.sourceExcerpt)}"</span>
                    </div>
                </div>
            )}


        </div>
    );
};

export default React.memo(QuestionItem);
