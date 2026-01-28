/**
 * TranslateModeToolbar
 * Toolbar for the Translation management mode
 */
import Icon from "../Icon";

const TranslateModeToolbar = () => {
  return (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center gap-4">
        <span className="text-xs text-slate-500 flex items-center gap-2">
          <Icon name="languages" size={14} className="text-amber-400" />
          Language Management & Translation
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* Status indicator for translation */}
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-800 rounded border border-slate-700">
          <span className="text-[10px] uppercase font-bold text-slate-500">
            Source:
          </span>
          <span className="text-xs text-white font-medium">English</span>
        </div>
      </div>
    </div>
  );
};

export default TranslateModeToolbar;
