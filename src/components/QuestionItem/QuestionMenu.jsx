import React, { useState, useRef, useEffect } from 'react';
import Icon from '../Icon';
import { LANGUAGE_FLAGS } from '../../utils/constants';
import { stripHtmlTags } from '../../utils/helpers';

const QuestionMenu = ({
    q,
    onExplain,
    onVariate,
    onKickBack,
    onDelete,
    onUpdateQuestion,
    appMode,
    isRejected
}) => {
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

    // Three-dot menu disabled - options moved to card
    return null;

    return (
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
                                            onUpdateQuestion(q.id, { language: lang });
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
    );
};

export default QuestionMenu;
