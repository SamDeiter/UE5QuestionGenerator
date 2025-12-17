"""
Resolve merge conflict in AdminPanel.jsx
"""

def resolve_conflict():
    file_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove conflict markers and keep the remote version (after =======)
    lines = content.split('\n')
    resolved_lines = []
    skip_mode = None
    
    for line in lines:
        if line.startswith('<<<<<<< HEAD'):
            skip_mode = 'local'
            continue
        elif line.startswith('======='):
            skip_mode = 'remote'
            continue
        elif line.startswith('>>>>>>> '):
            skip_mode = None
            continue
        
        # Skip local version, keep remote version
        if skip_mode == 'local':
            continue
        
        resolved_lines.append(line)
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(resolved_lines))
    
    print(f"✅ Resolved conflict in AdminPanel.jsx")

if __name__ == "__main__":
    resolve_conflict()
