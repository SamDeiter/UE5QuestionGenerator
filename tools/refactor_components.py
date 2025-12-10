"""
Refactor App.jsx to use the new extracted components.

This script:
1. Adds imports for EmptyState, ReviewModeBanner, ToastContainer
2. Removes the inline JSX and replaces with component usage
3. Removes the unused Toast import
"""

def refactor_app_jsx():
    """Refactor App.jsx to use extracted components."""
    
    with open('src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace Toast import with new component imports
    old_import = "import Toast from './components/Toast';"
    new_import = """import ToastContainer from './components/ToastContainer';
import EmptyState from './components/EmptyState';
import ReviewModeBanner from './components/ReviewModeBanner';"""
    content = content.replace(old_import, new_import)
    
    # 2. Replace inline empty state with component
    old_empty_state = """{!showHistory && uniqueFilteredQuestions.length === 0 && questions.length === 0 && !status && appMode === 'create' && (<div className="flex flex-col items-center justify-center h-full text-slate-600"><Icon name="terminal" size={48} className="mb-4 text-slate-800" /><p className="font-medium text-slate-500">Ready. Click 'GENERATE QUESTIONS' to begin or upload a source file.</p></div>)}"""
    new_empty_state = """{!showHistory && uniqueFilteredQuestions.length === 0 && questions.length === 0 && !status && appMode === 'create' && <EmptyState />}"""
    content = content.replace(old_empty_state, new_empty_state)
    
    # 3. Replace inline banner with component
    old_banner = """                        {/* CREATE MODE: Call-to-Action Banner */}
                        {appMode === 'create' && questions.length > 0 && (
                            <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-700/50 rounded-lg p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Icon name="info" size={20} className="text-indigo-400" />
                                        <div>
                                            <h3 className="text-sm font-bold text-indigo-300">Questions Generated!</h3>
                                            <p className="text-xs text-slate-400">Switch to Review Mode to accept or reject questions.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleModeSelect('review')}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/50"
                                    >
                                        Go to Review <Icon name="arrow-right" size={16} />
                                    </button>
                                </div>
                            </div>
                        )}"""
    new_banner = """                        {/* CREATE MODE: Call-to-Action Banner */}
                        {appMode === 'create' && questions.length > 0 && (
                            <ReviewModeBanner onNavigateToReview={() => handleModeSelect('review')} />
                        )}"""
    content = content.replace(old_banner, new_banner)
    
    # 4. Replace inline toast container with component
    old_toast = """            {/* TOAST NOTIFICATIONS */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast {...toast} onClose={() => removeToast(toast.id)} />
                    </div>
                ))}
            </div>"""
    new_toast = """            {/* TOAST NOTIFICATIONS */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />"""
    content = content.replace(old_toast, new_toast)
    
    with open('src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Refactored App.jsx to use extracted components")
    print("   - Added imports for EmptyState, ReviewModeBanner, ToastContainer")
    print("   - Replaced inline empty state JSX")
    print("   - Replaced inline banner JSX")
    print("   - Replaced inline toast container JSX")

if __name__ == '__main__':
    refactor_app_jsx()
