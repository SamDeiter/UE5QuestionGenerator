import React from 'react';
import Icon from './Icon';
import GranularProgress from './GranularProgress';
import GenerationSettings from './sidebar/GenerationSettings';
import CreativitySettings from './sidebar/CreativitySettings';
import CustomRules from './sidebar/CustomRules';
import ProgressStats from './sidebar/ProgressStats';
import BatchSizeControl from './sidebar/BatchSizeControl';
import ActionFooter from './sidebar/ActionFooter';

import TokenUsageDisplay from './TokenUsageDisplay';
import { downloadTrainingData } from '../utils/analyticsStore';

const Sidebar = ({
    showGenSettings, setShowGenSettings,
    config, handleChange,
    allQuestionsMap, approvedCounts, overallPercentage, totalApproved, TARGET_TOTAL, TARGET_PER_CATEGORY, isTargetMet,
    maxBatchSize, batchSizeWarning,
    handleGenerate, isGenerating, isApiReady,
    handleBulkTranslateMissing, isProcessing,
    showAdvancedConfig, setShowAdvancedConfig,
    apiKeyStatus, showApiError,
    handleLoadFromSheets, handleExportToSheets,
    setShowSettings,
    handleSelectCategory
}) => {

    return (
        <aside className="w-80 flex-shrink-0 z-10 shadow-xl border-r border-slate-700 bg-slate-950 p-6 overflow-y-auto flex flex-col gap-6">

            <GenerationSettings
                config={config}
                handleChange={handleChange}
                isOpen={showGenSettings}
                onToggle={() => setShowGenSettings(!showGenSettings)}
            />

            <CreativitySettings
                config={config}
                handleChange={handleChange}
            />

            <CustomRules
                config={config}
                handleChange={handleChange}
            />

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

            <ActionFooter
                handleGenerate={handleGenerate}
                isGenerating={isGenerating}
                isTargetMet={isTargetMet}
                maxBatchSize={maxBatchSize}
                isApiReady={isApiReady}
                handleBulkTranslateMissing={handleBulkTranslateMissing}
                isProcessing={isProcessing}
                allQuestionsMap={allQuestionsMap}
            />



            {/* Token Usage Display */}
            <div className="mt-4 pt-4 border-t border-slate-800">
                <TokenUsageDisplay showDetailed={true} />
            </div>



            <div className="mt-4 pt-4 border-slate-800">
                <button
                    onClick={() => setShowSettings(true)}
                    className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded flex items-center justify-center gap-2 transition-colors text-xs font-bold uppercase tracking-wider"
                >
                    <Icon name="settings" size={14} /> Open Settings
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
