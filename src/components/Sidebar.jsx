import React from 'react';
import Icon from './Icon';
import GranularProgress from './GranularProgress';
import GenerationSettings from './sidebar/GenerationSettings';
import CreativitySettings from './sidebar/CreativitySettings';
import CustomRules from './sidebar/CustomRules';
import ProgressStats from './sidebar/ProgressStats';
import BatchSizeControl from './sidebar/BatchSizeControl';
import ActionFooter from './sidebar/ActionFooter';
import AdvancedConfig from './sidebar/AdvancedConfig';
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
    files, handleDetectTopics, isDetecting, fileInputRef, handleFileChange, removeFile,
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

            <AdvancedConfig
                isOpen={showAdvancedConfig}
                onToggle={() => setShowAdvancedConfig(!showAdvancedConfig)}
                files={files}
                handleDetectTopics={handleDetectTopics}
                isDetecting={isDetecting}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
                removeFile={removeFile}
                config={config}
                handleChange={handleChange}
                apiKeyStatus={apiKeyStatus}
                showApiError={showApiError}
                isApiReady={isApiReady}
                handleLoadFromSheets={handleLoadFromSheets}
                handleExportToSheets={handleExportToSheets}
                isProcessing={isProcessing}
            />

            {/* Token Usage Display */}
            <div className="mt-4 pt-4 border-t border-slate-800">
                <TokenUsageDisplay showDetailed={true} />
            </div>

            {/* Training Data Export */}
            <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="mb-2">
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-1 flex items-center gap-2">
                        <Icon name="database" size={12} />
                        Training Data Export
                    </h3>
                    <p className="text-[10px] text-slate-600">
                        Export questions for Vertex AI fine-tuning
                    </p>
                </div>
                <div className="space-y-2">
                    <button
                        onClick={() => {
                            const count = downloadTrainingData('bad');
                            alert(`Exported ${count} bad questions for training`);
                        }}
                        className="w-full py-2 px-3 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded flex items-center justify-center gap-2 transition-colors text-xs font-medium border border-red-900/30"
                    >
                        <Icon name="download" size={12} />
                        Export Bad Questions
                    </button>
                    <button
                        onClick={() => {
                            const count = downloadTrainingData('good');
                            alert(`Exported ${count} good questions for training`);
                        }}
                        className="w-full py-2 px-3 bg-green-900/20 hover:bg-green-900/30 text-green-400 rounded flex items-center justify-center gap-2 transition-colors text-xs font-medium border border-green-900/30"
                    >
                        <Icon name="download" size={12} />
                        Export Good Questions
                    </button>
                    <button
                        onClick={() => {
                            const count = downloadTrainingData('all');
                            alert(`Exported ${count} total questions for training`);
                        }}
                        className="w-full py-2 px-3 bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 rounded flex items-center justify-center gap-2 transition-colors text-xs font-medium border border-blue-900/30"
                    >
                        <Icon name="download" size={12} />
                        Export All Training Data
                    </button>
                </div>
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
