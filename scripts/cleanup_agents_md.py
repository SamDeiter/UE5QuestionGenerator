"""
Remove JavaSec-Guardian section from AGENTS.md and replace with reference.
"""

def update_agents_md():
    file_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\AGENTS.md"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the start of "## Agent Personas" section
    start_idx = None
    for i, line in enumerate(lines):
        if line.strip() == "## Agent Personas":
            start_idx = i
            break
    
    if start_idx is None:
        print("Could not find '## Agent Personas' section")
        return
    
    # Keep everything before "## Agent Personas" and add the new content
    new_lines = lines[:start_idx]
    new_lines.append("## Agent Personas\n")
    new_lines.append("\n")
    new_lines.append("Agent persona definitions are located in the `.agent/` directory:\n")
    new_lines.append("\n")
    new_lines.append("- `JavaSec-Guardian.md` - Java & Web Application Security Expert\n")
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print("✅ Updated AGENTS.md - replaced JavaSec-Guardian section with reference")

if __name__ == "__main__":
    update_agents_md()
