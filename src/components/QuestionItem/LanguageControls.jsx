import { useState } from "react";
import Icon from "../Icon";
import FlagIcon from "../FlagIcon";
import { LANGUAGE_CODES, LANGUAGE_FLAGS } from "../../utils/constants";
import { logger } from "../../utils/logger";

/**
 * Get button title text based on language state
 */
const getButtonTitle = (
  lang,
  isLocked,
  lockedBy,
  isCurrent,
  exists,
  canTranslate
) => {
  if (isLocked) return `Locked by ${lockedBy?.userEmail || "another user"}`;
  if (isCurrent) return `Current: ${lang}`;
  if (exists) return `Switch to ${lang}`;
  if (canTranslate) return `Translate to ${lang}`;
  return `${lang} (Unavailable)`;
};

const LanguageControls = ({
  q,
  availableLanguages,
  onSwitchLanguage,
  onTranslateSingle,
  isProcessing,
  userRole, // NEW: Check role for restrictions
  isLocked = false, // NEW: Lock state from concurrent editing
  lockedBy = null, // NEW: Lock owner info
}) => {
  const [loadingLang, setLoadingLang] = useState(null);
  // Translation generation: Only admins can create new translations
  // Non-admins (reviewers, users) can only view/switch existing translations
  const canTranslate =
    (q.language || "English") === "English" &&
    q.sourceUrl &&
    !q.invalidUrl &&
    userRole === "admin"; // Only admins can generate new translations

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

          // LOCK ENFORCEMENT: Exit immediately if locked by another user
          if (isLocked) {
            logger.log(
              "🔒 [LanguageControls] Translation blocked - question is locked"
            );
            return;
          }

          logger.log("🎯 [LanguageControls] Flag clicked:", {
            lang,
            isCurrent,
            exists,
            canTranslate,
            questionStatus: q.status,
            questionLanguage: q.language,
            hasSourceUrl: !!q.sourceUrl,
            invalidUrl: q.invalidUrl,
            questionUniqueId: q.uniqueId,
          });

          if (isCurrent) {
            logger.log(
              "⏭️ [LanguageControls] Skipping - already current language"
            );
            return; // Do nothing if clicking current
          }

          if (exists) {
            logger.log(
              "🔄 [LanguageControls] Switching to existing translation"
            );
            // Pass both language AND uniqueId so parent can find the translated variant
            onSwitchLanguage(lang, q.uniqueId);
          } else if (canTranslate) {
            logger.log("🌐 [LanguageControls] Generating new translation");
            setLoadingLang(lang);
            onTranslateSingle(q, lang)
              .then(() => {
                logger.log("✅ [LanguageControls] Translation complete");
                setLoadingLang(null);
              })
              .catch((err) => {
                logger.error("❌ [LanguageControls] Translation failed:", err);
                setLoadingLang(null);
              });
          } else {
            logger.warn(
              "⚠️ [LanguageControls] Cannot translate - requirements not met"
            );
          }
        };

        // Style logic
        let containerClass =
          "relative group flex items-center justify-center p-0.5 rounded transition-all duration-200 ";

        if (isLocked) {
          // Locked state - grayed out regardless of other conditions
          containerClass +=
            "border border-slate-800 opacity-30 grayscale cursor-not-allowed";
        } else if (isCurrent) {
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
            disabled={
              isProcessing ||
              isLoading ||
              isLocked ||
              (!exists && !canTranslate)
            }
            className={containerClass}
            title={getButtonTitle(
              lang,
              isLocked,
              lockedBy,
              isCurrent,
              exists,
              canTranslate
            )}
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
