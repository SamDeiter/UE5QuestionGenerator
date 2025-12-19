# Add inline question editing to QuestionItem.jsx

with open('src/components/QuestionItem.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add editing state after existing useState declarations
old_state = """const QuestionItem = ({ q, onUpdateStatus, onExplain, onVariate, onCritique, onRewrite, onTranslateSingle, onSwitchLanguage, onDelete, onUpdateQuestion, onKickBack, availableLanguages, isProcessing, appMode, showMessage, isSelected, onToggleSelect, showCheckbox }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [rejectMenuOpen, setRejectMenuOpen] = useState(false);"""

new_state = """const QuestionItem = ({ q, onUpdateStatus, onExplain, onVariate, onCritique, onRewrite, onTranslateSingle, onSwitchLanguage, onDelete, onUpdateQuestion, onKickBack, availableLanguages, isProcessing, appMode, showMessage, isSelected, onToggleSelect, showCheckbox }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [rejectMenuOpen, setRejectMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(q.question);"""

content = content.replace(old_state, new_state)

# 2. Replace the question display with editable version
old_display = """<div className="mb-4">
                <h3 className={`text-base font-medium leading-relaxed ${q.status === 'rejected' ? 'text-slate-600 line-through decoration-slate-700' : 'text-slate-200'}`} dangerouslySetInnerHTML={{ __html: sanitizeText(q.question) }} />"""

new_display = """<div className="mb-4">
                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full bg-slate-800 border border-indigo-500 rounded-lg p-3 text-slate-200 text-base resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => { setIsEditing(false); setEditedText(q.question); }} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg">Cancel</button>
                            <button onClick={() => { if (onUpdateQuestion) { onUpdateQuestion(q.id, { question: editedText }); } setIsEditing(false); if (showMessage) showMessage('Question updated'); }} className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Save</button>
                        </div>
                    </div>
                ) : (
                    <h3 
                        className={`text-base font-medium leading-relaxed cursor-pointer hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors ${q.status === 'rejected' ? 'text-slate-600 line-through decoration-slate-700' : 'text-slate-200'}`} 
                        dangerouslySetInnerHTML={{ __html: sanitizeText(q.question) }} 
                        onClick={() => appMode !== 'database' && setIsEditing(true)}
                        title={appMode !== 'database' ? 'Click to edit' : ''}
                    />
                )}"""

content = content.replace(old_display, new_display)

with open('src/components/QuestionItem.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Added inline editing to QuestionItem.jsx')
