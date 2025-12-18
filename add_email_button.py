"""
Add Send Email Invites button to AdminPanel.jsx
"""

def add_email_button():
    admin_panel_path = r"C:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx"
    
    # Read current file
    with open(admin_panel_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the line "      </div>" after the Active Invites section (around line 650-651)
    # We need to find the specific closing div for Active Invites
    insert_index = None
    for i, line in enumerate(lines):
        if i > 600 and i < 660:  # Search in the expected range
            # Look for the pattern: closing div after invites.map section
            if "        )}" in line and i > 645:
                # Check if next line has closing div for the section
                if i + 1 < len(lines) and "      </div>" in lines[i + 1]:
                    insert_index = i + 1
                    break
    
    if not insert_index:
        print("❌ Could not find insertion point")
        return
    
    # Button HTML to insert
    button_code = [
        "        }\n",
        "        \n",
        "        {/* Send Email Invites Button */}\n",
        "        {!collapsed.activeInvites && invites.some((inv) => inv.role === \"reviewer\") && (\n",
        "          <div className=\"mt-3 pt-3 border-t border-yellow-500/20\">\n",
        "            <button\n",
        "              onClick={handleSendEmailInvites}\n",
        "              className=\"w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-lg\"\n",
        "            >\n",
        "              <Icon name=\"mail\" size={18} />\n",
        "              Send Reviewer Invite Emails\n",
        "            </button>\n",
        "            <p className=\"text-xs text-slate-500 mt-2 text-center\">\n",
        "              Sends personalized emails via SendGrid to all pending reviewer invites\n",
        "            </p>\n",
        "          </div>\n",
        "        )}\n",
        "      </div>\n",
    ]
    
    # Replace the closing div with our new code
    new_lines = lines[:insert_index] + button_code + lines[insert_index+1:]
    
    # Write back
    with open(admin_panel_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"✅ Successfully added Send Email Invites button")
    print(f"   Inserted at line {insert_index + 1}")
    print(f"   Total lines: {len(new_lines)}")

if __name__ == "__main__":
    add_email_button()
