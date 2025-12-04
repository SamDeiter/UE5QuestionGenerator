import React, { useState, useRef, useEffect } from 'react';
import Icon from '../Icon';
import FlagIcon from '../FlagIcon';
import { LANGUAGE_CODES, LANGUAGE_FLAGS } from '../../utils/constants';

const LanguageControls = ({
    q,
    availableLanguages,
    onSwitchLanguage,
    onTranslateSingle,
    isProcessing,
    appMode
}) => {
    const [loadingLang, setLoadingLang] = useState(null);
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
        <div className="flex flex-wrap gap-1.5 items-center pt-1 mb-3">
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
        </div>
    );
};

export default LanguageControls;
