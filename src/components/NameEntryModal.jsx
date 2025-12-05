import React, { useState, useEffect } from 'react';
import Icon from './Icon';

const NameEntryModal = ({ onSave }) => {
    const [name, setName] = useState('');
    const [sillyPlaceholder, setSillyPlaceholder] = useState('');

    useEffect(() => {
        const sillyNames = ["Captain Blueprint", "Sir Render-Lot", "Polygon Prince", "Texture Titan"];
        setSillyPlaceholder(`e.g. ${sillyNames[Math.floor(Math.random() * sillyNames.length)]}`);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) onSave(name);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="bg-orange-600 p-3 rounded-full mb-4 shadow-lg shadow-orange-900/50">
                        <Icon name="user" size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome, Creator / Reviewer</h2>
                    <p className="text-slate-400 text-sm">Please enter your name to identify your contributions.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1 text-left">
                        <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Your Full Name (For Creating & Reviewing)</label>
                        <input type="text" name="creatorName" value={name} onChange={(e) => setName(e.target.value)} placeholder={sillyPlaceholder} className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-white placeholder-slate-600 transition-all" autoFocus />
                    </div>
                    <button type="submit" disabled={!name.trim()} className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg active:scale-[0.98]">
                        Set Identity & Start
                    </button>
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => onSave("N/A")}
                            className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
                        >
                            Skip / Use "N/A"
                        </button>
                    </div>                </form>
            </div>
        </div>
    );
};

export default NameEntryModal;
