import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import CritiqueDisplay from './CritiqueDisplay';
import { sanitizeText, formatUrl, stripHtmlTags } from '../utils/helpers';
import { LANGUAGE_CODES, LANGUAGE_FLAGS } from '../utils/constants';

const QuestionItem = ({ q, onUpdateStatus, onExplain, onVariate, onCritique, onTranslateSingle, onSwitchLanguage, availableLanguages, isProcessing }) => {
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
            case 'medium': return 'bg-yellow-950 text-yellow-400 border-yellow-900';
            case 'hard': return 'bg-red-950 text-red-400 border-red-900';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const isRejected = q.status === 'rejected';

    // Track loading state per specific language flag
    const [loadingLang, setLoadingLang] = useState(null);

    const handleFlagClick = async (e, lang) => {
        e.stopPropagation();

        // Check if the translation ALREADY exists
        if (availableLanguages && availableLanguages.has(lang)) {
            // It exists -> SWITCH VIEW
            onSwitchLanguage(lang);
        } else {
            // It doesn't exist -> GENERATE
            setLoadingLang(lang);
            await onTranslateSingle(q, lang);
            setLoadingLang(null);
        }
    };

    const renderLanguageFlags = () => {
        // Get all available language names, excluding the current language of the displayed card.
        const allLanguageNames = Object.keys(LANGUAGE_FLAGS).filter(lang => (q.language || 'English').trim() !== lang);

        return allLanguageNames.map(lang => {
            const hasLang = availableLanguages && availableLanguages.has(lang);
            const langCode = LANGUAGE_CODES[lang] || lang.substring(0, 2).toUpperCase();
            const flag = LANGUAGE_FLAGS[lang];
            const isLoading = loadingLang === lang;

            // If Translation Exists -> Show FLAG (Switch button)
            if (hasLang) {
                return (
                    <button
                        key={lang}
                        onClick={(e) => handleFlagClick(e, lang)}
                        className="text-base px-1 inline-flex items-center justify-center opacity-100 hover:scale-125 transition-transform cursor-pointer"
                        style={{ fontFamily: 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' }}
                        title={`Switch to ${lang} translation`}
                    >
                        {flag}
                    </button>
                );
            }

            // If Missing -> Show FLAG (Generate button) - Faded with + indicator
            return (
                <button
                    key={lang}
                    onClick={(e) => handleFlagClick(e, lang)}
                    disabled={isProcessing}
                    className={`text-base px-1 inline-flex items-center justify-center transition-all cursor-pointer relative ${isLoading ? 'animate-pulse scale-110' : 'opacity-50 hover:opacity-100 hover:scale-125'}`}
                    style={{ fontFamily: 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' }}
                    title={`Generate ${lang} translation`}
                >
                    {isLoading ? <Icon name="loader" size={14} className="animate-spin text-orange-500" /> : (
                        <span className="relative">
                            {flag}
                            <span className="absolute -top-1 -right-1 text-[8px] bg-orange-500 text-white rounded-full w-3 h-3 flex items-center justify-center">+</span>
                        </span>
                    )}
                </button>
            );
        });
    };

    return (
        <div className={`group rounded-lg border shadow-sm transition-all p-4 relative ${getGradient(q.difficulty)} ${getStatusStyle(q.status)}`}>
            <div className="flex flex-col gap-2 mb-3">
                {/* Top Row: Badges */}
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-2 items-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getDiffBadgeColor(q.difficulty)}`}>{q.difficulty}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-blue-950 text-blue-400 border-blue-900">{q.type === 'True/False' ? 'T/F' : 'MC'}</span>

                            {/* Creator / Reviewer Info - Moved to Top */}
                            <div className="flex items-center gap-2 ml-1 border-l border-slate-700/50 pl-2">
                                <div className="flex items-center gap-1 text-[10px] text-slate-500" title="Creator">
                                    <Icon name="user" size={10} />
                                    <span className="font-bold text-slate-400">{q.creatorName || 'N/A'}</span>
                                </div>
                                {q.reviewerName && q.reviewerName !== q.creatorName && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500" title="Reviewer">
                                        <Icon name="check" size={10} />
                                        <span className="font-bold text-indigo-400">{q.reviewerName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* More Menu */}
                        <div className="relative" ref={menuRef}>
                            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                <Icon name="more-vertical" size={16} />
                            </button>

                            {/* Dropdown */}
                            {menuOpen && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="py-1">
                                        {isRejected && (
                                            <button onClick={(e) => { e.stopPropagation(); onCritique(q); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-slate-700 flex items-center gap-2">
                                                <Icon name="zap" size={14} /> AI Critique
                                            </button>
                                        )}
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
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons (Large) */}
                        <div className="flex items-center gap-2">
                            <button onClick={() => onUpdateStatus(q.id, 'accepted')} className={`p-2 rounded-lg transition-all ${q.status === 'accepted' ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'bg-slate-800 text-slate-500 hover:bg-green-900/20 hover:text-green-500'}`} title="Accept">
                                <Icon name="check" size={18} />
                            </button>
                            <button onClick={() => onUpdateStatus(q.id, 'rejected')} className={`p-2 rounded-lg transition-all ${q.status === 'rejected' ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-slate-800 text-slate-500 hover:bg-red-900/20 hover:text-red-500'}`} title="Reject">
                                <Icon name="x" size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Second Row: Language Indicators (Flags or Codes) */}
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                    {renderLanguageFlags()}
                </div>
            </div>

            <div className="mb-4">
                <h3 className={`text-sm font-medium leading-relaxed ${q.status === 'rejected' ? 'text-slate-600 line-through decoration-slate-700' : 'text-slate-200'}`} dangerouslySetInnerHTML={{ __html: sanitizeText(q.question) }} />
                <div className="flex items-center gap-3 mt-2">
                    {q.sourceUrl && (
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-500 truncate max-w-[70%]">
                            <Icon name="external-link" size={12} className="flex-shrink-0" />
                            <a href={formatUrl(q.sourceUrl)} target="_blank" rel="noreferrer" className="hover:underline truncate text-blue-500 hover:text-blue-400">{q.sourceUrl}</a>
                        </div>
                    )}
                    {/* DEBUG ID: Helps verify linking */}
                    <div className="text-[9px] text-slate-700 font-mono cursor-help" title={`Unique ID: ${q.uniqueId} (Use this to link translations)`}>
                        #{q.uniqueId.substring(0, 8)}
                    </div>
                </div>
            </div>

            {q.type === 'Multiple Choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {Object.entries(q.options || {}).map(([key, val]) => {
                        const isCorrect = q.correct === key;
                        // SAFEGUARD: If option text is missing/empty, show placeholder to maintain layout
                        const optionText = val && val.trim() ? val : "(Empty)";
                        return (
                            <div key={key} className={`text-xs p-2 rounded border transition-all ${isCorrect ? 'bg-green-700/50 border-green-400 text-white shadow-[0_0_10px_-3px_rgba(34,197,94,0.5)]' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
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

            {q.critique && <CritiqueDisplay critique={q.critique} />}

            {q.explanation && (
                <div className="mb-3 p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-1 text-indigo-300 text-xs font-bold uppercase"><Icon name="lightbulb" size={12} /> Explanation</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{q.explanation}</p>
                </div>
            )}

            {q.sourceExcerpt && (
                <div className="pt-3 border-t border-slate-800 flex flex-col gap-1">
                    <div className="flex items-start gap-1.5 text-[10px] text-slate-500 italic bg-slate-950 p-2 rounded border border-slate-800">
                        <Icon name="message-square" size={12} className="mt-0.5 flex-shrink-0" />
                        "{q.sourceExcerpt}"
                    </div>
                </div>
            )}


        </div>
    );
};

export default QuestionItem;
