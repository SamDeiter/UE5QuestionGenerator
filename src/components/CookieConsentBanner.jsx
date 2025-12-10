import { useState, useEffect } from 'react';
/**
 * Cookie Consent Banner - GDPR Compliance
 * Shows for EU users, allows accept/decline of analytics cookies
 */
const CookieConsentBanner = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already consented
        const consent = localStorage.getItem('ue5_cookie_consent');
        if (!consent) {
            // Delay showing banner by 2 seconds for better UX
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('ue5_cookie_consent', 'accepted');
        localStorage.setItem('ue5_analytics_enabled', 'true');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('ue5_cookie_consent', 'declined');
        localStorage.setItem('ue5_analytics_enabled', 'false');
        setIsVisible(false);
    };

    const handleSettingsOnly = () => {
        // Accept essential only, decline analytics
        localStorage.setItem('ue5_cookie_consent', 'essential_only');
        localStorage.setItem('ue5_analytics_enabled', 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
            <div className="max-w-6xl mx-auto bg-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl overflow-hidden">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Cookie className="w-8 h-8 text-blue-400" />
                            <div>
                                <h3 className="text-lg font-bold text-white">Cookie & Privacy Notice</h3>
                                <p className="text-xs text-slate-400">We value your privacy</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSettingsOnly}
                            className="text-slate-400 hover:text-white transition-colors"
                            aria-label="Close and use essential cookies only"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="text-sm text-slate-300 space-y-3 mb-6">
                        <p>
                            This tool uses <strong>cookies and localStorage</strong> to provide functionality and improve your experience.
                        </p>

                        <div className="grid md:grid-cols-2 gap-4 text-xs">
                            <div className="bg-slate-800 p-3 rounded-lg">
                                <h4 className="font-semibold text-green-400 mb-2">✅ Essential Cookies (Required)</h4>
                                <ul className="space-y-1 text-slate-400">
                                    <li>• Firebase Authentication (login)</li>
                                    <li>• LocalStorage (AES encrypted, stores questions)</li>
                                    <li>• Session management</li>
                                </ul>
                            </div>

                            <div className="bg-slate-800 p-3 rounded-lg">
                                <h4 className="font-semibold text-blue-400 mb-2">📊 Analytics Cookies (Optional)</h4>
                                <ul className="space-y-1 text-slate-400">
                                    <li>• Google Analytics (usage statistics)</li>
                                    <li>• Performance monitoring</li>
                                    <li>• No personal data sold or shared</li>
                                </ul>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500">
                            <strong>GDPR Rights:</strong> You can change your preferences anytime in Settings.
                            Data is stored in Google Firebase (USA). See <a href="https://github.com/SamDeiter/UE5QuestionGenerator/blob/main/LICENSES.md" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">LICENSES.md</a> for full privacy details.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 justify-end">
                        <button
                            onClick={handleDecline}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                        >
                            Decline All
                        </button>
                        <button
                            onClick={handleSettingsOnly}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                        >
                            Essential Only
                        </button>
                        <button
                            onClick={handleAccept}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg"
                        >
                            Accept All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookieConsentBanner;
