import Icon from "./Icon";
import GranularProgress from "./GranularProgress";
import GenerationSettings from "./sidebar/GenerationSettings";
import CustomRules from "./sidebar/CustomRules";
import ProgressStats from "./sidebar/ProgressStats";
import BatchSizeControl from "./sidebar/BatchSizeControl";
import ActionFooter from "./sidebar/ActionFooter";
import TokenUsageDisplay from "./TokenUsageDisplay";
import CoverageGapSuggester from "./sidebar/CoverageGapSuggester";

const Sidebar = ({
  showGenSettings,
  setShowGenSettings,
  config,
  handleChange,
  allQuestionsMap,
  approvedCounts,
  overallPercentage,
  totalApproved,
  TARGET_TOTAL,
  TARGET_PER_CATEGORY,
  isTargetMet,
  maxBatchSize,
  batchSizeWarning,
  handleGenerate,
  isGenerating,
  isApiReady,
  handleBulkTranslateMissing,
  isProcessing,
  setShowSettings,
  handleSelectCategory,
  customTags = {},
  status = "", // Live generation status text
  showMessage,
  isAdmin, // Add isAdmin prop
}) => {
  return (
    <aside className="w-80 flex-shrink-0 z-10 shadow-xl border-r border-slate-700 bg-slate-950 p-6 overflow-y-auto flex flex-col gap-6">
      {isAdmin && (
        <>
          <div data-tour="generation-settings">
            <GenerationSettings
              config={config}
              handleChange={handleChange}
              customTags={customTags}
              isOpen={showGenSettings}
              onToggle={() => setShowGenSettings(!showGenSettings)}
              allQuestionsMap={allQuestionsMap}
            />
          </div>

          {/* Generate Button - Right after settings/chart */}
          <ActionFooter
            handleGenerate={handleGenerate}
            isGenerating={isGenerating}
            isTargetMet={isTargetMet}
            maxBatchSize={maxBatchSize}
            isApiReady={isApiReady}
            handleBulkTranslateMissing={handleBulkTranslateMissing}
            isProcessing={isProcessing}
            allQuestionsMap={allQuestionsMap}
            status={status}
          />

          {/* Coverage Gap Alert - Only show when there are gaps */}
          <CoverageGapSuggester
            allQuestionsMap={allQuestionsMap}
            config={config}
            handleChange={handleChange}
            showMessage={showMessage}
            setShowGenSettings={setShowGenSettings}
          />

          <CustomRules config={config} handleChange={handleChange} />
        </>
      )}

      {!isAdmin && (
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 text-center">
          <Icon
            name="shield"
            className="mx-auto mb-2 text-slate-500"
            size={24}
          />
          <p className="text-sm text-slate-400">
            Generation features are restricted to administrators.
          </p>
        </div>
      )}

      <ProgressStats
        allQuestionsMap={allQuestionsMap}
        totalApproved={totalApproved}
        TARGET_TOTAL={TARGET_TOTAL}
        overallPercentage={overallPercentage}
      />

      <GranularProgress
        approvedCounts={approvedCounts}
        target={TARGET_PER_CATEGORY}
        isTargetMet={isTargetMet}
        selectedDifficulty={config.difficulty}
        handleSelectCategory={handleSelectCategory}
      />

      <BatchSizeControl
        maxBatchSize={maxBatchSize}
        config={config}
        handleChange={handleChange}
        batchSizeWarning={batchSizeWarning}
      />

      {/* Token Usage Display */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <TokenUsageDisplay showDetailed={true} />
      </div>

      <div className="mt-4 pt-4 border-slate-800">
        <button
          onClick={() => setShowSettings(true)}
          data-tour="open-settings"
          className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded flex items-center justify-center gap-2 transition-colors text-xs font-bold uppercase tracking-wider"
        >
          <Icon name="settings" size={14} /> Open Settings
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
