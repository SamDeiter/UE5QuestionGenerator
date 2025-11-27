import React from 'react';
import Icon from './Icon';

const LandingPage = ({ onSelectMode, apiKeyStatus, isCloudReady }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-3xl"></div>
        </div>

        <div className="z-10 text-center space-y-8 max-w-2xl animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl mb-4">
                    <Icon name="terminal" size={48} className="text-orange-500" />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                    UE5 STE <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Question Generator</span>
                </h1>
                <p className="text-lg text-slate-400 max-w-lg mx-auto">
                    Create, review, and manage scenario-based technical questions for Unreal Engine 5 documentation.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                <button
                    onClick={() => onSelectMode('create')}
                    className="group relative flex flex-col items-center p-6 bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-xl hover:bg-slate-800/80 transition-all duration-300 w-full sm:w-64 shadow-lg hover:shadow-orange-900/20"
                >
                    <div className="p-3 bg-orange-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <Icon name="plus-circle" size={32} className="text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Creation Mode</h3>
                    <p className="text-xs text-slate-400 text-center">Generate new questions, upload CSVs, and translate content.</p>
                </button>

                <button
                    onClick={() => onSelectMode('review')}
                    className="group relative flex flex-col items-center p-6 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl hover:bg-slate-800/80 transition-all duration-300 w-full sm:w-64 shadow-lg hover:shadow-indigo-900/20"
                >
                    <div className="p-3 bg-indigo-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <Icon name="list-checks" size={32} className="text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Review Mode</h3>
                    <p className="text-xs text-slate-400 text-center">Manage existing database, approve/reject questions, and bulk export.</p>
                </button>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-mono pt-8">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${apiKeyStatus.includes('Loaded') || apiKeyStatus.includes('Auto') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    API Key: {apiKeyStatus}
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isCloudReady ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                    {isCloudReady ? 'Cloud Connected' : 'Local Mode'}
                </div>
            </div>
        </div>
    </div>
);

export default LandingPage;
