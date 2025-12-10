import { useState } from 'react';
import Icon from './Icon';

const ApiKeyModal = ({ isOpen, onClose, onSave, currentKey = '' }) => {
    const [apiKey, setApiKey] = useState(currentKey);

    if (!isOpen) return null;

    const handleSave = () => {
        if (apiKey.trim()) {
            onSave(apiKey.trim());
            onClose();
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            <div className="relative bg-slate-900 rounded-xl max-w-md w-full shadow-2xl border border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-900/30 rounded-lg">
                            <Icon name="key" size={24} className="text-orange-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Configure API Key</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
                        aria-label="Close modal"
                    >
                        <Icon name="x" size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-300">
                        Enter your Google Gemini API key to enable question generation.
                    </p>

                    <div>
                        <label htmlFor="api-key-input" className="block text-sm font-medium text-slate-300 mb-2">
                            API Key
                        </label>
                        <input
                            id="api-key-input"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your Gemini API key..."
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                    </div>

                    <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                        <p className="text-xs text-blue-300 flex items-start gap-2">
                            <Icon name="info" size={14} className="mt-0.5 flex-shrink-0" />
                            <span>
                                Don't have an API key? Get one free at{' '}
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:text-blue-200"
                                >
                                    Google AI Studio
                                </a>
                            </span>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!apiKey.trim()}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                    >
                        Save API Key
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
