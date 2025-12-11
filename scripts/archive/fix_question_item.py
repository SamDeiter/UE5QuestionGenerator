import re

# Read the file
with open('src/components/QuestionItem.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add appMode prop
content = content.replace(
    'const QuestionItem = ({ q, onUpdateStatus, onExplain, onVariate, onCritique, onTranslateSingle, onSwitchLanguage, onDelete, availableLanguages, isProcessing }) => {',
    'const QuestionItem = ({ q, onUpdateStatus, onExplain, onVariate, onCritique, onTranslateSingle, onSwitchLanguage, onDelete, availableLanguages, isProcessing, appMode }) => {'
)

# Fix 2: Add lightning icon to difficulty badge  
old_badge = '<span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${getDiffBadgeColor(q.difficulty)}`}>{q.difficulty}</span>'
new_badge = '''<span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${getDiffBadgeColor(q.difficulty)} flex items-center gap-1`}>
                                <Icon name="zap" size={12} />
                                {q.difficulty}
                            </span>'''
content = content.replace(old_badge, new_badge)

# Fix 3: Wrap action buttons in conditional
old_buttons = '''<button onClick={() => onVariate(q)} className="p-2 hover:text-indigo-400 text-slate-500" title="Remix/Variate"><Icon name="shuffle" size={18} /></button>
                            <div className="w-px h-6 bg-slate-700 mx-1"></div>'''

new_buttons = '''<button onClick={() => onVariate(q)} className="p-2 hover:text-indigo-400 text-slate-500" title="Remix/Variate"><Icon name="shuffle" size={18} /></button>
                            {appMode !== 'creation' && (
                                <>
                                    <div className="w-px h-6 bg-slate-700 mx-1"></div>'''

content = content.replace(old_buttons, new_buttons)

# Close the conditional before the closing div
old_close = '''                            )}
                        </div>
                    </div>'''

new_close = '''                            )}
                                </>
                            )}
                        </div>
                    </div>'''

content = content.replace(old_close, new_close)

# Write back
with open('src/components/QuestionItem.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully updated QuestionItem.jsx')
