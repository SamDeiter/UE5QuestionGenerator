"""
Add collapsible sections to Admin Panel safely.
"""
import re

file_path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\components\AdminPanel.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state and toggle function
state_injection = """  // Super Admin check - only sam.deiter@epicgames.com
  const isSuperAdmin = currentUser?.email === "sam.deiter@epicgames.com";

  // Collapsible sections state
  const [collapsed, setCollapsed] = useState({
    featureAccess: true,
    generateInvite: false,
    registeredUsers: false,
    activeInvites: true,
    apiConfig: true,
    customTags: true,
    trainingData: true,
    envInfo: true,
    databaseMgmt: true,
  });

  const toggleSection = (section) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };"""

content = content.replace(
    '  // Super Admin check - only sam.deiter@epicgames.com\n  const isSuperAdmin = currentUser?.email === "sam.deiter@epicgames.com";',
    state_injection
)

# Helper to wrap section content
def wrap_section(content, section_key, start_marker, end_marker=None):
    # Find the start of the section
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print(f"Warning: Could not find start marker for {section_key}")
        return content
    
    # Find the header end (h2 closing tag)
    h2_end_idx = content.find("</h2>", start_idx) + 5
    
    # Insert toggle button in header
    # We need to find the Icon in the header to insert the chevron before/after it
    # Or simpler: wrap the header content in a button or add a button next to title
    
    # Let's verify what the header looks like
    # <h2 className="...">
    #   <Icon ... />
    #   Title
    # </h2>
    
    header_content = content[start_idx:h2_end_idx]
    
    # Inject onClick to h2 and pointer cursor
    new_header = header_content.replace(
        'className="text-lg font-bold', 
        f'onClick={() => toggleSection("{section_key}")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold'
    )
    
    # Add chevron icon to header
    # Find closing h2 tag
    new_header = new_header.replace(
        '</h2>',
        f'<Icon name={{collapsed.{section_key} ? "chevron-down" : "chevron-up"}} size={{16}} className="ml-auto opacity-50" /></h2>'
    )
    
    content = content.replace(header_content, new_header)
    
    # Now wrap the content body
    # The body starts after h2_end_idx
    # The body ends before the closing </div> of the main section container
    
    # To find the matching closing div, we need to be careful.
    # We know the immediate next tag is usually the content wrapper.
    
    # Heuristic: Find the first div after h2.
    # If the section structure is consistent:
    # <div className="bg-slate-800...">
    #   <h2>...</h2>
    #   <div ...> CONTENT </div>   <-- OR direct content
    # </div>
    
    # Let's look at the file content again.
    # Feature Access: <div className="grid grid-cols-2 gap-4"> ... </div>
    # Create Invite: <div className="grid grid-cols-2 gap-3 mb-4"> ... </div> <button>...</button>
    
    # Since the content varies, it's safer to wrap everything after H2 until the last </div>
    
    # Find the end of the section container
    # We search for the next section start or a comment marking next section
    
    # List of all section comments to identify boundaries
    section_comments = [
        "{/* Feature Access Overview */}",
        "{/* Create Invite Section */}",
        "{/* Registered Users */}",
        "{/* Active Invites */}",
        "{/* API Configuration */}",
        "{/* Custom Tags */}",
        "{/* Training Data Export - Super Admin Only */}",
        "{/* Environment Info */}",
        "{/* Database Management - Super Admin Only */}"
    ]
    
    # Find which comment starts this section
    current_comment_idx = -1
    for i, comment in enumerate(section_comments):
        if comment in content[:start_idx]:
            current_comment_idx = i
            # Using rfind to get the closest one before start_idx is better logic, 
            # but assume we are processing in valid blocks.
    
    # Actually, simpler approach:
    # 1. content[h2_end_idx:] is the candidate body.
    # 2. We need to find the closing div of the parent container.
    #    The parent container starts just before start_marker (usually the commented line is before the div)
    
    # Let's try string replacement of the body start and end.
    
    # We will insert `{!collapsed.key && (` after h2
    # And `)}` before the last `</div>` of the section.
    
    return content

# Refined Replacement Strategy based on specific signatures
params = [
    # Feature Access
    {
        "key": "featureAccess",
        "h2_match": 'Feature Access Overview\n        </h2>',
        "replace_start": 'Feature Access Overview\n          <Icon name={collapsed.featureAccess ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.featureAccess && (',
        "end_content_match": '        </div>\n      </div>\n\n      {/* Create Invite Section */}', # Matches end of feature access
        "replace_end": '        </div>\n        )}\n      </div>\n\n      {/* Create Invite Section */}'
    }, 
     # Feature Access Header Props injection
    {
         "key": "featureAccess_header",
         "target": 'h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2"',
         "replace": 'h2 onClick={() => toggleSection("featureAccess")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-blue-400 mb-4 flex items-center gap-2"'
    }
]

# Wait, regex is safer for H2 injection.
# And doing block replacement for the content wrapping.

# 1. Feature Access
content = content.replace(
    '<h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">\n          <Icon name="eye" size={18} />\n          Feature Access Overview\n        </h2>',
    '<h2 onClick={() => toggleSection("featureAccess")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="eye" size={18} /> Feature Access Overview</div>\n          <Icon name={collapsed.featureAccess ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.featureAccess && ('
)
content = content.replace(
    '          </div>\n        </div>\n      </div>\n\n      {/* Create Invite Section */}',
    '          </div>\n        </div>\n        )}\n      </div>\n\n      {/* Create Invite Section */}'
)

# 2. Generate Invite
content = content.replace(
    '<h2 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">\n          <Icon name="mail" size={18} />\n          Generate Invite Code\n        </h2>',
    '<h2 onClick={() => toggleSection("generateInvite")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="mail" size={18} /> Generate Invite Code</div>\n          <Icon name={collapsed.generateInvite ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.generateInvite && ('
)
# For Generate Invite, it ends with </button> then divider to next section
content = content.replace(
    '        </button>\n      </div>\n\n      {/* Registered Users */}',
    '        </button>\n        )}\n      </div>\n\n      {/* Registered Users */}'
)

# 3. Registered Users
content = content.replace(
    '<h2 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">\n          <Icon name="users" size={18} />\n          Registered Users ({users.length})\n        </h2>',
    '<h2 onClick={() => toggleSection("registeredUsers")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-green-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="users" size={18} /> Registered Users ({users.length})</div>\n          <Icon name={collapsed.registeredUsers ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.registeredUsers && ('
)
content = content.replace(
    '        </div>\n      </div>\n\n      {/* Active Invites */}',
    '        </div>\n        )}\n      </div>\n\n      {/* Active Invites */}'
)

# 4. Active Invites
content = content.replace(
    '<h2 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">\n          <Icon name="key" size={18} />\n          Active Invites ({invites.length})\n        </h2>',
    '<h2 onClick={() => toggleSection("activeInvites")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="key" size={18} /> Active Invites ({invites.length})</div>\n          <Icon name={collapsed.activeInvites ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.activeInvites && ('
)
content = content.replace(
    '        </div>\n      </div>\n\n      {/* API Configuration */}',
    '        </div>\n        )}\n      </div>\n\n      {/* API Configuration */}'
)

# 5. API Configuration
content = content.replace(
    '<h2 className="text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">\n          <Icon name="key" size={18} />\n          API Configuration\n        </h2>',
    '<h2 onClick={() => toggleSection("apiConfig")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-indigo-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="key" size={18} /> API Configuration</div>\n          <Icon name={collapsed.apiConfig ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.apiConfig && ('
)
content = content.replace(
    '        </div>\n      </div>\n\n      {/* Custom Tags */}',
    '        </div>\n        )}\n      </div>\n\n      {/* Custom Tags */}'
)

# 6. Custom Tags
content = content.replace(
    '<h2 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">\n          <Icon name="tag" size={18} />\n          Custom Tags\n        </h2>',
    '<h2 onClick={() => toggleSection("customTags")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="tag" size={18} /> Custom Tags</div>\n          <Icon name={collapsed.customTags ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.customTags && ('
)
# Custom Tags block end 
content = content.replace(
    '        <TagManager\n          discipline={config.discipline}\n          customTags={customTags || {}}\n          onSaveCustomTags={onSaveCustomTags}\n        />\n      </div>\n\n      {/* Training Data Export - Super Admin Only */}',
    '        <TagManager\n          discipline={config.discipline}\n          customTags={customTags || {}}\n          onSaveCustomTags={onSaveCustomTags}\n        />\n        )}\n      </div>\n\n      {/* Training Data Export - Super Admin Only */}'
)

# 7. Training Data (Super Admin)
content = content.replace(
    '<h2 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">\n            <Icon name="database" size={18} />\n            Vertex AI Training Data\n          </h2>',
    '<h2 onClick={() => toggleSection("trainingData")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">\n            <div className="flex items-center gap-2"><Icon name="database" size={18} /> Vertex AI Training Data</div>\n            <Icon name={collapsed.trainingData ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n          </h2>\n          {!collapsed.trainingData && ('
)
content = content.replace(
    '          <p className="text-[10px] text-slate-500 mt-2 text-center">\n            Exports JSONL format for Vertex AI fine-tuning.\n          </p>\n        </div>\n      )}',
    '          <p className="text-[10px] text-slate-500 mt-2 text-center">\n            Exports JSONL format for Vertex AI fine-tuning.\n          </p>\n          )}\n        </div>\n      )}'
)

# 8. Environment Info
content = content.replace(
    '<h2 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">\n          <Icon name="server" size={18} />\n          Environment Info\n        </h2>',
    '<h2 onClick={() => toggleSection("envInfo")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">\n          <div className="flex items-center gap-2"><Icon name="server" size={18} /> Environment Info</div>\n          <Icon name={collapsed.envInfo ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n        </h2>\n        {!collapsed.envInfo && ('
)
content = content.replace(
    '        </div>\n      </div>\n\n      {/* Database Management - Super Admin Only */}',
    '        </div>\n        )}\n      </div>\n\n      {/* Database Management - Super Admin Only */}'
)

# 9. Database Management (Super Admin)
content = content.replace(
    '<h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">\n            <Icon name="database" size={18} />\n            Database Management\n          </h2>',
    '<h2 onClick={() => toggleSection("databaseMgmt")} className="cursor-pointer hover:text-white transition-colors text-lg font-bold text-red-400 mb-3 flex items-center gap-2">\n            <div className="flex items-center gap-2"><Icon name="database" size={18} /> Database Management</div>\n            <Icon name={collapsed.databaseMgmt ? "chevron-down" : "chevron-up"} size={16} className="ml-auto opacity-50" />\n          </h2>\n          {!collapsed.databaseMgmt && ('
)
# The end of file handling is a bit tricky
content = content.replace(
    '          </div>\n        </div>\n      )}\n    </div>\n  );\n};',
    '          </div>\n          )}\n        </div>\n      )}\n    </div>\n  );\n};'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Collapsible sections added successfully!")
