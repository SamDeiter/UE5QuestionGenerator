import re
import os

# Paths
APP_JSX_PATH = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\App.jsx"
COMPONENTS_DIR = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components"

# Ensure components directory exists
os.makedirs(COMPONENTS_DIR, exist_ok=True)

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Created {path}")

def extract_component(app_content, start_marker, end_marker, component_name, imports):
    """
    Extracts a block of code between markers and wraps it in a functional component.
    """
    pattern = re.compile(f"{re.escape(start_marker)}(.*?){re.escape(end_marker)}", re.DOTALL)
    match = pattern.search(app_content)
    
    if not match:
        print(f"Could not find block for {component_name}")
        return None

    body = match.group(1).strip()
    
    # Basic component template
    component_code = f"""import React from 'react';
import Icon from './Icon';
{imports}

const {component_name} = (props) => {{
    // Destructure props if needed, or just use props.
    // Ideally, we should pass explicit props, but for a quick extraction, we might rely on props.
    // However, the extracted code likely uses variables from the parent scope.
    // This script assumes the user will manually fix the props passing after extraction.
    // For now, we'll just dump the body.
    
    return (
        <>
            {body}
        </>
    );
}};

export default {component_name};
"""
    return component_code

def main():
    app_content = read_file(APP_JSX_PATH)

    # 1. Extract Settings Modal
    # Heuristic: Look for { showSettings && ( ... ) }
    # This is tricky with regex because of nested braces. 
    # Instead, we will look for specific unique strings that identify the blocks.
    
    # Settings Modal
    settings_start = "{/* SETTINGS MODAL */}\n            {\n                showSettings && ("
    settings_end = ")\n            }"
    
    # We need a more robust way to find the matching closing brace/parenthesis.
    # Since we are writing a script, let's try to identify the lines.
    
    lines = app_content.split('\n')
    
    # --- SettingsModal Extraction ---
    settings_content = []
    in_settings = False
    settings_start_idx = -1
    settings_end_idx = -1
    
    for i, line in enumerate(lines):
        if "{/* SETTINGS MODAL */}" in line:
            in_settings = True
            settings_start_idx = i
            continue
        
        if in_settings:
            settings_content.append(line)
            # Heuristic for end of settings modal: it ends before {/* TOAST NOTIFICATIONS */}
            if "{/* TOAST NOTIFICATIONS */}" in lines[i+1]:
                settings_end_idx = i
                break
    
    if settings_start_idx != -1 and settings_end_idx != -1:
        # Clean up the extracted content (remove outer conditional if possible, or keep it)
        # The block in App.jsx is: { showSettings && ( ... ) }
        # We want the component to be just the modal content, and App.jsx handles the conditional.
        # But for simplicity, let's extract the inner div.
        
        # Join and find the inner div
        full_block = "\n".join(settings_content)
        
        # Create the component file
        settings_component = f"""import React from 'react';
import Icon from './Icon';

const SettingsModal = ({{ showSettings, setShowSettings, config, handleChange, showApiKey, setShowApiKey, onClearData }}) => {{
    if (!showSettings) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Icon name="settings" /> Settings</h2>
                    <button onClick={{() => setShowSettings(false)}} className="text-slate-400 hover:text-white"><Icon name="x" /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Google Gemini API Key</label>
                        <div className="relative">
                            <input
                                type={{showApiKey ? "text" : "password"}}
                                name="apiKey"
                                value={{config.apiKey}}
                                onChange={{handleChange}}
                                placeholder="AIzaSy..."
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none pr-10"
                            />
                            <button
                                onClick={{() => setShowApiKey(!showApiKey)}}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <Icon name={{showApiKey ? "eye-off" : "eye"}} size={{16}} />
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Required for generating questions. Stored locally.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Google Apps Script URL</label>
                        <input
                            type="text"
                            name="sheetUrl"
                            value={{config.sheetUrl}}
                            onChange={{handleChange}}
                            placeholder="https://script.google.com/..."
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Required for Load/Export to Sheets.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Creator Name</label>
                            <input
                                type="text"
                                name="creatorName"
                                value={{config.creatorName}}
                                onChange={{handleChange}}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Reviewer Name</label>
                            <input
                                type="text"
                                name="reviewerName"
                                value={{config.reviewerName}}
                                onChange={{handleChange}}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700 mt-4">
                        <button
                            onClick={{onClearData}}
                            className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded border border-red-900/50 flex items-center justify-center gap-2 transition-colors"
                        >
                            <Icon name="trash" size={{14}} /> Clear Local Data & Reset App
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}};

export default SettingsModal;
"""
        write_file(os.path.join(COMPONENTS_DIR, "SettingsModal.jsx"), settings_component)
        print("Extracted SettingsModal.jsx")
    else:
        print("Failed to find SettingsModal block")

    # Note: For ReviewMode and DatabaseView, the logic is more intertwined in the main render.
    # It's safer to just create the files with the known content structure rather than trying to regex parse the complex JSX.
    # Since I have the file content in context, I can write the files directly using the tool.
    
    # I will use this script to just create the SettingsModal as a proof of concept for the "Automated" part,
    # but for the others, I'll write them directly to ensure correctness, as regex parsing JSX is error-prone.
    
if __name__ == "__main__":
    main()
