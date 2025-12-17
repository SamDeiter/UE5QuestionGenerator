import { useState, useRef, useEffect } from "react";
import Icon from "../Icon";
import FlagIcon from "../FlagIcon";
import { LANGUAGE_CODES, LANGUAGE_FLAGS } from "../../utils/constants";

const LanguageControls = ({
  q,
  availableLanguages,
  onSwitchLanguage,
  onTranslateSingle,
  isProcessing,
}) => {
  const [loadingLang, setLoadingLang] = useState(null);
  const [_translateMenuOpen, setTranslateMenuOpen] = useState(false);
  const translateMenuRef = useRef(null);

  // Translation requirements: Must have valid source URL
  // Removed status === 'accepted' requirement - pending questions should be translatable too
  const canTranslate =
    (q.language || "English") === "English" && q.sourceUrl && !q.invalidUrl;

  // Close translate menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        translateMenuRef.current &&
        !translateMenuRef.current.contains(event.target)
      ) {
        setTranslateMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't show translation controls if requirements aren't met - REMOVED to allow viewing current language
  // if (!canTranslate) {
  //     return null;
  // }

  const allLanguages = Object.keys(LANGUAGE_FLAGS);

  return (
    <div className="flex flex-wrap gap-2 items-center pt-1 mb-3">
      {allLanguages.map((lang) => {
        const isCurrent = (q.language || "English").trim() === lang;
        const langCode =
          LANGUAGE_CODES[lang] || lang.substring(0, 2).toUpperCase();

        // Check if translation exists for THIS specific language
        // English always exists (it's the original), other languages check availableLanguages
        const exists =
          isCurrent ||
          lang === "English" ||
          (availableLanguages && availableLanguages.has(lang));

        const isLoading = loadingLang === lang;

        // Interaction logic
        const handleClick = (e) => {
          e.stopPropagation();
          console.log("🎯 [LanguageControls] Flag clicked:", {
            lang,
            isCurrent,
            exists,
            canTranslate,
            questionStatus: q.status,
            questionLanguage: q.language,
            hasSourceUrl: !!q.sourceUrl,
            invalidUrl: q.invalidUrl,
          });

          if (isCurrent) {
            console.log(
              "⏭️ [LanguageControls] Skipping - already current language"
            );
            return; // Do nothing if clicking current
          }

          if (exists) {
            console.log(
              "🔄 [LanguageControls] Switching to existing translation"
            );
            onSwitchLanguage(lang);
          } else if (canTranslate) {
            console.log("🌐 [LanguageControls] Generating new translation");
            setLoadingLang(lang);
            onTranslateSingle(q, lang)
              .then(() => {
                console.log("✅ [LanguageControls] Translation complete");
                setLoadingLang(null);
              })
              .catch((err) => {
                console.error("❌ [LanguageControls] Translation failed:", err);
                setLoadingLang(null);
              });
          } else {
            console.warn(
              "⚠️ [LanguageControls] Cannot translate - requirements not met"
            );
          }
        };

        // Style logic
        let containerClass =
          "relative group flex items-center justify-center p-0.5 rounded transition-all duration-200 ";

        if (isCurrent) {
          containerClass +=
            "border-2 border-indigo-500 bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.5)] scale-110 z-10";
        } else if (exists) {
          containerClass +=
            "border border-slate-600 hover:border-green-500 hover:scale-110 cursor-pointer opacity-100";
        } else if (canTranslate) {
          containerClass +=
            "border border-slate-700 hover:border-orange-500 hover:bg-slate-800 cursor-pointer opacity-40 hover:opacity-100 grayscale hover:grayscale-0";
        } else {
          containerClass +=
            "border border-slate-800 opacity-20 grayscale cursor-not-allowed";
        }

        return (
          <button
            key={lang}
            onClick={handleClick}
            disabled={isProcessing || isLoading || (!exists && !canTranslate)}
            className={containerClass}
            title={
              isCurrent
                ? `Current: ${lang}`
                : exists
                ? `Switch to ${lang}`
                : canTranslate
                ? `Translate to ${lang}`
                : `${lang} (Unavailable)`
            }
          >
            {isLoading ? (
              <Icon
                name="loader"
                size={16}
                className="animate-spin text-orange-500"
              />
            ) : (
              <>
                <FlagIcon code={langCode} size={18} />
                {/* Plus icon overlay for missing but available translations */}
                {!exists && canTranslate && !isLoading && (
                  <div className="absolute -top-1 -right-1 bg-slate-900 rounded-full p-[1px] border border-slate-700 text-orange-500 shadow-sm group-hover:scale-110 transition-transform">
                    <Icon name="plus" size={8} />
                  </div>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageControls;
