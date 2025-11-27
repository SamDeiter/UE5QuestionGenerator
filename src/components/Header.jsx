import React from 'react';
import Icon from './Icon';

const APP_VERSION = "v1.5";

const Header = ({ apiKeyStatus, isCloudReady, onHome, creatorName, appMode }) => {
    const isReview = appMode === 'review';
    const borderColor = isReview ? 'border-indigo-600' : 'border-orange-600';
    const iconBg = isReview ? 'bg-indigo-600 shadow-indigo-900/50' : 'bg-orange-600 shadow-orange-900/50';
    const titleColor = isReview ? 'text-indigo-50' : 'text-orange-50';
    const headerBg = isReview ? 'bg-slate-950 bg-gradient-to-r from-indigo-950/30 to-slate-950' : 'bg-slate-950';

    return (
        <header className={`${headerBg} text-white p-6 shadow-xl border-b ${borderColor} relative z-20 transition-all duration-500`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={onHome} title="Back to Home">
                    <div className="p-2 transition-colors duration-500">
                        <img src="/UE5QuestionGenerator/logos/UE-Icon-2023-White.svg" alt="UE5 Logo" className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className={`text-xl font-bold tracking-tight uppercase ${titleColor} transition-colors duration-500`}>
                                {isReview ? 'Review & Audit Console' : 'UE5 Question Generator'}
                            </h1>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${isReview ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' : appMode === 'database' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' : 'bg-orange-500/20 text-orange-300 border-orange-500/50'}`}>
                                {isReview ? 'REVIEW MODE' : appMode === 'database' ? 'DATABASE VIEW' : 'CREATE MODE'}
                            </span>
                            <span className="text-xs text-slate-500 font-mono border border-slate-800 rounded px-1.5 py-0.5">{APP_VERSION}</span>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">
                            {isReview ? 'Quality Assurance • Translation • Verification' : 'Universal Scenario-Based Generator • Official Docs Only'}
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4 text-xs font-mono">
                    {creatorName && (
                        <div className="flex items-center gap-1.5 font-bold text-slate-300 px-3 py-1 bg-slate-800/50 rounded-lg">
                            <Icon name="user-check" size={14} className="text-green-500" />
                            <span>{creatorName}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1 rounded border border-slate-700">
                        <span className={`font-bold ${apiKeyStatus.includes('Loaded') || apiKeyStatus.includes('Auto') ? 'text-green-400' : 'text-red-400'}`}>API Key: {apiKeyStatus}</span>
                        {isCloudReady ? (
                            <div className="flex items-center gap-1.5 text-blue-400 font-bold border-l border-slate-700 pl-2 ml-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span>CLOUD LIVE</span>
                            </div>
                        ) : (
                            <span className="text-orange-400 font-bold border-l border-slate-700 pl-2 ml-2">LOCAL MODE</span>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
