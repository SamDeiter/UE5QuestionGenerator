import React from 'react';
import Icon from '../Icon';
import InfoTooltip from '../InfoTooltip';

const AdvancedConfig = ({
    isOpen, onToggle,
    files, handleDetectTopics, isDetecting, fileInputRef, handleFileChange, removeFile,
    config, handleChange,
    apiKeyStatus, showApiError, isApiReady,
    handleLoadFromSheets, handleExportToSheets, isProcessing
}) => {
    return (
        <>
            <div className="pt-4 border-t border-slate-800">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-between text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors"
                >
                    <span>Advanced Configuration</span>
                    <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={14} />
                </button>
            </div>

            {isOpen && (
                <div className="space-y-6 animate-in slide-in-from-top-2 duration-200">
                    {/* Source Files */}



                </div>
            )}
        </>
    );
};

export default AdvancedConfig;
