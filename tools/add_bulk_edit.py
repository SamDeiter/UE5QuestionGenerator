# Add bulk edit functionality to App.jsx and QuestionItem.jsx

# ========== Part 1: Update App.jsx ==========
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add selection state after toasts state
old_toast_state = "const [toasts, setToasts] = useState([]);"
new_toast_state = """const [toasts, setToasts] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    
    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);
    
    const selectAll = useCallback(() => {
        setSelectedIds(new Set(uniqueFilteredQuestions.map(q => q.id)));
    }, [uniqueFilteredQuestions]);
    
    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);
    
    const bulkUpdateStatus = useCallback((status, rejectionReason = null) => {
        selectedIds.forEach(id => handleUpdateStatus(id, status, rejectionReason));
        clearSelection();
        showMessage(\`\${status === 'accepted' ? 'Accepted' : 'Rejected'} \${selectedIds.size} questions\`);
    }, [selectedIds, handleUpdateStatus, clearSelection, showMessage]);"""

content = content.replace(old_toast_state, new_toast_state)

# Add props to QuestionItem in list view (search for the Virtuoso QuestionItem)
old_qitem = """<QuestionItem
                                                key={q.uniqueId}
                                                q={q}
                                                onUpdateStatus={handleUpdateStatus}
                                                onExplain={handleExplain}
                                                onVariate={handleVariate}
                                                onCritique={handleCritique}
                                                onTranslateSingle={handleTranslateSingle}
                                                onSwitchLanguage={handleLanguageSwitch}
                                                onDelete={handleDelete}
                                                availableLanguages={translationMap.get(q.uniqueId)}
                                                isProcessing={isProcessing}
                                                appMode={appMode}
                                                showMessage={showMessage}
                                            />"""

new_qitem = """<QuestionItem
                                                key={q.uniqueId}
                                                q={q}
                                                onUpdateStatus={handleUpdateStatus}
                                                onExplain={handleExplain}
                                                onVariate={handleVariate}
                                                onCritique={handleCritique}
                                                onTranslateSingle={handleTranslateSingle}
                                                onSwitchLanguage={handleLanguageSwitch}
                                                onDelete={handleDelete}
                                                availableLanguages={translationMap.get(q.uniqueId)}
                                                isProcessing={isProcessing}
                                                appMode={appMode}
                                                showMessage={showMessage}
                                                isSelected={selectedIds.has(q.id)}
                                                onToggleSelect={() => toggleSelection(q.id)}
                                                showCheckbox={selectedIds.size > 0 || appMode === 'create'}
                                            />"""

content = content.replace(old_qitem, new_qitem)

# Add bulk action bar before Virtuoso
old_virtuoso = """<Virtuoso
                                    style={{ height: '100%' }}
                                    data={uniqueFilteredQuestions}"""

new_virtuoso = """{selectedIds.size > 0 && (
                                    <div className="mb-3 p-3 bg-indigo-900/30 border border-indigo-700/50 rounded-lg flex items-center justify-between animate-in slide-in-from-top duration-200">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-indigo-300">{selectedIds.size} selected</span>
                                            <button onClick={selectAll} className="text-xs text-indigo-400 hover:text-indigo-300 underline">Select All</button>
                                            <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-slate-300 underline">Clear</button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => bulkUpdateStatus('accepted')} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"><Icon name="check" size={14} /> Accept All</button>
                                            <button onClick={() => bulkUpdateStatus('rejected', 'other')} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1"><Icon name="x" size={14} /> Reject All</button>
                                        </div>
                                    </div>
                                )}
                                <Virtuoso
                                    style={{ height: '100%' }}
                                    data={uniqueFilteredQuestions}"""

content = content.replace(old_virtuoso, new_virtuoso)

with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated App.jsx with bulk selection')

# ========== Part 2: Update QuestionItem.jsx ==========
with open('src/components/QuestionItem.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update props to include selection
old_props = "const QuestionItem = ({ q, onUpdateStatus, onExplain, onVariate, onCritique, onRewrite, onTranslateSingle, onSwitchLanguage, onDelete, onUpdateQuestion, onKickBack, availableLanguages, isProcessing, appMode, showMessage }) => {"
new_props = "const QuestionItem = ({ q, onUpdateStatus, onExplain, onVariate, onCritique, onRewrite, onTranslateSingle, onSwitchLanguage, onDelete, onUpdateQuestion, onKickBack, availableLanguages, isProcessing, appMode, showMessage, isSelected, onToggleSelect, showCheckbox }) => {"

content = content.replace(old_props, new_props)

# Add checkbox at start of card - find the outer div with getGradient
old_outer = 'className={`relative rounded-xl border transition-all duration-200 ${getGradient(q.difficulty)} ${getStatusStyle(q.status)}`}'
new_outer = '''className={`relative rounded-xl border transition-all duration-200 ${getGradient(q.difficulty)} ${getStatusStyle(q.status)} ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}'''

content = content.replace(old_outer, new_outer)

# Add checkbox button - find the first div inside the main card (after <div className{p-4)
old_first_row = '''<div className="p-4">
                {/* First Row: Badges, Info and Actions */}
                <div className="flex justify-between items-start gap-4">'''

new_first_row = '''<div className="p-4">
                {/* Checkbox for bulk selection */}
                {(showCheckbox || isSelected) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSelect && onToggleSelect(); }}
                        className={`absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 hover:border-indigo-400'}`}
                    >
                        {isSelected && <Icon name="check" size={12} />}
                    </button>
                )}
                {/* First Row: Badges, Info and Actions */}
                <div className={`flex justify-between items-start gap-4 ${showCheckbox || isSelected ? 'pl-7' : ''}`}>'''

content = content.replace(old_first_row, new_first_row)

with open('src/components/QuestionItem.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated QuestionItem.jsx with checkbox support')
print('Done!')
