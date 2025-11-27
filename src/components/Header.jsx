import React from 'react';
import Icon from './Icon';

const APP_VERSION = "v1.3";

const Header = ({ apiKeyStatus, isCloudReady, onHome, creatorName }) => (
    <header className="bg-slate-950 text-white p-6 shadow-xl border-b border-orange-600 relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={onHome} title="Back to Home">
                <div className="bg-orange-600 p-2 rounded-lg shadow-lg shadow-orange-900/50">
                    <Icon name="terminal" size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight uppercase text-orange-50">
                        UE5 STE Question Generator
                        <span className="text-xs text-slate-400 font-normal ml-3 border border-slate-700 rounded-full px-2 py-0.5 align-top inline-block">{APP_VERSION}</span>
                    </h1>
                    <p className="text-slate-400 text-xs">Universal Scenario-Based Generator • Official Docs Only</p>
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

export default Header;
