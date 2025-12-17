import json

# Read the file
with open(r'src\hooks\useFiltering.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the contextFilteredQuestions useMemo and add a stability check
# We'll add a useRef to track the previous result and only return a new array if contents actually changed

insert_after_line = None
for i, line in enumerate(lines):
    if 'const { creatorName, discipline, difficulty, type, language } = config;' in line:
        insert_after_line = i
        break

if insert_after_line:
    # Add useRef import if not already there
    import_line_idx = None
    for i, line in enumerate(lines):
        if 'import { useState, useEffect, useMemo' in line:
            import_line_idx = i
            lines[i] = line.replace('useMemo', 'useMemo, useRef')
            break
    
    # Add a ref to store previous filtered questions
    lines.insert(insert_after_line + 1, '\n')
    lines.insert(insert_after_line + 2, '  // STABILITY: Track previous contextFilteredQuestions to avoid unnecessary re-renders\n')
    lines.insert(insert_after_line + 3, '  const prevContextFilteredRef = useRef([]);\n')
    lines.insert(insert_after_line + 4, '\n')
    
    with open(r'src\hooks\useFiltering.js', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("✅ Added useRef for stability tracking")
else:
    print("❌ Could not find insertion point")
