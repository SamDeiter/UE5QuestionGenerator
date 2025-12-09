import React, { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';

/**
 * Age Gate - 18+ Verification
 * Required for COPPA/GDPR compliance
 */
const AgeGateModal = ({ isOpen, onConfirm, onExit }) => {
    const [birthYear, setBirthYear] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const year = parseInt(birthYear);
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;

        if (age >= 18) {
            localStorage.setItem('ue5_age_verified', 'true');
            onConfirm();
        } else {
            alert('This tool is restricted to users 18 years and older. You will be redirected.');
            onExit();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border-2 border-orange-500 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-center">
                    <Shield className="w-16 h-16 text-white mx-auto mb-3" />
                    <h2 className="text-2xl font-bold text-white">Age Verification Required</h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-200">
                            <p className="font-semibold mb-1">18+ Only</p>
                            <p>This tool is intended for professional educators and Unreal Engine Authorized Instructors only.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="birthYear" className="block text-sm font-medium text-slate-300 mb-2">
                                What year were you born?
                            </label>
                            <input
                                type="number"
                                id="birthYear"
                                value={birthYear}
                                onChange={(e) => setBirthYear(e.target.value)}
                                min="1900"
                                max={new Date().getFullYear()}
                                required
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white text-lg text-center focus:border-orange-500 focus:outline-none"
                                placeholder="YYYY"
                            />
                        </div>

                        <p className="text-xs text-slate-500 text-center">
                            By continuing, you confirm you are 18+ years of age and accept the Terms of Use.
                        </p>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onExit}
                                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Exit
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AgeGateModal;
